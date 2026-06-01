# Authentication Audit Report

## 1. Current Auth Architecture
The application uses Supabase Auth mapped completely to Next.js 14 App Router server/client paradigms.
- **Client Components** (`app/login/page.tsx`, `components/layout/sidebar.tsx`) use `@supabase/ssr` `createBrowserClient` to initiate login via OAuth (`signInWithOAuth`) and handle logout (`signOut()`).
- **Server Components** and the API routes (`app/auth/callback/route.ts`) use `@supabase/ssr` `createServerClient` to securely retrieve session context from cookies and process token exchanges.
- **User Sync**: A successful GitHub login redirects to the callback route, which securely retrieves the new user context. It then uses a highly privileged Supabase client (`service_role` key) to safely `upsert` the user into the database `users` table without violating RLS policies or exposing elevated privileges to the frontend.

## 2. Middleware Behavior
- `middleware.ts` runs on all relevant requests and defers execution to `lib/supabase/middleware.ts`.
- The middleware actively refreshes stale sessions using `supabase.auth.getUser()`, which transparently validates and rotates JWTs if necessary, appending rotated cookies to both the Request object (for downstream Server Components) and the final Response.
- It intercepts `/login` traffic: if an authenticated session exists, it immediately redirects the user to `/dashboard` to prevent repeated logins.

## 3. Protected Route Strategy
The architecture relies on a "defense-in-depth" approach:
1. **Middleware-Level Check**: Protects `/dashboard`, `/results`, `/scan`, and `/settings`. Unauthenticated traffic is instantly redirected to `/login` via a `307 Temporary Redirect` before the route component is ever invoked.
2. **Component-Level Check**: Protected pages double-check authentication (`supabase.auth.getUser()`) server-side and perform `redirect("/login")` in case the session fails or the token was maliciously invalidated after the middleware phase.

## 4. Session Lifecycle
- **Creation**: Triggered by OAuth provider (GitHub), processed safely server-side in `/auth/callback`.
- **Persistence**: Managed through Supabase cookies synchronized natively by the `@supabase/ssr` SDK on both the Server and Client.
- **Refresh**: Guaranteed by invoking `getUser()` in `middleware.ts` which intrinsically handles silent session renewals.
- **Destruction**: Exclusively handled via `supabase.auth.signOut()` in the `Sidebar` logout interaction, which deletes the persistent session cookies. Subsequent router refreshes reflect the logged-out state instantly.

## 5. Remaining Risks
- The current user sync assumes a `users` table exists in Supabase. If the table hasn't been migrated or doesn't have an `email` or `plan` column, the upsert in `/auth/callback` will silently fail or throw a runtime SQL error.
- Error states in OAuth configurations (like mismatched callback URLs in Supabase Dashboards) are routed to `/login?error=...` but rely on the end-user correctly setting up Supabase.

## 6. Recommended Next Phase
With the authentication lifecycle deeply validated and stable, the infrastructure is ready for:
1. **Database Readiness Verification**: Confirming the Supabase schema and migrations for the `users` table are correct.
2. **GitHub API Integration**: Extending the auth system to capture GitHub Installation tokens or handling OAuth scopes specifically for repository access.
