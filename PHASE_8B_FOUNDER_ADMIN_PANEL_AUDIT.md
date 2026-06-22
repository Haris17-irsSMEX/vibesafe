# PHASE 8B — Founder Admin Access + Internal Admin Panel

**Audit Date:** 2026-06-23  
**Phase:** 8B  
**Status:** Complete ✅

---

## Files Changed

### New Files

| File | Purpose |
|------|---------|
| `lib/auth/admin.ts` | Server-only admin email helper — reads `ADMIN_EMAILS` env var |
| `lib/db/admin-stats.ts` | Admin DB queries: overview stats, users, scans, findings, plan override |
| `app/admin/page.tsx` | Internal admin panel page (auth-gated) |
| `app/api/admin/users/update-plan/route.ts` | Admin-only API route for manual plan override |

### Modified Files

| File | Change |
|------|--------|
| `app/results/[scanId]/page.tsx` | Added admin bypass — `canViewFull = isAdmin \|\| paid` |
| `app/results/[scanId]/[findId]/page.tsx` | Added admin bypass — `canViewFull = isAdmin \|\| paid` |
| `app/dashboard/page.tsx` | Passes `isAdmin` to `DashboardLayout` |
| `app/settings/page.tsx` | Passes `isAdmin` to `DashboardLayout` |
| `app/admin/page.tsx` | Passes `isAdmin={true}` to `DashboardLayout` |
| `components/layout/dashboard-layout.tsx` | Added optional `isAdmin` prop, passes to both Sidebar instances |
| `components/layout/sidebar.tsx` | Added `isAdmin` prop, conditionally renders "Admin Panel" nav link |

---

## Admin Access Strategy

### Environment Variable

```
ADMIN_EMAILS=irssmex@gmail.com,sughrakhnam@gmail.com
```

- **Server-side only** — never uses `NEXT_PUBLIC_ADMIN_EMAILS`
- Comma-separated list, whitespace-trimmed, lowercased comparison
- Zero exposure to client bundle

### How Admin Check Works

1. `getAdminEmails()` — parses `process.env.ADMIN_EMAILS` on the server
2. `isAdminEmail(email?)` — compares authenticated user's email to the list
3. `getAdminStatus()` — combines session check + email check in one call
4. All checks happen **server-side** in RSC page components before any data is fetched

### Access Logic

```ts
// Server component (results page, finding detail page)
const isAdmin = isAdminEmail(user.email)   // server-side only
const canViewFull = isAdmin || paid         // admin bypasses plan gate
```

---

## Env Vars Required

| Var | Notes |
|-----|-------|
| `ADMIN_EMAILS` | Comma-separated admin emails. Already set in `.env.local` |
| All existing vars | Unchanged — Supabase, Paddle, GitHub, DeepSeek, Resend, Upstash |

---

## Result Gating Changes

### Before Phase 8B

```
paid → full results
free → gated results (no description/fix/code)
```

### After Phase 8B

```
isAdmin || paid → full results     (admin always gets full, even on free plan)
free (non-admin) → gated results   (unchanged)
```

> **Critical**: The DB query itself now fetches full columns when `canViewFull` is true.
> If `isAdmin` is false and `paid` is false, `getScanResultsForScanFree()` is called,
> which **never selects premium columns at the DB level**.  
> Admin status is **never passed from client** — it is computed server-side from the
> authenticated session email.

### Admin Badge

When logged in as admin, the results page shows a violet "Founder mode" pill badge next to the plan badge. It is only rendered when `isAdmin === true` in the server component.

---

## Admin Panel Features (`/admin`)

### Access Control

- Unauthenticated → redirect to `/login`
- Authenticated non-admin → generic "Not found" (no 404 status — avoids revealing route)
- Authenticated admin → full panel

### Overview Cards

| Stat | Source |
|------|--------|
| Total Users | `COUNT` on `users` table |
| Total Scans | `COUNT` on `scans` table |
| Total Findings | `COUNT` on `scan_results` table |
| Paid Users | `COUNT` where `plan != 'free'` |
| Failed Scans | `COUNT` where `status = 'failed'` |

Plus derived stats (conversion rate, avg findings/scan, failure rate).

### Tables

- **Recent Users** — email, plan, scan count, joined, plan updated  
- **Recent Scans** — repo, user email, status, security score, findings count, timestamps  
- **Recent Findings** — severity, check name, file path, scan ID link

### Plan Override

Each user row has a dropdown (`free / starter / builder / pro`) + "Set" button.  
Submits to `POST /api/admin/users/update-plan` via HTML form.  
On success, redirects back to `/admin`.

### System Configuration Panel

Shows **only configured/not configured** — never shows actual secret values:

- ADMIN_EMAILS configured
- Paddle Billing configured  
- GitHub OAuth configured
- DeepSeek AI configured
- Resend Email configured
- Upstash Rate Limiting configured

---

## Admin Sidebar / Nav Link

The Sidebar component now accepts `isAdmin?: boolean` (defaults to false).

When `isAdmin=true`:
- An "Admin" section appears at the bottom of the nav
- A "Admin Panel" link points to `/admin`
- Styled in violet to distinguish from normal nav items

The `isAdmin` flag is computed server-side in RSC page components and passed down as a prop through `DashboardLayout → Sidebar`. No client-side secret or email list is involved.

---

## Plan Override API

**Endpoint:** `POST /api/admin/users/update-plan`

**Security checks (in order):**
1. Supabase session verification — 401 if no session
2. `isAdminEmail(user.email)` check — 403 if not admin
3. Plan validation (`free | starter | builder | pro`) — 400 if invalid

**Supports:**
- JSON body: `{ userId, plan }` → returns JSON
- FormData: `userId=..., plan=...` → redirects to `/admin`

**Does NOT:**
- Modify Paddle subscriptions
- Touch webhooks
- Break existing billing logic

---

## Manual Testing Checklist

| Test | Expected |
|------|----------|
| Login as admin email | ✅ Dashboard shows "Admin Panel" in violet sidebar section |
| Navigate to `/admin` | ✅ Admin panel loads with stats, tables, env status |
| Admin views scan results | ✅ Full findings visible, "Founder mode" badge shown |
| Admin views finding detail | ✅ Full description, fix code, fix prompt visible |
| Admin uses plan selector | ✅ Plan updates, page reloads with new plan |
| Normal free user views results | ✅ Upgrade overlay shown, premium fields hidden |
| Paid user views results | ✅ Full results shown as before |
| Non-admin visits `/admin` | ✅ "Not found" generic page shown |
| Unauthenticated visits `/admin` | ✅ Redirected to `/login` |
| Admin link visible to admin | ✅ Violet "Admin Panel" nav item |
| Admin link visible to normal user | ✅ NOT visible — `isAdmin=false` |
| DevTools inspection | ✅ No ADMIN_EMAILS, no tokens, no service role key visible |
| TypeScript check | ✅ `npx tsc --noEmit` passes with 0 errors |
| Build | ✅ `npm run build` succeeds |

---

## Security Notes

1. **ADMIN_EMAILS is server-only** — never prefixed with `NEXT_PUBLIC_`. Any attempt to read it client-side returns `undefined`.

2. **Admin check is always server-side** — the `isAdmin` boolean is computed in RSC page components using `process.env.ADMIN_EMAILS` and the authenticated session. It is never derived from client input or cookies.

3. **The admin link in the sidebar** receives `isAdmin` as a React prop from the server page via `DashboardLayout`. This is safe because it's just a boolean — no email addresses or secrets are ever passed to client components.

4. **The admin panel never shows secret values** — only `configured / not configured` status. Actual keys are never accessed outside of their intended modules.

5. **Plan override is fully server-verified** — `POST /api/admin/users/update-plan` re-verifies admin status on every request. There is no trust of client-provided auth state.

6. **Free user gating is unchanged** — `getScanResultsForScanFree()` is still called for non-admin, non-paid users. Premium columns are excluded at the DB query level, not just filtered in memory.

7. **Paddle webhooks untouched** — manual plan override via admin UI writes directly to `users.plan` and `users.plan_updated_at`. Paddle webhook behavior is unchanged.

---

## Stop Marker

Phase 8B complete. No further changes in this phase.
