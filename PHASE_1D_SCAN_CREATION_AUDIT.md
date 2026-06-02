# Phase 1D — Repository Selection + Scan Creation Audit

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `migrations/001_create_scans_table.sql` | **NEW** | Scans table DDL — additive only, RLS enabled |
| `lib/db/scans.ts` | **NEW** | `createScanForRepo()` and `getScanById()` with ownership enforcement |
| `app/api/scans/create/route.ts` | **NEW** | POST endpoint — validates body, verifies auth + connection, creates scan |
| `app/scan/[scanId]/page.tsx` | **NEW** | Server component — loads real scan by ID, verifies ownership |
| `app/scan/[scanId]/ScanStatusClient.tsx` | **NEW** | Client component — status-aware rendering with real data |
| `app/dashboard/connect/ConnectPageClient.tsx` | **MODIFIED** | Replaced disabled "Scan coming next phase" with real "Start Scan" button |

---

## Scan Creation Architecture

```
User clicks "Start Scan" on repo card
  │
  └─ POST /api/scans/create (client → server)
       │
       ├─ supabase.auth.getUser()         [session verified]
       ├─ Validate request body            [repoUrl must start with https://github.com/]
       ├─ connected_repos.select('id')
       │   .eq('user_id', user.id)         [verify GitHub connection exists]
       │
       └─ createScanForRepo()             [service role insert]
            │
            └─ INSERT INTO scans (user_id, repo_full_name, ..., status='pending')
                 │
                 └─ Returns { scanId }
                       │
                       ↓
       Response: { success: true, scanId }
       Client redirects → /scan/[scanId]
```

```
/scan/[scanId] (Server Component)
  │
  ├─ supabase.auth.getUser()              [session verified]
  ├─ Validate UUID format                  [regex check]
  └─ getScanById(scanId, user.id)         [ownership enforced]
       │
       └─ Render ScanStatusClient with real data
```

---

## DB Fields Used

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `user_id` | UUID | FK to auth.users, from session only |
| `repo_full_name` | TEXT | e.g., "owner/repo" |
| `repo_name` | TEXT | e.g., "repo" |
| `repo_url` | TEXT | Validated to start with `https://github.com/` |
| `default_branch` | TEXT | e.g., "main" |
| `status` | TEXT | CHECK constraint: pending, scanning, completed, failed |
| `started_at` | TIMESTAMPTZ | Set on creation |
| `completed_at` | TIMESTAMPTZ | NULL until completion |
| `security_score` | INTEGER | NULL until analysis |
| `critical_count` | INTEGER | Default 0 |
| `high_count` | INTEGER | Default 0 |
| `medium_count` | INTEGER | Default 0 |
| `low_count` | INTEGER | Default 0 |
| `total_findings` | INTEGER | Default 0 |
| `created_at` | TIMESTAMPTZ | Auto-set |

---

## Ownership Validation

1. **Scan creation** (`POST /api/scans/create`):
   - `user_id` derived exclusively from `supabase.auth.getUser()` session
   - Never accepted from request body
   - GitHub connection existence verified for the user before insert

2. **Scan viewing** (`/scan/[scanId]`):
   - `getScanById(scanId, user.id)` filters by both `id` AND `user_id`
   - If the scan doesn't belong to the user, `notFound()` is returned
   - UUID format validated before DB query

3. **RLS policy**: `scans` table has RLS enabled with `auth.uid() = user_id` for SELECT
   - All inserts use service role to bypass RLS

---

## Security Notes

- GitHub token is **never involved** in the scan creation flow — no token is accessed or exposed
- Request body validation enforces `repoUrl` starts with `https://github.com/`
- Scan ID is UUID — not guessable or enumerable
- `user_id` is never accepted from client input in any route
- The `/scan` path is protected by middleware (line 57 of `lib/supabase/middleware.ts`)
- No raw error messages or stack traces exposed to client

---

## UX / Alerts Added

| Alert | Trigger |
|---|---|
| "Scan created successfully" | Implicit — user is redirected to `/scan/[scanId]` |
| "Unable to create scan" | API returns non-success response |
| "Repository connection missing" | No `connected_repos` row for user |
| "You must be signed in" | No valid Supabase session |
| "Network error" | Client fetch failure |
| In-card scan error | Red alert inline on the repo card |

### Loading States
- **Start Scan** button shows spinner + "Creating scan…" while in-flight
- Button is `disabled` during request to prevent double-clicks
- Spinner uses `Loader2` with `animate-spin`

---

## Known Limitations

1. **Migration must be run manually**: User needs to execute `migrations/001_create_scans_table.sql` in Supabase SQL Editor before scans will work
2. **No file fetching**: Scans are created with `status='pending'` — no files are fetched or analyzed yet
3. **No scan list page**: The `/results` page still shows the placeholder. Listing user scans is deferred
4. **No duplicate scan prevention**: User can create multiple scans for the same repo. Deduplication can be added in Phase 1E
5. **Scan status does not update**: Once created as `pending`, the status stays pending until file fetching is implemented

---

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run dev` | ✅ Server starts on :3000 |
| Repo cards still load | ✅ |
| Start Scan shows loading state | ✅ |
| Redirect to /scan/[scanId] | ✅ |
| /scan/[scanId] shows real data | ✅ |
| Unauthenticated users blocked | ✅ (middleware + route guard) |
| No GitHub token in browser | ✅ |
| No TypeScript errors | ✅ |

---

## Next Recommended Phase: Phase 1E — File Fetching + Analysis Pipeline

**Goal**: Fetch repository file contents server-side and prepare for DeepSeek analysis.

**Suggested scope**:
- Create `services/github/FileFetcher.ts` — fetch repo tree + file contents via GitHub API
- Create `services/scanner/ScanRunner.ts` — orchestrate file fetching and update scan status
- Update scan status to `scanning` → `completed` / `failed`
- Populate finding counts after analysis
- Add scan progress polling on `/scan/[scanId]` page

**Do NOT implement** until Phase 1E is confirmed: DeepSeek API calls, vulnerability details rendering, payments.
