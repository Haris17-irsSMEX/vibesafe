/**
 * RepoFetcher
 *
 * Server-side only. Fetches repository metadata and file contents
 * from the GitHub API using a decrypted access token.
 * Never returns the raw token. Never exposes GitHub error details to the client.
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const GITHUB_API = 'https://api.github.com'

const ALLOWED_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py',
  '.env', '.json', '.yaml', '.yml', '.toml',
])

const EXCLUDED_DIRS = [
  'node_modules/', '.git/', '.next/', 'dist/', 'build/',
  'coverage/', 'vendor/', '__pycache__/', '.turbo/', '.vercel/',
  '.cache/', '.output/',
]

const MAX_FILES_PER_SCAN = 50
const MAX_FILE_SIZE_BYTES = 100_000 // 100KB
const MAX_STORED_CONTENT_CHARS = 8_000
const FETCH_TIMEOUT_MS = 60_000 // 60 seconds total

// ─── Types (repo listing — existing) ─────────────────────────────────────────

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

// ─── Types (file fetching — new) ─────────────────────────────────────────────

export interface TreeEntry {
  path: string
  type: 'blob' | 'tree'
  size?: number
}

export interface FetchedFile {
  path: string
  content: string
}

export type FetchTreeResult =
  | { ok: true; entries: TreeEntry[] }
  | { ok: false; reason: 'invalid_token' | 'rate_limited' | 'not_found' | 'network_error' | 'unknown' }

export type FetchFileResult =
  | { ok: true; content: string }
  | { ok: false; reason: 'invalid_token' | 'rate_limited' | 'not_found' | 'too_large' | 'binary' | 'network_error' | 'unknown' }

export type FetchRelevantFilesResult =
  | { ok: true; files: FetchedFile[] }
  | { ok: false; reason: 'invalid_token' | 'rate_limited' | 'not_found' | 'network_error' | 'unknown' }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function handleGitHubStatus(status: number, headers: Headers): 'invalid_token' | 'rate_limited' | 'not_found' | 'unknown' | null {
  if (status === 401) return 'invalid_token'
  if (status === 403) {
    const remaining = headers.get('x-ratelimit-remaining')
    return remaining === '0' ? 'rate_limited' : 'invalid_token'
  }
  if (status === 404) return 'not_found'
  if (!status.toString().startsWith('2')) return 'unknown'
  return null
}

function isExcludedPath(path: string): boolean {
  return EXCLUDED_DIRS.some((dir) => path.startsWith(dir) || path.includes(`/${dir}`))
}

function hasAllowedExtension(path: string): boolean {
  const lastDot = path.lastIndexOf('.')
  if (lastDot === -1) {
    // Special case: files like .env (no extension, just dot-prefixed name)
    const basename = path.split('/').pop() ?? ''
    return basename === '.env' || basename.startsWith('.env.')
  }
  const ext = path.slice(lastDot).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}

// ─── Fetch user repositories (existing) ──────────────────────────────────────

export async function fetchUserRepositories(
  accessToken: string
): Promise<FetchReposResult> {
  let response: Response

  try {
    response = await fetch(
      `${GITHUB_API}/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`,
      {
        headers: githubHeaders(accessToken),
        signal: AbortSignal.timeout(10_000),
      }
    )
  } catch {
    console.error('[RepoFetcher] Network error fetching repositories')
    return { ok: false, reason: 'network_error' }
  }

  if (response.status === 401) return { ok: false, reason: 'invalid_token' }
  if (response.status === 403) {
    const remaining = response.headers.get('x-ratelimit-remaining')
    return { ok: false, reason: remaining === '0' ? 'rate_limited' : 'invalid_token' }
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

  if (!Array.isArray(raw)) return { ok: false, reason: 'unknown' }

  const repos: SafeRepo[] = raw
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      id: typeof r.id === 'number' ? r.id : 0,
      name: typeof r.name === 'string' ? r.name : '',
      full_name: typeof r.full_name === 'string' ? r.full_name : '',
      private: typeof r.private === 'boolean' ? r.private : false,
      html_url: typeof r.html_url === 'string' ? r.html_url : '',
      default_branch: typeof r.default_branch === 'string' ? r.default_branch : 'main',
      updated_at: typeof r.updated_at === 'string' ? r.updated_at : new Date().toISOString(),
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

// ─── Fetch repository tree ───────────────────────────────────────────────────

/**
 * GET /repos/{owner}/{repo}/git/trees/{branch}?recursive=1
 * Returns the full file tree for a repository branch.
 */
export async function fetchRepositoryTree(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string
): Promise<FetchTreeResult> {
  let response: Response

  try {
    response = await fetch(
      `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      {
        headers: githubHeaders(accessToken),
        signal: AbortSignal.timeout(15_000),
      }
    )
  } catch {
    console.error('[RepoFetcher] Network error fetching tree')
    return { ok: false, reason: 'network_error' }
  }

  const errorReason = handleGitHubStatus(response.status, response.headers)
  if (errorReason) return { ok: false, reason: errorReason }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    return { ok: false, reason: 'unknown' }
  }

  if (typeof data !== 'object' || data === null || !('tree' in data)) {
    return { ok: false, reason: 'unknown' }
  }

  const tree = (data as Record<string, unknown>).tree
  if (!Array.isArray(tree)) return { ok: false, reason: 'unknown' }

  const entries: TreeEntry[] = tree
    .filter((e): e is Record<string, unknown> => typeof e === 'object' && e !== null)
    .filter((e) => typeof e.path === 'string' && typeof e.type === 'string')
    .map((e) => ({
      path: e.path as string,
      type: e.type as 'blob' | 'tree',
      size: typeof e.size === 'number' ? e.size : undefined,
    }))

  return { ok: true, entries }
}

// ─── Fetch single file content ───────────────────────────────────────────────

/**
 * GET /repos/{owner}/{repo}/contents/{path}
 * Returns file content, decoded from base64.
 */
export async function fetchFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<FetchFileResult> {
  let response: Response

  try {
    response = await fetch(
      `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`,
      {
        headers: githubHeaders(accessToken),
        signal: AbortSignal.timeout(10_000),
      }
    )
  } catch {
    return { ok: false, reason: 'network_error' }
  }

  const errorReason = handleGitHubStatus(response.status, response.headers)
  if (errorReason) return { ok: false, reason: errorReason }

  let data: unknown
  try {
    data = await response.json()
  } catch {
    return { ok: false, reason: 'unknown' }
  }

  if (typeof data !== 'object' || data === null) return { ok: false, reason: 'unknown' }

  const record = data as Record<string, unknown>

  // Check encoding — we only handle base64
  if (record.encoding !== 'base64' || typeof record.content !== 'string') {
    return { ok: false, reason: 'binary' }
  }

  // Check file size
  if (typeof record.size === 'number' && record.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: 'too_large' }
  }

  // Decode base64 content
  let decoded: string
  try {
    // GitHub returns base64 with newlines
    const clean = (record.content as string).replace(/\n/g, '')
    const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0))
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // Likely binary content that isn't valid UTF-8
    return { ok: false, reason: 'binary' }
  }

  // Truncate to max stored length
  const truncated = decoded.length > MAX_STORED_CONTENT_CHARS
    ? decoded.slice(0, MAX_STORED_CONTENT_CHARS)
    : decoded

  return { ok: true, content: truncated }
}

// ─── Fetch relevant files (orchestrator) ─────────────────────────────────────

/**
 * Fetches the repo tree, filters to security-relevant files,
 * then fetches content for each (up to MAX_FILES_PER_SCAN).
 * Enforces a total timeout of FETCH_TIMEOUT_MS.
 */
export async function fetchRelevantRepositoryFiles(
  accessToken: string,
  repoFullName: string,
  branch: string
): Promise<FetchRelevantFilesResult> {
  const [owner, repo] = repoFullName.split('/')
  if (!owner || !repo) {
    return { ok: false, reason: 'unknown' }
  }

  const startTime = Date.now()

  // 1. Fetch tree
  const treeResult = await fetchRepositoryTree(accessToken, owner, repo, branch)
  if (!treeResult.ok) {
    return { ok: false, reason: treeResult.reason }
  }

  // 2. Filter to relevant files
  const candidates = treeResult.entries
    .filter((e) => e.type === 'blob')
    .filter((e) => !isExcludedPath(e.path))
    .filter((e) => hasAllowedExtension(e.path))
    .filter((e) => !e.size || e.size <= MAX_FILE_SIZE_BYTES)
    .slice(0, MAX_FILES_PER_SCAN)

  // 3. Fetch content for each file (sequential to avoid rate limiting)
  const files: FetchedFile[] = []

  for (const candidate of candidates) {
    // Check total timeout
    if (Date.now() - startTime > FETCH_TIMEOUT_MS) {
      console.warn('[RepoFetcher] Total fetch timeout reached, returning partial results')
      break
    }

    const result = await fetchFileContent(accessToken, owner, repo, candidate.path, branch)

    if (result.ok) {
      files.push({ path: candidate.path, content: result.content })
    }
    // Skip files that fail (binary, too large, etc.) — don't abort the whole scan
  }

  return { ok: true, files }
}
