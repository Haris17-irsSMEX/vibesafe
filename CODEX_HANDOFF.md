# VibeSafe: Codex Handoff Document

## 1. Product Summary
- **What the app does:** VibeSafe is an AI security and codebase audit SaaS for GitHub repositories. It connects to GitHub, scans repositories, and provides a security score, detailed file/line security findings, a Security Officer Report, and AI fix prompts tailored for Cursor/Codex.
- **Target users:** Developers and teams needing automated security audits, initially targeting "vibe coders" but expanding to general production-readiness scanning.
- **Core workflow:** Connect GitHub → Pick a repository → AI fetches files → DeepSeek model runs the security audit → Generates score, findings, and fix prompts → User views dashboard and copies fix prompts to fix issues.
- **Current product positioning:** AI Security Officer for GitHub repos.
- **Current planned direction:** Broader "AI Security Officer / production readiness scanner" rather than just "vibe coders" security. Move towards a premium, command-center feel.

## 2. Tech Stack
- **Framework:** Next.js 14.2.15 (App Router)
- **Frontend Stack:** React 18, Tailwind CSS 3.4.1, `clsx`, `tailwind-merge`, `lucide-react`
- **Backend/API Structure:** Next.js Route Handlers (`app/api/*`) and Server Actions
- **Database/Auth Provider:** Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- **AI Model/Provider:** DeepSeek (via OpenAI SDK `openai` v6.41.0, targeting `https://api.deepseek.com`, model `deepseek-chat`)
- **Billing Provider:** Paddle
- **Email Provider:** Resend
- **Rate Limiting Provider:** Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`)
- **Deployment Platform:** Vercel (assumed based on standard Next.js deployments, though `NEXT_PUBLIC_APP_URL` handles local vs prod)

## 3. Current Feature Completion Status
- **Supabase authentication:** Complete
- **GitHub OAuth repo connection:** Complete
- **Repository listing:** Complete
- **File fetching:** Complete
- **Scan creation:** Complete
- **AI scan execution:** Complete
- **DeepSeek scanner:** Complete (Implemented in `DeepSeekScanner.ts`)
- **Security audit prompt:** Complete (Strict JSON output, 2-pass system)
- **Findings persistence:** Complete
- **Security score calculation:** Complete
- **Results page:** Complete (Needs visual redesign)
- **Finding detail page:** Complete (Needs visual redesign)
- **AI fix prompt generation:** Complete
- **Security Officer Report:** Complete
- **Dashboard analytics:** Complete
- **Settings/billing page:** Complete
- **Admin panel:** Complete
- **Paddle checkout:** Complete
- **Plan limits/gating:** Complete
- **Resend emails:** Complete
- **Upstash rate limiting:** Complete
- **Public landing pages/legal pages:** Complete (Need redesign)

## 4. App Routes
- **Public pages:**
  - `/` (app/page.tsx): Landing page
  - `/pricing` (app/pricing/*): Pricing page
  - `/privacy` (app/privacy/page.tsx): Privacy policy
  - `/terms` (app/terms/*): Terms of service
  - `/refund` (app/refund/*): Refund policy
  - `/contact` (app/contact/*): Contact page
- **Auth pages:**
  - `/login` (app/login/*): Login page
  - `/auth` (app/auth/*): Auth callback/flow
- **Dashboard pages:**
  - `/dashboard` (app/dashboard/*): Main dashboard for user to see connected repos and past scans.
- **Scan pages:**
  - `/scan` (app/scan/*): Page for creating/running a scan on a repo.
- **Result pages:**
  - `/results` (app/results/*): List of results/finding details.
- **Settings pages:**
  - `/settings` (app/settings/*): User settings, plan status, billing portal link.
- **Checkout pages:**
  - `/checkout` (app/checkout/*): Paddle checkout handling.
- **Admin pages:**
  - `/admin` (app/admin/*): Admin dashboard.

## 5. API Routes
- **`app/api/auth/github/route.ts` & `app/api/auth/github/callback/route.ts` & `app/api/auth/github/disconnect/route.ts`**
  - **Purpose:** Handles GitHub OAuth connection, token exchange, and disconnection.
  - **Main tables:** `connected_repos` (or equivalent token storage), `users`.
- **`app/api/scans/create/route.ts`**
  - **Purpose:** Initiates a new scan record.
  - **Main tables:** `scans`
- **`app/api/scans/fetch-files/route.ts`**
  - **Purpose:** Fetches repository files from GitHub.
  - **Main tables:** `scans`, `scan_files`
- **`app/api/scans/run-ai/route.ts`**
  - **Purpose:** Runs the DeepSeek scanner on the fetched files.
  - **Main tables:** `scans`, `scan_results`
  - **External services:** DeepSeek API
- **`app/api/scans/reset/route.ts`**
  - **Purpose:** Resets scan state (likely used for retries/debugging).
- **`app/api/paddle/webhook/route.ts`**
  - **Purpose:** Handles Paddle webhooks to update user subscription status.
  - **Security:** Verifies HMAC-SHA256 signature using `PADDLE_WEBHOOK_SECRET`.
  - **Main tables:** `users`
- **`app/api/paddle/portal/route.ts`**
  - **Purpose:** Creates a billing portal session for users.
  - **Security:** Requires auth, uses `PADDLE_API_KEY` and `paddle_customer_id`.
- **`app/api/billing/checkout/route.ts`**
  - **Purpose:** Creates checkout sessions.
- **`app/api/admin/*`** (Various routes like backfill-scores, check, backfill-fix-prompts, update-plan)
  - **Purpose:** Admin operations to fix data or manage users.
  - **Security:** Requires strict admin auth.

## 6. Database Schema Usage
*Note: Uses Supabase PostgreSQL.*

- **`scans`**
  - **Columns:** `id`, `user_id`, `repo_full_name`, `repo_name`, `repo_url`, `default_branch`, `status` (pending, scanning, completed, failed), `started_at`, `completed_at`, `security_score`, `critical_count`, `high_count`, `medium_count`, `low_count`, `total_findings`, `created_at`. Additional columns added later: `error_stage`, `scan_engine`.
  - **Purpose:** Tracks the lifecycle of a scan.
- **`scan_files`**
  - **Purpose:** Stores the files fetched for a specific scan.
- **`scan_results`**
  - **Columns:** Findings, severity, code snippet, fix prompt, checklist, report. (Added via `004`, `018`, `020`).
  - **Purpose:** Stores the JSON output of the DeepSeek scan.
- **`users`**
  - **Columns:** User info, plan status (starter, builder), paddle_customer_id.
- **`connected_repos`**
  - **Purpose:** Stores GitHub connection tokens for users.

*Risk:* Mismatches between TS types and DB columns (e.g. `error_stage`, `scan_engine`) caused issues in the past. Always ensure Supabase types are aligned with the DB schema.

## 7. AI Scanner Architecture
1. **Routing:** `FileRouter.ts` organizes fetched files into sections.
2. **Prompting:** `SecurityAuditPrompt.ts` generates a comprehensive prompt including file contents, strict audit rules, and expected JSON output schema.
3. **Execution:** `DeepSeekScanner.ts` uses the OpenAI SDK configured for `https://api.deepseek.com`. It calls the `deepseek-chat` model with temperature 0.1 and strict JSON object response format. It handles 1 retry natively on failures (timeout/API error) with a 5-second delay.
4. **Parsing:** `FindingParser.ts` parses the JSON, validating fields.
5. **Report & Fix Prompts:** `SecurityReportGenerator.ts`, `FixPromptGenerator.ts`, and `SecurityReportFormatter.ts` format the results, extract findings, and generate a final Security Officer Report and copy-paste prompts.
6. **Error Handling:** Returns structured error objects. There were past issues with DeepSeek JSON parse failures and scan state getting stuck, hence `error_stage` and deterministic fallbacks.

## 8. Security Audit Prompt Status
- **Location:** `services/scanner/prompts/SecurityAuditPrompt.ts`
- **Line Number:** Yes, it asks for `line_number`.
- **Vulnerable Code:** Yes, it asks for `vulnerable_code` (and `evidence_snippet`).
- **Fix Prompt:** Yes, it asks for `fix_prompt` directly from the AI.
- **Checklist/Report:** Yes, asks for `checklist` and `report` (which includes `security_posture`).
- **Validation:** JSON is strictly parsed downstream. The prompt strongly emphasizes outputting ONLY JSON with no markdown wrapping or conversational text.
- **Weak points:** If the model hallucinates files or line numbers, the parser might accept them but they will fail to map to the UI correctly. DeepSeek occasionally returns invalid JSON or times out.

## 9. UI/UX Current State
- **Current Layouts:** Landing page, Pricing, Dashboard, Connect Repo, Scan Status, Results List, Results Detail, Finding Detail, Settings, Admin Panel are all built.
- **Known UI Issues:**
  - Inconsistent dark/light mode on the results page.
  - Invalid Date issues.
  - Overuse of purple (needs a charcoal/off-black redesign).
  - Plan label inconsistency.
  - Settings layout has blank space.
  - Lacks a premium, Cursor-style storytelling experience.

## 10. Environment Variables
*(Names only, NO VALUES)*
- **App URL:** `NEXT_PUBLIC_APP_URL`
- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **GitHub OAuth:** `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `ENCRYPTION_KEY`
- **DeepSeek:** `DEEPSEEK_API_KEY`
- **Resend:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- **Paddle:** `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_STARTER_PRICE_ID`, `PADDLE_BUILDER_PRICE_ID`
- **Upstash:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## 11. Deployment Notes
- **Production domain:** Likely Vercel-hosted. App URL is defined by `NEXT_PUBLIC_APP_URL`.
- **Build commands:** `npm run build`
- **Typecheck commands:** (Usually `npx tsc --noEmit` if standard).
- **Webhooks:** Paddle webhooks map to `/api/paddle/webhook`.

## 12. Known Past Issues / Fixes
- DeepSeek JSON parse failures (caused broken scan states).
- Failed to save scan findings due to missing DB columns or required fields mismatch (`error_stage`, `scan_engine`).
- 100 score issue (score calculation bug).
- Admin email environment issues.
- Paddle checkout/domain routing issues.
- Free scan limit/admin bypass logic issues.

## 13. Current Risk Areas
- **AI JSON Parsing:** The system relies heavily on DeepSeek outputting exact JSON matching the schema. Any redesign MUST NOT alter the prompt structure unless coordinated with the parser.
- **Auth Boundaries & Admin Access:** Do not accidentally remove RLS or admin verification checks during UI refactoring.
- **Database Schema Sync:** Do not try to write to columns that were removed or haven't been added. Use the existing API routes which are already stable.
- **Secret Handling:** Do not expose `SUPABASE_SERVICE_ROLE_KEY` to the client ever.

## 14. Recommended Next Phase
The next major task is a **full UI/UX redesign**. Do NOT rewrite backend logic.
**Design Direction:**
- Cursor-style product storytelling.
- EOVOLT-style charcoal/off-black visual direction.
- Matte dark background with white typography (less purple).
- Premium security command-center feel.
- Include product demo sections on the landing page showing:
  1. Connect GitHub
  2. Scan repo
  3. Security Officer Report
  4. Exact vulnerable line
  5. Copy fix prompt for Cursor/Codex
  6. Rescan and improve score

## 15. Files Codex Should Read First
1. `app/page.tsx` (Landing page to redesign)
2. `app/globals.css` & `tailwind.config.ts` (For theme/colors)
3. `app/dashboard/page.tsx`
4. `app/scan/page.tsx`
5. `app/results/[id]/page.tsx`
6. `components/results/*` (Severity badges, finding details)
7. `services/scanner/prompts/SecurityAuditPrompt.ts` (Understand AI constraints)
8. `migrations/001_create_scans_table.sql` (Understand core data)
9. `app/api/paddle/webhook/route.ts` (Understand billing)
10. `app/api/scans/run-ai/route.ts` (Understand scan lifecycle)

## 16. Safe Instructions For Codex
**ATTENTION CODEX:**
- **DO NOT** rewrite backend logic during this UI redesign.
- **PRESERVE** all existing auth, billing, admin, scan, and database logic.
- **ONLY** refactor UI components to match the new visual direction (charcoal, matte dark, white text, premium feel).
- **KEEP** all existing routes working.
- **KEEP** all API contracts stable.
- **RUN** typecheck (`npx tsc --noEmit`) and build (`npm run build`) after changes to ensure no types were broken.
- **NEVER** expose environment secrets to the client.
- **DO NOT** remove admin or security scan functionality.
