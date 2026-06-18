# Phase 5C — Complete Paddle Billing Settings & Portal Audit

## Overview
Phase 5C completes the Paddle billing integration. It polishes the user settings page, secures the checkout session creation, validates Paddle webhook signatures to safely manage user plans, and exposes a billing portal route for paid users to manage their subscriptions. 

## Files Inspected / Completed

| File | Status | Purpose |
|---|---|---|
| `app/settings/page.tsx` | **POLISHED** | Main settings page displaying account info, GitHub connection, plan, and usage stats. Uses robust server-side fetching with fallback defaults to never throw errors to the client. |
| `components/billing/PlanCard.tsx` | **POLISHED** | Renders the current plan and features. Includes safe upgrade buttons (Starter / Builder) and a "Manage Billing" button if a Paddle customer ID is present. Provides clean loading states (`Loader2`) and displays safe, human-readable errors. |
| `app/api/billing/checkout/route.ts` | **SECURED** | Generates Paddle checkout URLs. Fully verifies the user session. Only accepts strict plan strings (`starter` or `builder`). Maps securely to env variables (`PADDLE_STARTER_PRICE_ID`, `PADDLE_BUILDER_PRICE_ID`). Never trusts any price ID sent by the client. |
| `app/api/paddle/webhook/route.ts` | **SECURED** | Handles Paddle asynchronous events (`subscription.activated`, `subscription.updated`, `subscription.canceled`, `transaction.completed`). Protects against spoofing via HMAC-SHA256 signature verification (`timingSafeEqual`). Gracefully handles missing config without crashing. |
| `app/api/paddle/portal/route.ts` | **COMPLETED** | Allows a user to manage their subscription. Verifies user session and looks up their secure `paddle_customer_id` from the DB. Requests a portal session from Paddle and returns the URL. If the Paddle API is unavailable or config is missing, returns a safe `"Billing portal is not configured yet"` error. |
| `lib/db/users.ts` | **VERIFIED** | Centralizes DB interactions for plans, usage counts, and GitHub connection. All reads/writes bypass RLS using the admin client. Safely catches errors. |
| `migrations/006_create_users_table.sql` | **VERIFIED** | Defines the users table schema mapping Auth users to `plan`, `paddle_customer_id`, and `paddle_subscription_id`. |

## Security Summary

### Checkout Security
The client never passes a price ID to the backend. It only passes a simple string (`starter` or `builder`), which is safely mapped against server-side environment variables. Unauthenticated or malformed requests are cleanly rejected.

### Webhook Security
The webhook route reads the raw unparsed body to compute the HMAC-SHA256 hash using `PADDLE_WEBHOOK_SECRET`. It compares this with the `Paddle-Signature` header using a constant-time check (`timingSafeEqual`) to prevent timing attacks. Only verified webhook events are allowed to modify a user's plan.

### Billing Portal Status
The portal route requires authentication, reads the internal `paddle_customer_id` from the database (preventing users from accessing other users' portals), and proxies a request to Paddle. Failed responses are swallowed and transformed into friendly user-facing messages.

## Known Limitations
- The application currently relies on Paddle's managed checkout overlay.
- Webhooks must be configured properly in the Paddle Dashboard with the correct secret matching the `PADDLE_WEBHOOK_SECRET` environment variable for plan changes to work in production.
- If the application is running locally without a webhook forwarding tool (like ngrok or the Paddle CLI), plan updates via webhook will not occur in development.

## Next Recommended Phase
**Phase 6 — Plan-based Scan Limits**
Now that billing and settings are fully secure and operational, we can enforce usage limits depending on the user's active plan.
