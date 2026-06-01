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
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import {
  exchangeCodeForToken,
  getGitHubUserProfile,
} from '@/services/github/GitHubOAuthService'
import { encryptToken } from '@/lib/security/encryption'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const githubError = searchParams.get('error')

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

  try {
    // Exchange code → access token (server-side only, secret never exposed)
    const tokenData = await exchangeCodeForToken(code)

    // Fetch GitHub profile to confirm token is valid and get github_user_id
    const githubProfile = await getGitHubUserProfile(tokenData.access_token)

    // Encrypt before storing — never store plaintext token
    const encryptedToken = await encryptToken(tokenData.access_token)

    // Store using service role to bypass RLS
    const adminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Upsert: one GitHub connection per user (update if reconnecting)
    await adminClient.from('connected_repos').upsert(
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

    // Clear the state cookie
    const response = NextResponse.redirect(
      new URL('/dashboard/connect?success=true', request.url)
    )
    response.cookies.delete('github_oauth_state')
    return response
  } catch (err) {
    console.error('[GitHub callback] Error:', err instanceof Error ? err.message : 'Unknown error')
    return NextResponse.redirect(
      new URL('/dashboard/connect?error=token_exchange_failed', request.url)
    )
  }
}
