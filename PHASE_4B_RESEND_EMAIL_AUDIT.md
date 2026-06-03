# Phase 4B — Resend Transactional Emails Audit

## Overview
Phase 4B integrates Resend to send transactional emails after a scan reaches a terminal state (complete or failed). Email delivery is strictly non-blocking — any Resend failure is caught server-side and logged without crashing or affecting the scan pipeline.

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `package.json` | **MODIFIED** | `resend` SDK installed. |
| `.env.local` | **MODIFIED** | `RESEND_FROM_EMAIL` added as a placeholder. |
| `services/notifications/ResendMailer.ts` | **NEW** | Full email service with HTML templates, config validation, and safe error handling. |
| `services/scanner/ScanOrchestrator.ts` | **MODIFIED** | Email triggers wired into both the scan-complete and scan-failed paths. |

## Email Trigger Architecture

```
ScanOrchestrator.runAIScan()
 │
 ├─ Resolves user email via admin.auth.admin.getUserById(userId)   ← before try block
 │
 └─ try block:
     ├─ [on DeepSeek billing failure]  → failScan() + sendScanFailedEmail()
     ├─ [on scan completion]           → updateScanStatus('complete') + sendScanCompleteEmail()
     └─ catch (catastrophic):
         ├─ failScan()
         └─ sendScanFailedEmail()   ← with fresh DB lookup for repo name
```

## Scan Complete Email
- **Subject:** `✅ Scan complete — <repo> scored <score>/100`
- **Includes:** Repository name, security score ring, per-severity counts, "View Results" CTA button.
- **URL:** `NEXT_PUBLIC_APP_URL/results/<scanId>` (fully qualified)
- **Empty state:** If `totalFindings === 0`, the email shows "No security issues were found."

## Scan Failed Email
- **Subject:** `⚠️ VibeSafe scan failed — <repo>`
- **Includes:** Repository name, safe human-readable failure reason, "Go to Dashboard" CTA.
- **Raw errors excluded:** Stack traces, GitHub tokens, and DeepSeek responses are never included.

## Security Notes
- `RESEND_API_KEY` is read **exclusively** from `process.env` on the server — never exposed to client bundles.
- User email is resolved server-side from Supabase Auth Admin API using `userId` from the session.
- User-controlled data (repo names) is HTML-escaped via `escapeHtml()` before being embedded in email HTML to prevent XSS if Resend ever renders HTML server-side.
- Email log lines mask the user's email: `user@***` (only local part shown).

## Local vs Production Behavior

| Condition | Behavior |
|---|---|
| `RESEND_API_KEY` missing in dev | Logs `[Resend] Email skipped in development.` — no crash |
| `RESEND_FROM_EMAIL` missing in dev | Same as above — treated as missing config |
| `RESEND_API_KEY` missing in production | Logs `[Resend] Missing config in production.` — no crash |
| Resend API call throws | Error caught, logged safely — scan result unaffected |

## Known Limitations
- **From address:** `RESEND_FROM_EMAIL` must use a verified Resend sender domain before deployment. Update `noreply@yourdomain.com` to your actual verified sender.
- **Email not retried:** If the Resend call fails, the email is not queued for retry. This is by design to keep the scan pipeline simple. A queueing system (e.g. Inngest, Trigger.dev) could be added in a future phase for guaranteed delivery.
- **User preference:** There is no unsubscribe link or email preference management yet. This should be added before public launch.

## Next Recommended Phase
**Phase 4C — Paddle Monetization Integration**
With the scanning pipeline, results UI, and email notifications complete, the application is ready to implement subscription tiers and paywall gating of premium findings data.
