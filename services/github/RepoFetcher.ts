/**
 * RepoFetcher
 *
 * Server-side only. Fetches repository metadata from the GitHub API
 * using a decrypted access token. Never returns the raw token.
 * Never exposes GitHub error details to the client.
 */

export interface SafeRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  updated_at: string
  owner_login: string
}

export type FetchReposResult =
  | { ok: true; repos: SafeRepo[] }
  | { ok: false; reason: 'invalid_token' | 'rate_limited' | 'network_error' | 'unknown' }

/**
 * Fetch all repositories accessible to the authenticated GitHub user.
 * Uses affiliation=owner,collaborator,organization_member to include all repos.
 * Returns only safe metadata — never the token, never raw API error bodies.
 */
export async function fetchUserRepositories(
  accessToken: string
): Promise<FetchReposResult> {
  let response: Response

  try {
    response = await fetch(
      'https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        // Abort after 10 seconds to avoid holding server threads
        signal: AbortSignal.timeout(10_000),
      }
    )
  } catch (err) {
    // Network or timeout error — never log the token
    console.error('[RepoFetcher] Network error fetching repositories')
    return { ok: false, reason: 'network_error' }
  }

  if (response.status === 401) {
    return { ok: false, reason: 'invalid_token' }
  }

  if (response.status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining')
    if (remaining === '0') {
      return { ok: false, reason: 'rate_limited' }
    }
    return { ok: false, reason: 'invalid_token' }
  }

  if (!response.ok) {
    console.error('[RepoFetcher] Unexpected GitHub API status:', response.status)
    return { ok: false, reason: 'unknown' }
  }

  let raw: unknown
  try {
    raw = await response.json()
  } catch {
    return { ok: false, reason: 'unknown' }
  }

  if (!Array.isArray(raw)) {
    return { ok: false, reason: 'unknown' }
  }

  // Extract only safe metadata — drop any sensitive fields
  const repos: SafeRepo[] = raw
    .filter(
      (r): r is Record<string, unknown> =>
        typeof r === 'object' && r !== null
    )
    .map((r) => ({
      id: typeof r.id === 'number' ? r.id : 0,
      name: typeof r.name === 'string' ? r.name : '',
      full_name: typeof r.full_name === 'string' ? r.full_name : '',
      private: typeof r.private === 'boolean' ? r.private : false,
      html_url: typeof r.html_url === 'string' ? r.html_url : '',
      default_branch:
        typeof r.default_branch === 'string' ? r.default_branch : 'main',
      updated_at:
        typeof r.updated_at === 'string' ? r.updated_at : new Date().toISOString(),
      owner_login:
        r.owner !== null &&
        typeof r.owner === 'object' &&
        'login' in (r.owner as object) &&
        typeof (r.owner as Record<string, unknown>).login === 'string'
          ? (r.owner as Record<string, unknown>).login as string
          : '',
    }))
    .filter((r) => r.id !== 0 && r.name !== '')

  return { ok: true, repos }
}
