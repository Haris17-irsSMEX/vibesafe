/**
 * GET /api/auth/github/callback
 *
 * Handles the GitHub OAuth callback for repository authorization.
 * - Validates CSRF state
 * - Exchanges code for access token
 * - Encrypts and stores token in connected_repos table
 * - Completely isolated from Supabase Auth callback at /auth/callback
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  exchangeCodeForToken,
  getGitHubUserProfile,
} from '@/services/github/GitHubOAuthService'
import { encryptToken } from '@/lib/security/encryption'
import { rateLimitAuth } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  // Rate limiting (IP based)
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown-ip'
  const rateLimit = await rateLimitAuth(ip)
  if (!rateLimit.success) {
    console.warn(`[github-callback] Rate limit exceeded for IP: ${ip}`)
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const githubError = searchParams.get('error')

  // Safe diagnostic log — never logs code, token, or secret
  const callbackHost = (() => {
    try { return new URL(request.url).hostname } catch { return 'unknown' }
  })()
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      `[github-callback] received: host=${callbackHost}, codePresent=${!!code}, statePresent=${!!state}, githubError=${githubError ?? 'none'}, clientIdSet=${!!process.env.GITHUB_CLIENT_ID}`
    )
  }

  // Handle user-denied access
  if (githubError) {
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=github_denied', request.url)
    )
  }

  // Validate required params
  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=invalid_callback', request.url)
    )
  }

  // Validate CSRF state cookie
  const storedState = request.cookies.get('github_oauth_state')?.value
  if (!storedState || storedState !== state) {
    console.warn('[github-callback] State mismatch — CSRF validation failed')
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=state_mismatch', request.url)
    )
  }

  // Verify Supabase session — user must still be authenticated
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Exchange code → access token (server-side only, secret never exposed)
  let tokenData: Awaited<ReturnType<typeof exchangeCodeForToken>>
  try {
    tokenData = await exchangeCodeForToken(code)
  } catch (err) {
    console.error('[github-callback] Token exchange failed:', err instanceof Error ? err.message : 'Unknown error')
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=token_exchange_failed', request.url)
    )
  }

  // Fetch GitHub profile to confirm token is valid and get github_user_id
  let githubProfile: Awaited<ReturnType<typeof getGitHubUserProfile>>
  try {
    githubProfile = await getGitHubUserProfile(tokenData.access_token)
  } catch (err) {
    console.error('[github-callback] GitHub profile fetch failed:', err instanceof Error ? err.message : 'Unknown error')
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=token_exchange_failed', request.url)
    )
  }

  // Encrypt before storing — never store plaintext token
  let encryptedToken: string
  try {
    encryptedToken = await encryptToken(tokenData.access_token)
  } catch (err) {
    console.error('[github-callback] Token encryption failed:', err instanceof Error ? err.message : 'Unknown error')
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=token_save_failed', request.url)
    )
  }

  // Store using service role to bypass RLS
  const adminClient = createSupabaseAdminClient()

  // Upsert: one GitHub connection per user (replace if reconnecting)
  const { error: upsertError } = await adminClient.from('connected_repos').upsert(
    {
      user_id: user.id,
      github_user_id: githubProfile.id,
      github_login: githubProfile.login,
      github_token: encryptedToken,
      token_scope: tokenData.scope,
      connected_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (upsertError) {
    const userIdPrefix = user.id.split('-')[0]
    console.error('[github-callback] save failed', {
      userIdPrefix,
      githubLogin: githubProfile.login,
      tokenReceived: Boolean(tokenData.access_token),
      errorCode: upsertError?.code,
      errorMessage: upsertError?.message
    })
    return NextResponse.redirect(
      new URL(`/dashboard/connect?error=token_save_failed&details=${encodeURIComponent(upsertError?.message || 'unknown')}`, request.url)
    )
  }

  console.log(`[github-callback] Success: github_login=${githubProfile.login}, user_id=[redacted]`)

  // Clear the state cookie and redirect to success
  const response = NextResponse.redirect(
    new URL('/dashboard/connect?success=true', request.url)
  )
  response.cookies.delete('github_oauth_state')
  return response
}
