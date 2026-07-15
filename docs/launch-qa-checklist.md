# CtrlCode Launch QA Checklist

Use this checklist before a production launch or after changes to scanning,
billing, System Testing, auth, or results display. Do not use real customer
repositories, payment cards, or destructive workflow actions during QA.

## Auth

- Visit `/login` and confirm Supabase login starts normally.
- Visit `/dashboard`, `/dashboard/connect`, `/results`, `/settings`,
  `/system-testing`, and `/admin` while signed out.
- Confirm protected user pages redirect to `/login`.
- Confirm `/admin` is blocked for non-admin users.
- Confirm `ADMIN_EMAILS` users see Admin Panel navigation.
- Confirm Sign out returns the user to `/login`.

## GitHub Scan

- Connect GitHub from `/dashboard/connect`.
- Confirm OAuth callback returns to the app and repositories load.
- Start a scan from a repository card.
- Confirm plan gating happens before a scan is created when daily scan usage is exhausted.
- Confirm scan status page shows file fetching, AI analysis, completed, failed,
  and partial states without contradictory success/error banners.
- Confirm retry/reset states do not expose secrets or raw stack traces.
- Confirm old scans still open from `/results`.

## Results And Findings

- Open `/results` and a completed `/results/[scanId]`.
- Confirm severity counts, score, repository name, and safe dates render.
- Confirm findings show severity, confidence, status, evidence, affected file,
  recommendation, and fix prompt when available.
- Confirm potential and needs-manual-verification findings are not presented as confirmed.
- Confirm locked/free views do not include premium evidence or fix prompts in the DOM.

## Security Officer Report

- Confirm core scan completion does not generate the full Security Officer Report.
- On a completed scan, click Generate Security Officer Report.
- Confirm generation uses saved findings only and does not create new findings.
- Confirm existing reports display after refresh.
- Confirm failed report generation shows a safe retry state.
- Confirm partial scan warnings are visible in generated or fallback reports.

## System Testing

- Visit `/system-testing`.
- Run Quick Site Check against a safe public URL.
- Confirm plan gating happens before the browser starts when daily usage is exhausted.
- Confirm Free users cannot run Guided Workflow Testing.
- Confirm Starter and Builder users can run Guided Workflow Testing.
- Confirm Advanced JSON workflow is collapsed by default.
- Confirm unsafe steps such as checkout, pay, delete, logout, reset, and form
  submission are skipped safely.
- Confirm `/system-testing/[runId]` shows a plain-English summary, compact workflow
  status badges, prioritized next steps, and raw evidence only under details.
- Confirm cancelled requests, Next.js RSC noise, static chunk aborts, and duplicate
  console stack traces are not saved as actionable findings.

## Billing And Paddle

- Confirm `/pricing` shows Free `$0 USD/month`, Starter `$29 USD/month`, and
  Builder `$79 USD/month`.
- Confirm pricing and checkout pages include the tax/subscription compliance note.
- Confirm `/checkout?plan=starter` shows Starter `$29 USD/month`.
- Confirm `/checkout?plan=builder` shows Builder `$79 USD/month`.
- Confirm checkout uses Paddle price IDs from `PADDLE_STARTER_PRICE_ID` and
  `PADDLE_BUILDER_PRICE_ID`.
- Confirm `/pay?_ptxn=...` opens Paddle Checkout when Paddle is configured.
- Confirm `/settings` never shows upgraded success unless the stored user plan is paid.
- Confirm Paddle webhook updates plans only after verified Paddle events.

## Plan Limits

- Free: 2 AI Security Scans/day and 1 System Test/day.
- Starter: 20 AI Security Scans/day and 10 System Tests/day.
- Builder: 100 AI Security Scans/day and 50 System Tests/day.
- Legacy Pro: treated as paid Builder-equivalent access.
- Admin: usage limits bypassed through server-side `ADMIN_EMAILS` checks.
- Confirm scan usage counts `scans.created_at` within the current UTC day.
- Confirm system test usage counts `system_test_runs.created_at` within the current UTC day.
- Confirm Upstash rate limiting remains separate from product entitlement limits.

## Admin

- Confirm `/admin` loads for configured admins only.
- Confirm user plan override accepts only allowed plan values.
- Confirm operational buttons keep confirmation/loading/error states.
- Confirm admin tables safely truncate long emails, paths, and errors.
- Confirm admin debug surfaces never expose secrets, tokens, private source code,
  or Paddle/GitHub/Supabase secret values.

## Production Environment

Required:

- `NEXT_PUBLIC_APP_URL`
- `APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_TOKEN_ENCRYPTION_KEY`
- `DEEPSEEK_API_KEY`
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`
- `PADDLE_STARTER_PRICE_ID`
- `PADDLE_BUILDER_PRICE_ID`
- `PADDLE_ENVIRONMENT`

Optional or environment-specific:

- `DEEPSEEK_MODEL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SYSTEM_TEST_RUNNER_MODE`
- `SYSTEM_TEST_RATE_LIMIT_PER_HOUR`
- `SYSTEM_TEST_ADMIN_RATE_LIMIT_PER_HOUR`
- `SYSTEM_TEST_DEV_RATE_LIMIT_PER_HOUR`
- `AI_MAX_CONCURRENT_ZONE_SCANS`
- `AI_SCAN_PROVIDER_TIMEOUT_MS`
- `AI_SMALL_REPO_MAX_FILES`
- `AI_SMALL_REPO_MAX_SOURCE_CHARS`
- `AI_MEDIUM_REPO_MAX_FILES`
- `AI_MEDIUM_REPO_MAX_SOURCE_CHARS`

## Manual Smoke Test

1. Open `/`, `/pricing`, `/contact`, `/terms`, `/privacy`, and `/refund`.
2. Sign in and open `/dashboard`.
3. Open `/dashboard/connect` and confirm usage state renders.
4. Start one scan within limits and confirm `/scan/[scanId]` progresses.
5. Open the completed `/results/[scanId]`.
6. Generate or retry the Security Officer Report.
7. Open `/system-testing` and run Quick Site Check.
8. Run a paid-plan Guided Workflow: visit homepage, click Pricing, expect `/pricing`.
9. Confirm settings shows accurate plan and daily usage.
10. As an admin, confirm `/admin` loads and usage limits are bypassed.

## Validation Commands

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run eval:scanner
git diff --check
```
