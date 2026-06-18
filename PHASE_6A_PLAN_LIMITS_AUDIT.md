# Phase 6A — Plan-Based Scan Limits with Upstash

## Overview
Phase 6A successfully introduced strict, plan-based limits on file fetching and AI scans to protect system resources and billing credits while pushing free users to upgrade when their limits are exhausted. 

## Files Changed

| File | Status | Purpose |
|---|---|---|
| `lib/rate-limit.ts` | **UPDATED** | Implemented the actual logic mapping plans to window limits. Uses `plan` parameter dynamically and configures Upstash `Ratelimit` instances correctly. Keys now correctly structure to `${plan}:${userId}` to isolate tracking. Safely fails closed in production and bypasses Redis limits in dev if Redis credentials are missing. |
| `app/api/scans/fetch-files/route.ts` | **UPDATED** | Retrieves the exact user plan from the database instead of trusting any client properties. Passes the `userId` and `plan` to the rate limit library. Returns safe strings for end-users, differentiating between free and paid tier exhaustions. |
| `app/api/scans/run-ai/route.ts` | **UPDATED** | Performs identical server-side plan-loading logic before launching the DeepSeek scan. Completely protects the scan orchestrator with proper HTTP 429 status codes. |
| `app/scan/[scanId]/ScanStatusClient.tsx` | **UPDATED** | Extended the UI to parse API error messages explicitly looking for the keyword `Upgrade`. In those specific instances (Free limit exhausted), renders a highly visible "Upgrade Plan" button directly in line with the alert module to instantly funnel users. |

## Plan Limit Configuration

| Plan | Action | Limit | Window |
|---|---|---|---|
| **Free** | File Fetch | 5 | 1 hour |
| | AI Scans | 2 | 1 day |
| **Starter** | File Fetch | 20 | 1 hour |
| | AI Scans | 20 | 1 day |
| **Builder** | File Fetch | 50 | 1 hour |
| | AI Scans | 100 | 1 day |

*(Note: During development (`NODE_ENV !== 'production'`), these limits are automatically loosened to facilitate testing without artificial blockers.)*

## Architecture

**Server-Side Verification Strategy**  
We leverage `getUserProfile` during endpoint execution instead of relying on any data embedded in the original request body. This completely mitigates plan-spoofing vectors. Because we only process server-validated tokens from the supabase session payload against our own admin connection to the DB, authorization is fully isolated.

**Upstash Key Strategy**  
By using the pattern `${plan}:${userId}`, we ensure that if a user upgrades their plan mid-window, their new limits kick off cleanly against their new rate-limiting key, instantly unblocking them without needing complex cache invalidation.

**Production vs Development Behavior**
If the Redis cluster is unreachable or missing config:
- **Production**: Operations *fail closed* meaning limits immediately hit `remaining: 0`. This protects AI credits over API uptime in catastrophe scenarios.
- **Development**: Operations *fail open* natively bypassing rate limits, allowing devs to work normally without necessarily needing an active Upstash cluster initialized locally. 

## Known Limitations
- Current limits map precisely to the requirements and there's no UI visualization currently showing a user exactly how many requests they have remaining out of their daily pool (other than "Limit Reached").

## Next Recommended Phase
**Phase 7A — Organization Structure Foundation**  
The underlying architecture is built and gated around individual developer usage. Adding Team capabilities will allow the builder plan to reach scale.
