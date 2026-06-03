# Phase 3B — AI Scan Execution Audit

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `migrations/004_create_scan_results_table.sql` | **NEW** | Migration for `scan_results` with RLS. |
| `lib/db/scan-results.ts` | **NEW** | DB helpers to insert, fetch, and delete scan results safely using the service role client. |
| `services/scanner/ScanOrchestrator.ts` | **NEW** | Core scan orchestrator to execute DeepSeek section scans and persist parsed results. |
| `app/api/scans/run-ai/route.ts` | **NEW** | API route to trigger the AI scan with robust checks on state and authorization. |
| `app/scan/[scanId]/ScanStatusClient.tsx` | **MODIFIED** | Added "Run AI Security Scan" button, API call integration, loading state, and success/error handling. |

---

## AI Execution Architecture

1. **Pre-flight**: API route `POST /api/scans/run-ai` checks if the user is authenticated, owns the scan, and `scan.status === 'scanning'` (with >0 files collected).
2. **Setup**: `ScanOrchestrator` fetches all `scan_files`, deletes any prior `scan_results` (to ensure idempotency), and groups files by section.
3. **Execution**: It loops through `PRIMARY_SCAN_SECTIONS` sequentially to respect rate limits. For each relevant section:
   - `buildSectionPrompt` creates a contextually rich prompt.
   - `DeepSeekScanner` makes the API request.
   - `FindingParser` safely validates the raw JSON response.
4. **Post-processing**: Parsed findings are deduplicated by `check_name` and `file_path`.
5. **Persistence**: Valid findings are bulk inserted into `scan_results`.
6. **Finalization**: `calculateSecurityScore` determines the final score, and the `scans` table is updated with the `score`, counts, and status `complete`.

---

## Parser Validation Behavior

The orchestrator leverages `FindingParser.ts` (built in Phase 3A) which guarantees:
- **No unhandled exceptions**: Invalid JSON returns an internal parse error flag rather than crashing the scan.
- **Malformed entries skipped**: If DeepSeek returns an array where one finding is missing required fields (e.g., `file_path`), that entry is ignored, and the rest are kept. The skipped count is tracked internally.
- **No fake findings**: A zero-finding result correctly yields a perfect 100 score with no synthetic rows.

---

## Section Failure Handling

- If a specific section (e.g., `auth`) fails due to a network timeout or DeepSeek 500 error, the orchestrator logs a warning and **continues to the next section**. This ensures a single flake does not ruin the entire scan.
- If a **catastrophic failure** happens (e.g., database connection drops), the scan halts, and the `scans` table status becomes `failed` with a safe, generic user-facing message. No sensitive API errors are ever exposed to the client.

---

## Scoring Rules & Database Writes

- **Scoring**: Determinstic penalties are subtracted from 100 (CRITICAL: -25, HIGH: -10, MEDIUM: -4, LOW: -1). It's clamped strictly to `[0, 100]`. No AI output modifies the numeric weights.
- **DB Writes**: 
  - `scan_results`: Inserted using service role with explicit `user_id` mapped from the authenticated session, ensuring RLS rules apply.
  - `scans`: Updated dynamically with final statistics.

---

## Security Notes

- RLS on `scan_results` strictly mandates `auth.uid() = user_id`.
- The DeepSeek API key is loaded server-side only.
- Raw model responses are never reflected to the client unless successfully validated against the `ScanFinding` schema.
- Inputs from the client (`scanId`) are strictly sanitized/guarded via auth ownership checks.

---

## Known Limitations

- **Sequential Scanning**: `ScanOrchestrator` awaits each section one-by-one to avoid rate-limiting limits from DeepSeek. Large repositories could take ~30-60 seconds. In the future, this should be moved to a background worker (e.g., Inngest or bullmq).
- **Vercel Timeout**: The route is configured with `export const maxDuration = 300` to prevent 504 Gateway Timeouts, but long scans may still be risky on heavily loaded serverless infra.

---

## Next Recommended Phase

**Phase 3C — Scan Results UI & Detail View**

Now that findings are generated and persisted into `scan_results`, the next phase should build the UI to present them safely and beautifully.

**Suggested scope**:
- Modify `/app/scan/[scanId]/page.tsx` to display findings in the 'complete' state.
- Create a `ScanFindingsList` component that groups issues by severity.
- Create a detailed modal or expandable row to show `description`, `why_it_matters`, and `vulnerable_code` / `fix_code` diffs.
- Ensure proper rendering of snippets (highlighting without execution/XSS risks).
