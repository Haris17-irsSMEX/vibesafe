/**
 * GitHubOAuthService
 *
 * Server-side ONLY. Handles GitHub OAuth for repository authorization.
 * This is completely separate from Supabase Auth (user identity).
 *
 * Supabase Auth  → who is the user?
 * GitHub OAuth   → which repos can VibeSafe access?
 */

const GITHUB_OAUTH_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_API_URL = 'https://api.github.com'

export interface GitHubTokenResponse {
  access_token: string
  token_type: string
  scope: string
}

export interface GitHubUserProfile {
  id: number
  login: string
  name: string | null
  email: string | null
  avatar_url: string
}

export interface GitHubOAuthError {
  error: string
  error_description?: string
}

/**
 * Build the GitHub OAuth authorization URL.
 * Sends the user to GitHub to grant repo access.
 */
export function buildGitHubAuthorizationUrl(state: string): string {
  const clientId = process.env.GITHUB_CLIENT_ID
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID is not configured')
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'repo read:user',
    state,
    allow_signup: 'false',
  })

  return `${GITHUB_OAUTH_URL}?${params.toString()}`
}

/**
 * Exchange the authorization code for an access token.
 * Called from the server-side callback route only.
 */
export async function exchangeCodeForToken(
  code: string
): Promise<GitHubTokenResponse> {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured')
  }

  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`

  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    }),
  })

  if (!response.ok) {
    throw new Error(`GitHub token exchange failed: ${response.statusText}`)
  }

  const data = (await response.json()) as GitHubTokenResponse | GitHubOAuthError

  if ('error' in data) {
    throw new Error(
      data.error_description ?? `GitHub OAuth error: ${data.error}`
    )
  }

  return data as GitHubTokenResponse
}

/**
 * Fetch the GitHub user profile using an access token.
 * Verifies the token is valid and retrieves scope info.
 */
export async function getGitHubUserProfile(
  accessToken: string
): Promise<GitHubUserProfile> {
  const response = await fetch(`${GITHUB_API_URL}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user profile: ${response.statusText}`)
  }

  return response.json() as Promise<GitHubUserProfile>
}
