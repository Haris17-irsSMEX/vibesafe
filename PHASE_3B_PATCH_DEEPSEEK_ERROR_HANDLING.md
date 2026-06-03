# Phase 3B Patch — DeepSeek Error Handling

## Issue Context
During Phase 3B, attempting to run the DeepSeek AI scanner with an account lacking credits resulted in a `402 Insufficient Balance` or similar error. This caused the application to handle the error ungracefully, and additionally exposed a missing `low_count` field in the `scans` table during finalization.

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `migrations/005_add_low_count_to_scans.sql` | **NEW** | Added `low_count` to the `scans` table to fix the finalization failure. |
| `services/scanner/DeepSeekScanner.ts` | **MODIFIED** | Added classification for 402 / Insufficient Balance errors. Explicitly disabled retries for billing errors. |
| `services/scanner/ScanOrchestrator.ts` | **MODIFIED** | Added logic to track billing errors. If all sections fail due to insufficient balance, the scan is aborted gracefully and explicitly marked as `failed`. |
| `app/scan/[scanId]/ScanStatusClient.tsx` | **MODIFIED** | Added `router.refresh()` to the error path so the UI transitions to the `failed` state and displays the backend error message cleanly. |

## Error Handling Behavior

1. **Detection**: `DeepSeekScanner` intercepts errors and checks for `402` status codes or keywords like `insufficient balance` and `payment required`.
2. **No Pointless Retries**: Unlike network timeouts, a 402 error is not retried, as retrying will always fail and waste time. It immediately returns an `insufficient_balance` reason.
3. **Orchestrator Fallback**: If the orchestrator detects that *all* attempted sections failed due to `insufficient_balance`, it halts the scan, preventing a fake "100% secure" score. It updates the database scan status to `failed` with the message: `"DeepSeek API balance is insufficient. Add credits and try again."`
4. **Client Exposure**: The `POST /api/scans/run-ai` endpoint catches this structured error and returns it in standard JSON:
   ```json
   {
     "success": false,
     "error": "DeepSeek API balance is insufficient. Add credits and try again."
   }
   ```
5. **UI Update**: The React client intercepts this JSON, sets the local error banner, and triggers `router.refresh()`. The server component re-renders the page in the `failed` state, showing the specific billing error message and a clean retry path.

## Known Limitations
- **DeepSeek Account Credits**: The scanner fundamentally requires a funded DeepSeek API account to function. Free usage or empty balances will permanently trigger this failure state until topped up.
