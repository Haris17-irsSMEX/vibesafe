# Phase 3C — Upstash Rate Limiting & Credit Protection Audit

## Overview
To protect DeepSeek API credits and prevent abuse of the scanning infrastructure, server-side rate limiting has been integrated using Upstash Redis. Limits are applied per authenticated user at the edge/server level before any expensive operations begin.

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `package.json` | **MODIFIED** | Added `@upstash/redis` and `@upstash/ratelimit`. |
| `lib/rate-limit.ts` | **NEW** | Provides robust, lazy-initialized Redis rate limiters for file fetching and AI scanning. Includes fail-closed logic for production. |
| `app/api/scans/fetch-files/route.ts` | **MODIFIED** | Intercepts requests immediately after authentication to apply a 10 requests/hour limit. |
| `app/api/scans/run-ai/route.ts` | **MODIFIED** | Intercepts requests immediately after authentication to apply a 5 requests/day limit. |

## Rate Limits Configured

1. **File Fetching (`fetch-files`)**
   - **Limit:** 10 requests per 1 hour.
   - **Scope:** Per authenticated Supabase `user_id`.
   - **Error Message:** "Too many file fetch attempts. Try again later."

2. **DeepSeek AI Scanning (`run-ai`)**
   - **Limit:** 5 requests per 1 day.
   - **Scope:** Per authenticated Supabase `user_id`.
   - **Error Message:** "Daily AI scan limit reached. Try again tomorrow."

## Security & Architecture Notes

- **Fail-Closed in Production**: If the Upstash Redis credentials are not configured or Redis is down in the production environment, the limiters fail *closed* (blocking the request). This ensures that a temporary Redis outage doesn't result in unlimited API credit consumption.
- **Fail-Open in Development**: If no credentials are found in the local development environment, the limiters fail *open* to allow local testing without forcing developers to spin up a Redis instance.
- **Strict User Scoping**: Rate limit tokens rely exclusively on the `user.id` extracted from the verified Supabase session. Client-provided IDs in the request body are ignored.
- **Clean UX**: The API endpoints return graceful JSON error responses (e.g., `{ success: false, error: "..." }`) rather than raw 500 stack traces, which are intercepted by `ScanStatusClient.tsx` to show a clean banner.

## Known Limitations
- The limits are hardcoded. If dynamic limits based on user subscription tiers (e.g., Free vs Pro) are needed in the future, `lib/rate-limit.ts` will need to query the database before applying a specific limit bucket.

## Next Recommended Phase
**Phase 3D / 4A — UI Visualization for Scan Results**
With the pipeline fully functional, secured, and rate-limited, the application is ready to visually render the findings stored in `scan_results`.
