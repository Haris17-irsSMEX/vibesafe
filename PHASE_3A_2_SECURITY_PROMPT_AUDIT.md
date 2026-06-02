# Phase 3A-2 — Security Audit Brain Integration Audit

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `services/scanner/prompts/sectionPrompts.ts` | **REWRITTEN** | All 8 sections with full audit-brain checklists, fileHints, PRIMARY_SCAN_SECTIONS export |
| `services/scanner/prompts/systemPrompt.ts` | **UPDATED** | Tightened no-fabrication/no-inference rules, clearer severity definitions |
| `services/scanner/prompts/buildSectionPrompt.ts` | **UPDATED** | Uses updated SectionDefinition type, adds no-fabrication reminder in user-turn |
| `services/scanner/FileRouter.ts` | **UPDATED** | Added `server_validation` to SecuritySection type + path/content routing rules |

---

## Audit Brain Mapping

| Audit Checklist Section | Scanner Section ID |
|---|---|
| Environment Variables and Secret Management | `secrets` |
| Database Security | `database` |
| Authentication and Session Management | `auth` |
| Server-Side Validation | `server_validation` *(new)* |
| Dependency and Package Security | `dependencies` |
| Rate Limiting | `rate_limit` |
| CORS Configuration | `cors` |
| File Upload Security | `file_upload` |
| Payment Security | `payments` *(kept, FileRouter compat)* |
| General / catch-all | `general` *(kept, FileRouter fallback)* |

---

## What Each Section Checks

### `secrets` — Secrets & Credentials
Hardcoded API keys, tokens, passwords, private keys in source code. JWT weak/hardcoded secrets. Database connection strings with inline credentials. Secrets in .env files or logs. URL query-param secret leakage.

### `database` — Database Security
SQL injection via raw query interpolation. ORM `raw()` with user input. Missing RLS policies. Unauthenticated DB operations. Missing user_id ownership filter on Supabase/Prisma queries. PII/passwords stored without encryption. Raw DB errors exposed to clients.

### `auth` — Authentication & Session Management
Missing auth checks on routes/actions. Middleware bypasses. JWT algorithm confusion and missing exp validation. Session tokens in localStorage. Missing SameSite cookies. IDOR — resource access without ownership check. User ID from client body. OAuth state CSRF. Password reset token issues. Account enumeration. Missing brute-force protection.

### `server_validation` — Server-Side Input Validation *(new)*
API routes consuming req.body without Zod/Yup/Joi validation. Missing type coercion. eval() / shell injection. XSS via unescaped output. Open redirect. SSRF. Path traversal. Prototype pollution. Stack traces in error responses. Unbounded batch arrays.

### `dependencies` — Dependency & Package Security
CVE-affected package versions. Wildcard version ranges. Missing lock files. postinstall scripts from unknown publishers. devDependencies in production. Unmaintained security-critical packages.

### `rate_limit` — Rate Limiting & Abuse Prevention
Missing limits on login, signup, password reset, OTP. Limits too high to be effective. IP-only limiting bypassable via VPN. In-memory limiter without Redis. Unbounded GraphQL/batch queries. Missing upload quotas.

### `cors` — CORS Configuration
Wildcard + credentials misconfig. Reflect-all origin. Non-HTTPS origins allowed. `null` origin in allowlist. Wildcard headers. DELETE/PUT allowed cross-origin without auth. Missing CORS on sensitive routes.

### `file_upload` — File Upload Security
Missing MIME validation. Extension-only MIME check (spoofable). No size limits. User-supplied filenames causing path traversal. Uploaded files in web-accessible paths. No auth on upload endpoints. Files served without ownership check. Zip slip. SVG XSS. XXE on XML/CSV.

---

## Why Prompts Are Compact (Not Full Audit Docs)

The full security audit brain runs to thousands of words. Sending the entire document to every DeepSeek API call would:

1. **Exhaust token limits** — 4000 max_tokens leaves no room for file content
2. **Reduce precision** — broad prompts produce more false positives
3. **Increase cost and latency** — more tokens = slower, more expensive

Instead, the architecture is:
- **System prompt** (~500 tokens): Output contract only. Never changes.
- **Section definition** (~200–400 tokens): Focused checklist for the specific files being scanned.
- **File content** (~up to 80K chars): The actual code under review.

The full audit brain is encoded once in `sectionPrompts.ts` as structured TypeScript. Each section call injects only the relevant checklist — not the entire brain.

---

## Prompt Architecture

```
POST /api/scans/analyze
  │
  └─ For each section in PRIMARY_SCAN_SECTIONS:
       ├─ buildSectionPrompt(section, scanFiles)
       │   ├─ Filter files where f.section === sectionName
       │   ├─ Build header: name + description + checklist (from sectionPrompts)
       │   ├─ Append: no-fabrication reminder
       │   ├─ Append: FILE: blocks (≤8000 chars each, ≤80000 total)
       │   └─ Return full user-turn prompt string (or null if no files)
       │
       └─ runSectionScan(sectionName, prompt)
           ├─ system: SYSTEM_PROMPT (JSON schema + no-fabrication contract)
           ├─ user:   built prompt above
           └─ → rawText response
```

---

## No-Fabrication Enforcement (Two Layers)

| Layer | Where | Rule |
|---|---|---|
| System prompt | Every call | "A finding is ONLY valid if the vulnerability is DIRECTLY VISIBLE in the provided source code." |
| User-turn prompt | Per section | "Only report issues directly visible and evidenced in the code provided below." |
| FindingParser | Post-response | Validates schema — malformed findings are dropped, never stored |
| SecurityScorer | Post-parse | Purely deterministic — no AI score input |

---

## FileRouter + sectionPrompts Consistency

`server_validation` is now present in both:
- `FileRouter.ts` `SecuritySection` type + routing rules
- `sectionPrompts.ts` definition + checks

Routing order in `FileRouter` matters — `server_validation` path rules (validators, api/, routes/) are checked after `auth` and before `rate_limit` to avoid conflicts. API route files that contain auth logic will already be captured by the `auth` rules.

---

## PRIMARY_SCAN_SECTIONS Export

```typescript
export const PRIMARY_SCAN_SECTIONS: string[] = [
  'secrets', 'database', 'auth', 'server_validation',
  'dependencies', 'rate_limit', 'cors', 'file_upload',
]
```

The scan orchestrator (Phase 3B) will iterate this list. `payments` and `general` are included in `ALL_SECTIONS` but are not in `PRIMARY_SCAN_SECTIONS` — files routed to `payments` or `general` will be picked up via the catch-all in the orchestrator if present.

---

## Known Limitations

1. **Routing overlap**: A file like `app/api/auth/login/route.ts` matches both `auth` (path: `/auth/`) and `server_validation` (path: `app/api/`). FileRouter's ordering gives `auth` priority — correct behavior.
2. **server_validation is broad**: API routes catching all validation issues means the section may receive many files. The 80K char cap ensures prompts stay manageable.
3. **payments section not in PRIMARY_SCAN_SECTIONS**: Files routed to `payments` by FileRouter need the orchestrator to handle them explicitly (add to iteration or use ALL_SECTIONS).
4. **No dynamic checklist injection**: If a repo has no Stripe code, the `payments` checklist still mentions Stripe. This is intentional — the checks are static and the model ignores irrelevant ones.
5. **Context window assumption**: 80K chars ≈ ~20K tokens. DeepSeek-chat context is 64K tokens — 20K for content leaves ~44K for system + user header + response. Safe, but monitor for very large sections.

---

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run dev` | ✅ Running |
| `sectionPrompts.ts` contains all 8 sections | ✅ |
| Each section has `id`, `name`, `description`, `checks`, `fileHints` | ✅ |
| `systemPrompt.ts` still enforces JSON-only output | ✅ |
| `buildSectionPrompt.ts` compatible with new `SectionDefinition` | ✅ |
| `FileRouter.ts` includes `server_validation` in `SecuritySection` type | ✅ |
| `PRIMARY_SCAN_SECTIONS` exported for orchestrator use | ✅ |
| No TypeScript errors | ✅ |

---

## Next Recommended Phase: Phase 3B — Scan Execution Orchestrator

**Goal**: Wire together all Phase 3A components into a real scan execution endpoint.

**Suggested scope**:
- Create `scan_results` table (migration 004)
- Create `lib/db/scan-results.ts` DB helper
- Create `services/scanner/ScanOrchestrator.ts`:
  - Accepts `scanId` + `userId`
  - Calls `getScanFilesByScanId()`
  - Iterates `PRIMARY_SCAN_SECTIONS` (+ payments if files exist)
  - For each section: `buildSectionPrompt()` → `runSectionScan()` → `parseFindings()`
  - Deduplicates across sections
  - Calculates score with `calculateSecurityScore()`
  - Persists findings to `scan_results`
  - Updates scan status: `scanning → complete`
- Create `POST /api/scans/analyze` route — gated on `isScanReadyForAI()`
- Add "Run AI Scan" button to scan page

**Gate**: Must confirm Phase 3A-2 is committed before starting Phase 3B.
