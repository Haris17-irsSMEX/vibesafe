# PHASE 5B — Result Gating Audit

## Overview

Phase 5B implements server-side free vs. paid result gating for VibeSafe security scan results. Free users see limited finding metadata only. Paid users (Starter/Builder) see full findings including descriptions, vulnerable code, fix code, and AI fix prompts. **Premium fields are never sent to free users — not even in intermediate server state.**

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `migrations/006_create_users_table.sql` | Creates `users` table with `plan` column (`free \| starter \| builder`) and auto-provision trigger |
| `lib/db/users.ts` | Server-side DB helpers: `getUserProfile`, `upsertUserProfile`, `updateUserPlan`, `isPaidPlan` |
| `app/api/billing/checkout/route.ts` | Paddle checkout session creator — POST `/api/billing/checkout` |
| `components/results/UpgradeCTA.tsx` | Upgrade CTA component with Starter/Builder buttons that call Paddle checkout |
| `components/results/LockedFindingCard.tsx` | Free-user finding card with blur overlay and lock icon |

### Modified Files

| File | Changes |
|------|---------|
| `lib/db/scan-results.ts` | Added `FreeScanResultRecord` type, `GatedScanResultRecord` union, `isPaidResult` type guard, `getScanResultsForScanFree`, `getScanResultByIdFree` — free queries select only gated columns at DB level |
| `lib/types/index.ts` | Updated `UserPlan` from `'free \| pro \| enterprise'` → `'free \| starter \| builder'` to match Paddle plans and DB schema |
| `components/results/FindingsList.tsx` | Accepts `isPaid: boolean` prop; renders `PaidFindingCard` (full, clickable) or `LockedFindingCard` (blurred, locked) per plan; shows `UpgradeCTA` banner for free users |
| `app/results/[scanId]/page.tsx` | Loads user profile server-side, routes to `getScanResultsForScan` or `getScanResultsForScanFree` based on plan before passing data to `FindingsList` |
| `app/results/[scanId]/[findId]/page.tsx` | Loads user profile server-side; routes to `getScanResultById` or `getScanResultByIdFree`; uses two typed variables (`paidFinding`, `freeFinding`) for clean TypeScript narrowing; renders locked panels for free, full panels for paid |

---

## Server-Side Gating Strategy

### The core security principle

> **Never fetch premium data then hide it client-side.**

All field gating happens **at the PostgreSQL SELECT query level**, before any data is returned by the database. Free users never cause premium columns to be read from disk.

### How it works

```
User visits /results/[scanId]
  │
  ├── supabase.auth.getUser() → verify session
  ├── getScanById(scanId, user.id) → verify scan ownership
  ├── getUserProfile(user.id) → read plan from users table
  │
  ├── plan === 'free'
  │     └── getScanResultsForScanFree(scanId)
  │           SELECT id, scan_id, check_name, severity, category,
  │                  file_path, line_number, cwe_id, status, created_at
  │           FROM scan_results WHERE scan_id = $1
  │           [premium fields NEVER appear in query]
  │
  └── plan === 'starter' | 'builder'
        └── getScanResultsForScan(scanId)
              SELECT * FROM scan_results WHERE scan_id = $1
              [all fields returned]
```

### Column selection for free users

```typescript
const FREE_COLUMNS = [
  'id', 'scan_id', 'check_name', 'severity', 'category',
  'file_path', 'line_number', 'cwe_id', 'status', 'created_at'
].join(', ')
```

Fields **never fetched** for free users:
- `description`
- `why_it_matters`
- `vulnerable_code`
- `fix_code`
- `fix_prompt`

---

## Free User Fields

| Field | Visible to Free? |
|-------|-----------------|
| `check_name` | ✅ Yes |
| `severity` | ✅ Yes |
| `category` | ✅ Yes |
| `file_path` | ✅ Yes |
| `line_number` | ✅ Yes |
| `cwe_id` | ✅ Yes |
| `security_score` (scan level) | ✅ Yes |
| `description` | ❌ No — never fetched |
| `why_it_matters` | ❌ No — never fetched |
| `vulnerable_code` | ❌ No — never fetched |
| `fix_code` | ❌ No — never fetched |
| `fix_prompt` | ❌ No — never fetched |
| `effort_minutes` | ❌ No — never fetched |

---

## Paid User Fields

All fields returned including:
- `description` — full issue description
- `why_it_matters` — security impact explanation
- `vulnerable_code` — code excerpt
- `fix_code` — copy-paste fix (with copy button)
- `fix_prompt` — AI fix prompt for Cursor/Claude/IDE (with copy button)
- `effort_minutes` — estimated fix time

---

## Paddle Upgrade Integration

### Checkout flow

1. User clicks **Upgrade to Starter** or **Upgrade to Builder** in `UpgradeCTA`
2. Client POSTs to `/api/billing/checkout` with `{ plan: 'starter' | 'builder' }`
3. Route verifies Supabase session server-side
4. Route calls Paddle Transactions API with correct `price_id`
5. Paddle returns `checkout.url`
6. Client redirects to Paddle-hosted checkout

### Price IDs

| Plan | Environment Variable | Paddle Price ID |
|------|---------------------|-----------------|
| Starter | `PADDLE_STARTER_PRICE_ID` | `pri_01kvbfnv7x8qkpwzaqrwkxpc7d` |
| Builder | `PADDLE_BUILDER_PRICE_ID` | `pri_01kvbfyq511v9bbq9av63q36bk` |

### Plan update

Plan upgrades are applied via the existing Paddle webhook handler (Phase 5A). After payment, Paddle sends a webhook that calls `updateUserPlan()` to update `users.plan` in the database.

---

## Security Notes

1. **No client-side field hiding.** CSS blur is used only as UX affordance — real data is never in the DOM for free users.
2. **Ownership verified before plan check.** `getScanById(scanId, user.id)` always runs first.
3. **Plan loaded from server only.** `getUserProfile` uses the service role client — plan cannot be tampered with by client.
4. **Paddle API key never exposed to client.** Checkout route is server-only; key lives in env.
5. **User profile auto-provisioned.** First-visit `upsertUserProfile` ensures every authenticated user has a `free` plan row, preventing null plan edge cases.
6. **TypeScript enforced separation.** `FreeScanResultRecord` and `ScanResultRecord` are separate types. Premium fields don't exist on the free type — TypeScript prevents accidentally accessing them.

---

## Known Limitations

1. **`users` table trigger requires Supabase SQL editor migration** (see `migrations/006_create_users_table.sql`). Run this manually before deploying Phase 5B to production.
2. **Existing users don't have a `users` row yet.** The `upsertUserProfile` call on first visit handles this gracefully.
3. **`fix_prompt` field is currently `null` in DB** (populated as `null` in `createScanResults` — see Phase 3B comment). The fix prompt panel on paid detail page only renders if `fix_prompt` is non-null.
4. **Paddle checkout creates a new subscription transaction** — does not handle existing subscriptions or plan changes (covered in future billing phase).

---

## Verification Checklist

Run before deploying:

```bash
npx tsc --noEmit    # Must pass with 0 errors
npm run dev         # Confirm no console errors
```

### Manual checks

| Check | Expected |
|-------|---------|
| Free user visits `/results/[scanId]` | Sees severity, category, file path, check name only. UpgradeCTA banner shown. |
| Free user opens DevTools → Network → XHR | No response body contains `description`, `fix_code`, `fix_prompt`, `vulnerable_code`, `why_it_matters` |
| Free user visits `/results/[scanId]/[findId]` | Sees locked panels with blur. No real finding text in DOM. |
| Paid user visits `/results/[scanId]` | Full finding cards with description preview. Click navigates to detail. |
| Paid user visits `/results/[scanId]/[findId]` | Full description, code diff, fix prompt with copy buttons visible. |
| Unauthorized user tries `/results/[scanId]` for another user's scan | Scan not found page (ownership check via `getScanById(scanId, user.id)`) |
| Click "Upgrade to Starter" | Redirects to Paddle checkout page |
| Click "Upgrade to Builder" | Redirects to Paddle checkout page |
| Unauthenticated user | Redirected to `/login` |

---

## Next Recommended Phase

**Phase 5C — Paddle Webhook Plan Update**

- Implement `app/api/billing/webhook/route.ts` to handle `subscription.activated`, `subscription.updated`, `subscription.canceled` events
- Call `updateUserPlan()` with correct `user_id` from `custom_data`
- Verify webhook signature using `PADDLE_WEBHOOK_SECRET`
- Downgrade users on cancellation back to `free`
- Send plan-change confirmation email via Resend

**Phase 5D — Scan Limits by Plan**

- Limit free users to N scans per month
- Track usage in `users` table
- Show usage meter on dashboard
