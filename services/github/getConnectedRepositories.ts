/**
 * getConnectedRepositories
 *
 * Server-side ONLY loader for the /dashboard/connect page.
 * - Verifies Supabase session server-side
 * - Loads the connected_repos row for the current user
 * - Decrypts the GitHub token (server-side, never returned)
 * - Fetches repository metadata via GitHub API
 * - Returns only safe data — never the token, never raw errors
 */

import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/security/encryption'
import { fetchUserRepositories, type SafeRepo } from './RepoFetcher'

export type GetConnectedRepositoriesResult =
  | {
      connected: false
      githubLogin: null
      connectedAt: null
      repositories: []
      error: null
    }
  | {
      connected: true
      githubLogin: string
      connectedAt: string
      repositories: SafeRepo[]
      error: null
    }
  | {
      connected: true
      githubLogin: string
      connectedAt: string
      repositories: []
      error: 'invalid_token' | 'rate_limited' | 'network_error' | 'unknown'
    }

export async function getConnectedRepositories(): Promise<GetConnectedRepositoriesResult> {
  // 1. Verify Supabase session — never trust client-supplied user_id
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      connected: false,
      githubLogin: null,
      connectedAt: null,
      repositories: [],
      error: null,
    }
  }

  // 2. Load connected_repos row — select only needed columns, never return github_token
  const { data: connection, error: dbError } = await supabase
    .from('connected_repos')
    .select('github_login, connected_at, github_token')
    .eq('user_id', user.id)
    .maybeSingle()

  if (dbError) {
    console.error('[getConnectedRepositories] DB error:', dbError.message)
    return {
      connected: false,
      githubLogin: null,
      connectedAt: null,
      repositories: [],
      error: null,
    }
  }

  if (!connection) {
    return {
      connected: false,
      githubLogin: null,
      connectedAt: null,
      repositories: [],
      error: null,
    }
  }

  // 3. Decrypt token server-side — token never leaves the server
  let plainToken: string
  try {
    plainToken = await decryptToken(connection.github_token)
  } catch (err) {
    console.error('[getConnectedRepositories] Token decryption failed')
    return {
      connected: true,
      githubLogin: connection.github_login,
      connectedAt: connection.connected_at,
      repositories: [],
      error: 'invalid_token',
    }
  }

  // 4. Fetch repositories — token used here, then discarded
  const result = await fetchUserRepositories(plainToken)

  // plainToken goes out of scope here — it is never returned or logged

  if (!result.ok) {
    return {
      connected: true,
      githubLogin: connection.github_login,
      connectedAt: connection.connected_at,
      repositories: [],
      error: result.reason,
    }
  }

  return {
    connected: true,
    githubLogin: connection.github_login,
    connectedAt: connection.connected_at,
    repositories: result.repos,
    error: null,
  }
}
