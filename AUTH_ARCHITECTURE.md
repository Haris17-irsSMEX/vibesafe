# Authentication Architecture

This document describes the authentication flow and architecture implemented for VibeSafe.

## Auth Flow
1. **Unauthenticated User**: Navigates to a protected route (e.g., `/dashboard`) and is intercepted by `middleware.ts`.
2. **Redirect to Login**: The middleware redirects the user to `/login`.
3. **Login Page**: User clicks "Sign in with GitHub".
4. **OAuth Flow**: Supabase handles the OAuth flow with GitHub and redirects to `/auth/callback?code=...`.
5. **Callback Route**: `app/auth/callback/route.ts` intercepts the code, exchanges it for a Supabase session using `@supabase/ssr`, and sets the session cookies.
6. **Authenticated User**: The user is redirected to the `/dashboard`.

## Middleware Behavior
- `middleware.ts` runs on all requests (except static files).
- It calls `updateSession` from `lib/supabase/middleware.ts`, which refreshes the Supabase token and synchronizes cookies.
- It checks if the current path starts with `/dashboard`, `/results`, or `/settings`.
- If the path is protected and no valid session is found, it intercepts the request and redirects to `/login`.

## Session Lifecycle
- Supabase SSR manages sessions through cookies.
- `updateSession` continuously synchronizes the session tokens between the client and server on every request.
- Both Client Components (`createClient` in `lib/supabase/client.ts`) and Server Components (`createClient` in `lib/supabase/server.ts`) use the synchronized cookies.

## Protected Routes
- `/dashboard`
- `/dashboard/connect`
- `/results`
- `/settings`

## Known Limitations
- The current implementation only supports GitHub OAuth.
- No role-based access control (RBAC) is implemented yet (all authenticated users have the same access level).
- Wait states and hydration edge cases during session resolution on the client may need further UI polish.
