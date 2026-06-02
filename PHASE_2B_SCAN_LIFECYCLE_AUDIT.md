# Phase 2B — Scan Lifecycle Hardening Audit

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `migrations/003_scan_lifecycle_hardening.sql` | **NEW** | Adds 'complete' status, error_message column, unique constraint on scan_files |
| `lib/db/scans.ts` | **MODIFIED** | Transition guard, failScan(), resetScanToPending(), isScanReadyForAI(), error_message in ScanRecord |
| `lib/db/scan-files.ts` | **MODIFIED** | Added countScanFilesForScan() |
| `app/api/scans/fetch-files/route.ts` | **MODIFIED** | Uses isValidTransition(), failScan() on all error paths, clear messages |
| `app/api/scans/reset/route.ts` | **NEW** | POST endpoint — resets scanning/failed → pending, clears scan_files |
| `app/scan/[scanId]/page.tsx` | **MODIFIED** | Passes error_message, fileCount, readyForAI to client |
| `app/scan/[scanId]/ScanStatusClient.tsx` | **MODIFIED** | errorMessage displayed, Re-fetch button, complete state, reset handler |

---

## Status Lifecycle

```
                 ┌──────────┐
         ┌──────▶│ pending  │◀───────────────────────────┐
         │       └────┬─────┘                            │ reset
  reset  │            │ fetch                            │
         │            ▼                                  │
         │       ┌──────────┐                   ┌──────────┐
         │       │ fetching │──── failure ─────▶│  failed  │
         │       └────┬─────┘                   └──────────┘
         │            │ success                      ▲
         │            ▼                              │
         │       ┌──────────┐                        │
         └───────│ scanning │──── failure ───────────┘
                 └────┬─────┘
                      │ (Phase 2C: AI analysis)
                      ▼
               ┌──────────────┐
               │   complete   │  (terminal)
               └──────────────┘
```

### Valid Transitions Table

| From | Allowed To |
|---|---|
| `pending` | `fetching` |
| `fetching` | `scanning`, `failed` |
| `scanning` | `complete`, `completed`, `failed`, `pending` (reset) |
| `complete` | — (terminal) |
| `completed` | — (terminal, backward compat) |
| `failed` | `fetching` (retry), `pending` (manual reset) |

---

## Ownership Validation

Every operation enforces this sequence:
1. `supabase.auth.getUser()` → `user.id` from session (never from client)
2. `getScanById(scanId, user.id)` → filters by BOTH `id` AND `user_id`
3. If `null` → 404 (indistinguishable from "not found" for other users)
4. UUID format validated before any DB query

No route accepts `user_id` as a parameter.

---

## Error Handling

### failScan()
Called on every error path in `fetch-files`:
- Stores a safe, truncated (max 500 chars) message in `scans.error_message`
- Never stores raw stack traces
- Never stores the GitHub token
- Updates status to `failed`

### error_message display
- Shown on the scan page when `status === 'failed'`
- Falls back to a generic message if `error_message` is null
- Column is cleared (`null`) when scan is reset or re-fetched successfully

### Error messages by failure type
| Failure | Message shown to user |
|---|---|
| GitHub token invalid | "GitHub token expired or revoked. Please reconnect GitHub." |
| Rate limited | "GitHub API rate limit reached. Please wait a few minutes and retry." |
| Repo not found | "Repository not found or access was denied." |
| Network error | "Unable to reach GitHub. Please check your connection and retry." |
| No files found | "No security-relevant files found in this repository." |
| DB store failure | "Failed to store scan files in database." |
| Decryption failure | "GitHub token could not be decrypted. Please reconnect GitHub." |
| Catch-all | "An unexpected error occurred during file fetching." |

---

## Retry Behavior

### Retry (failed → fetching)
- User clicks "Retry Fetch Files" on the scan page
- Client calls `POST /api/scans/fetch-files`
- Route checks `isValidTransition('failed', 'fetching')` → allowed
- Old `scan_files` are deleted before new rows are inserted
- `error_message` is cleared on successful fetch

### Reset (scanning → pending)
- User clicks "Re-fetch Files" button (only shown on `scanning` status)
- Client calls `POST /api/scans/reset`
- Route calls `resetScanToPending(scanId, currentStatus)` — validates transition
- `scan_files` for the scan are deleted
- `error_message` is cleared
- Page refreshes → status shows `pending`, Fetch Files button reappears

---

## Duplicate Prevention

1. **Before insert**: `deleteScanFilesForScan()` always called before `createScanFiles()`
2. **DB constraint**: `UNIQUE (scan_id, file_path)` on `scan_files` prevents duplicate file paths per scan even if the delete races with a concurrent insert
3. **Transition guard**: `isValidTransition()` prevents two concurrent fetches from racing — `fetching` → `fetching` is blocked with 409

---

## Scan Readiness Check

```typescript
isScanReadyForAI(scanId, userId): Promise<boolean>
```

Returns `true` only when:
- `scan.status === 'scanning'`
- `COUNT(scan_files WHERE scan_id = scanId) > 0`
- User owns the scan (`user_id` filter)

Displayed as a green "Ready for AI scan" badge on the scan page.
Called server-side on page load — no client API call needed.

---

## Security Notes

- GitHub token never returned to client or logged
- `user_id` always from session — never from request body
- Scan ownership verified on every route (`getScanById` requires both `id` and `user_id`)
- `error_message` limited to 500 chars before storage
- No raw stack traces in client responses
- Terminal states (`complete`, `completed`) block all transitions
- UUID format validated before DB queries
- Reset route is POST-only (no destructive GET)

---

## Known Limitations

1. **Migration must be run manually**: Execute `003_scan_lifecycle_hardening.sql` in Supabase SQL Editor before using Phase 2B features
2. **No concurrency lock**: Two browser tabs could trigger `fetch-files` simultaneously between the guard check and the DB write. The `UNIQUE (scan_id, file_path)` constraint catches this at insert time
3. **No partial retry**: Failed mid-fetch scans always re-fetch all files from scratch
4. **Manual reset only**: `scanning → pending` reset requires user to click the button
5. **No scan history**: Only one scan record per trigger — no history/versions of files fetched
6. **error_message is not versioned**: Only the last error is stored; previous errors are overwritten

---

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run dev` | ✅ Running |
| Scan page loads with errorMessage prop | ✅ |
| failed status shows errorMessage | ✅ |
| Retry Fetch Files button on failed | ✅ |
| Re-fetch Files button on scanning | ✅ |
| readyForAI badge on scanning | ✅ |
| fileCount displayed in repo info | ✅ |
| complete status renders correctly | ✅ |
| isScanReadyForAI returns true only for scanning + files | ✅ |
| No GitHub token in browser/devtools | ✅ |
| No TypeScript errors | ✅ |

---

## Next Recommended Phase: Phase 2C — DeepSeek AI Security Analysis

**Goal**: Send collected `scan_files` to DeepSeek API for vulnerability detection.

**Suggested scope**:
- Create `services/scanner/DeepSeekAnalyzer.ts`
- Create `scan_results` table for individual findings
- Create `POST /api/scans/analyze` — protected by `isScanReadyForAI()` check
- Update scan status: `scanning → complete`
- Populate `security_score` and finding counts
- Render findings summary on scan page

**Gate**: Phase 2C MUST NOT start until `isScanReadyForAI()` returns `true`.
**Do NOT implement** payments, results listing, or vulnerability detail UI in Phase 2C.
