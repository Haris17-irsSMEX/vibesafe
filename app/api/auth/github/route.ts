/**
 * GET /api/auth/github
 *
 * Initiates GitHub OAuth flow for repository authorization.
 * User must be authenticated via Supabase first.
 * Completely separate from Supabase Auth.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildGitHubAuthorizationUrl } from '@/services/github/GitHubOAuthService'

export async function GET(request: NextRequest) {
  // Verify Supabase session exists before initiating GitHub OAuth
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Generate a cryptographically random state token to prevent CSRF
  const stateBytes = crypto.getRandomValues(new Uint8Array(16))
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Build the GitHub authorization URL — catch configuration errors gracefully
  let redirectUrl: string
  try {
    redirectUrl = buildGitHubAuthorizationUrl(state)
  } catch (err) {
    console.error(
      '[github-oauth] Failed to build authorization URL:',
      err instanceof Error ? err.message : 'Unknown error'
    )
    // Redirect back to connect page with a safe, user-visible error code
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=github_not_configured', request.url)
    )
  }

  // Store state in a short-lived cookie for verification in callback
  const response = NextResponse.redirect(redirectUrl)
  response.cookies.set('github_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10 minutes
    path: '/',
  })

  return response
}
