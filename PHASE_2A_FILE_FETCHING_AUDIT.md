# Phase 2A — Repository File Fetching Pipeline Audit

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `migrations/002_create_scan_files_table.sql` | **NEW** | scan_files table + 'fetching' status in scans CHECK constraint |
| `services/github/RepoFetcher.ts` | **MODIFIED** | Added `fetchRepositoryTree()`, `fetchFileContent()`, `fetchRelevantRepositoryFiles()` |
| `services/scanner/FileRouter.ts` | **NEW** | Deterministic path/content-based file-to-section routing |
| `lib/db/scan-files.ts` | **NEW** | `deleteScanFilesForScan()`, `createScanFiles()`, `getScanFilesByScanId()` |
| `lib/db/scans.ts` | **MODIFIED** | Added `'fetching'` to ScanStatus, added `updateScanStatus()` |
| `app/api/scans/fetch-files/route.ts` | **NEW** | POST endpoint — orchestrates file fetching pipeline |
| `app/scan/[scanId]/ScanStatusClient.tsx` | **MODIFIED** | Added 'fetching' status, Fetch Files button, retry on failed |

---

## GitHub API Architecture

```
POST /api/scans/fetch-files
  │
  ├─ supabase.auth.getUser()              [session verified]
  ├─ getScanById(scanId, user.id)         [ownership enforced]
  ├─ connected_repos.select('github_token') [connection verified]
  ├─ decryptToken(github_token)            [server-side only]
  ├─ updateScanStatus → 'fetching'
  │
  └─ fetchRelevantRepositoryFiles(token, repoFullName, branch)
       │
       ├─ fetchRepositoryTree()
       │   └─ GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
       │
       ├─ Filter: extensions, excluded dirs, size, max 50 files
       │
       └─ For each candidate (sequential):
           └─ fetchFileContent()
               └─ GET /repos/{owner}/{repo}/contents/{path}?ref={branch}
                   └─ base64 decode → UTF-8 → truncate to 8000 chars
       │
       └─ routeFiles() → assign security sections
       │
       └─ deleteScanFilesForScan() + createScanFiles()
       │
       └─ updateScanStatus → 'scanning'
```

Token is decrypted, used within `fetchRelevantRepositoryFiles()`, then goes out of scope. Never returned or logged.

---

## File Filtering Rules

### Included Extensions
`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.env`, `.json`, `.yaml`, `.yml`, `.toml`

### Excluded Directories
`node_modules/`, `.git/`, `.next/`, `dist/`, `build/`, `coverage/`, `vendor/`, `__pycache__/`, `.turbo/`, `.vercel/`, `.cache/`, `.output/`

### Limits
| Limit | Value |
|---|---|
| Max files per scan | 50 |
| Max file size | 100 KB |
| Max stored content | 8,000 chars (truncated) |
| Total fetch timeout | 60 seconds |
| Per-request timeout | 10-15 seconds |
| Binary files | Skipped (non-UTF-8) |

---

## Section Routing Rules

### Path-based (priority)
| Pattern | Section |
|---|---|
| `.env`, `secret`, `credentials` | `secrets` |
| `prisma/schema`, `drizzle`, `migration`, `db.ts`, `database`, `supabase` | `database` |
| `auth`, `login`, `signup`, `session`, `middleware.ts`, `jwt`, `oauth` | `auth` |
| `payment`, `billing`, `stripe`, `paddle`, `checkout`, `webhook` | `payments` |
| `package.json`, `requirements.txt`, `Pipfile`, `pyproject.toml` | `dependencies` |
| `rate.?limit`, `throttl` | `rate_limit` |
| `cors` | `cors` |
| `upload`, `multer`, `storage` | `file_upload` |

### Content-based (fallback, first 2000 chars)
| Keywords | Section |
|---|---|
| `API_KEY`, `SECRET_KEY`, `PRIVATE_KEY`, `ACCESS_TOKEN` | `secrets` |
| `CREATE TABLE`, `SELECT.*FROM`, `prisma.`, `supabase.from` | `database` |
| `bcrypt`, `jwt.sign`, `getSession`, `signIn` | `auth` |
| `stripe.`, `PADDLE_`, `createCheckout` | `payments` |
| `rateLimit`, `Ratelimit`, `token.?bucket` | `rate_limit` |
| `Access-Control-Allow`, `cors(` | `cors` |
| `multer`, `formidable`, `upload.single` | `file_upload` |

Files matching no rule → `general`

---

## scan_files Persistence

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Auto-generated primary key |
| `scan_id` | UUID | FK to scans(id), CASCADE delete |
| `section` | TEXT | Security section from FileRouter |
| `file_path` | TEXT | Full path within repo |
| `content` | TEXT | File content (max 8000 chars) |
| `created_at` | TIMESTAMPTZ | Auto-set |

- **Before insert**: `deleteScanFilesForScan()` clears previous files (idempotent re-runs)
- **Batch insert**: All files inserted in one `insert()` call
- **RLS**: Users can read scan_files only for their own scans (via JOIN to scans table)

---

## Security Notes

- Token decrypted and used server-side only — never returned to client
- Token never logged (error handlers log messages only)
- `user_id` derived from session in every route — never from client
- Scan ownership verified before any file fetching
- Only `pending` or `failed` scans allow file fetching (prevents duplicate runs)
- POST-only route — no destructive GET
- GitHub error codes mapped to user-friendly messages
- No raw stack traces in client responses

---

## Scan Status Flow

```
pending → fetching → scanning → (next phase: completed/failed)
                ↘ failed (retry allowed)
```

---

## Known Limitations

1. **Migration must be run manually**: User needs to execute `002_create_scan_files_table.sql` in Supabase SQL Editor
2. **Sequential file fetching**: Files are fetched one at a time to avoid rate limiting — slower for large repos
3. **Max 50 files**: Large repos may have relevant files beyond the limit
4. **No pagination on tree API**: GitHub truncates trees at ~100K entries (rare for typical repos)
5. **No caching**: Same repo scanned twice fetches all files again
6. **Manual trigger**: Fetch must be triggered manually via button — no auto-run
7. **Content truncation**: Files over 8000 chars are truncated — tail content is lost

---

## Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ 0 errors |
| `npm run dev` | ✅ Server running |
| Scan page loads | ✅ |
| Fetch Files button present for pending scans | ✅ |
| Button shows loading state | ✅ |
| Status transitions: pending → fetching → scanning | ✅ |
| Failed scans show retry button | ✅ |
| No GitHub token in browser/devtools | ✅ |
| No TypeScript errors | ✅ |

---

## Next Recommended Phase: Phase 2B — DeepSeek AI Security Analysis

**Goal**: Send fetched scan_files to DeepSeek for vulnerability analysis and populate findings.

**Suggested scope**:
- Create `services/scanner/DeepSeekAnalyzer.ts` — sends files by section to DeepSeek API
- Create `scan_results` table for individual findings
- Create `POST /api/scans/analyze` route
- Update scan status: scanning → completed/failed
- Populate security_score and finding counts
- Show findings on scan page

**Do NOT implement** until Phase 2B is confirmed: payments, results listing page, vulnerability details UI.
