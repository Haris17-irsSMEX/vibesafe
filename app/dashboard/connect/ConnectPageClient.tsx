'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  AlertCircle,
  GitBranch,
  Shield,
  Lock,
  Unlock,
  ExternalLink,
  RefreshCw,
  GitFork,
  Clock,
  Loader2,
  Play,
} from 'lucide-react'
import type { SafeRepo } from '@/services/github/RepoFetcher'

// ─── GitHub icon (inline SVG — no extra dependency) ─────────────────────────
function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  )
}

// ─── Error message map ────────────────────────────────────────────────────────
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  github_denied: 'GitHub authorization was denied. Please try again.',
  invalid_callback: 'Invalid callback parameters. Please try again.',
  state_mismatch: 'Security validation failed. Please start the connection again.',
  token_exchange_failed: 'Failed to complete GitHub authorization. Please try again.',
}

const REPO_ERROR_MESSAGES: Record<string, string> = {
  invalid_token: 'Your GitHub token has expired or been revoked. Please reconnect GitHub.',
  rate_limited: 'GitHub rate limit reached. Please try again in a few minutes.',
  network_error: 'Unable to reach GitHub. Please check your connection and try again.',
  unknown: 'Unable to load repositories. Please try reconnecting GitHub.',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`
  const years = Math.floor(months / 12)
  return `${years} year${years > 1 ? 's' : ''} ago`
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ConnectPageClientProps {
  connected: boolean
  githubLogin: string | null
  connectedAt: string | null
  repositories: SafeRepo[]
  repoError: 'invalid_token' | 'rate_limited' | 'network_error' | 'unknown' | null
  successParam: string | null
  errorParam: string | null
}

// ─── Repo Card ────────────────────────────────────────────────────────────────
function RepoCard({ repo }: { repo: SafeRepo }) {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  async function handleStartScan() {
    if (isScanning) return
    setIsScanning(true)
    setScanError(null)

    try {
      const res = await fetch('/api/scans/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: repo.id,
          repoName: repo.name,
          repoFullName: repo.full_name,
          repoUrl: repo.html_url,
          defaultBranch: repo.default_branch,
        }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        setScanError(
          typeof json.error === 'string'
            ? json.error
            : 'Unable to create scan. Please try again.'
        )
        return
      }

      // Redirect to scan status page
      router.push(`/scan/${json.scanId}`)
    } catch {
      setScanError('Network error. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitFork className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate text-sm font-semibold text-slate-900">
              {repo.name}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{repo.full_name}</p>
        </div>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${repo.full_name} on GitHub`}
          className="shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
            repo.private
              ? 'bg-amber-100 text-amber-700'
              : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {repo.private ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          {repo.private ? 'Private' : 'Public'}
        </span>

        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
          <GitBranch className="h-3 w-3" />
          {repo.default_branch}
        </span>

        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          <Clock className="h-3 w-3" />
          Updated {formatRelative(repo.updated_at)}
        </span>
      </div>

      {/* Scan error alert */}
      {scanError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
          <p className="text-xs text-red-700">{scanError}</p>
        </div>
      )}

      {/* Start Scan button */}
      <button
        onClick={handleStartScan}
        disabled={isScanning}
        className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-60"
      >
        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating scan…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Start Scan
          </>
        )}
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ConnectPageClient({
  connected,
  githubLogin,
  connectedAt,
  repositories,
  repoError,
  successParam,
  errorParam,
}: ConnectPageClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [disconnectError, setDisconnectError] = useState<string | null>(null)
  const [disconnectSuccess, setDisconnectSuccess] = useState(false)

  const oauthError = errorParam ? (OAUTH_ERROR_MESSAGES[errorParam] ?? 'An error occurred.') : null
  const repoErrorMessage = repoError ? REPO_ERROR_MESSAGES[repoError] : null
  const justConnected = successParam === 'true'

  async function handleDisconnect() {
    if (isDisconnecting) return
    setIsDisconnecting(true)
    setDisconnectError(null)

    try {
      const res = await fetch('/api/auth/github/disconnect', { method: 'POST' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setDisconnectError(
          typeof json.error === 'string'
            ? json.error
            : 'Failed to disconnect GitHub account.'
        )
        return
      }
      setDisconnectSuccess(true)
      startTransition(() => {
        router.push('/dashboard/connect?disconnected=true')
        router.refresh()
      })
    } catch {
      setDisconnectError('Network error. Please try again.')
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div className="max-w-4xl">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Connect GitHub</h1>
        <p className="mt-1 text-sm text-slate-600">
          Authorize VibeSafe to access your repositories for security scanning.
        </p>
      </div>

      {/* ── Alerts ── */}

      {/* OAuth error (from GitHub redirect) */}
      {oauthError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{oauthError}</p>
        </div>
      )}

      {/* Disconnect error */}
      {disconnectError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{disconnectError}</p>
        </div>
      )}

      {/* Just-connected success banner */}
      {justConnected && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
        >
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-700">
            GitHub account successfully connected! VibeSafe can now access your repositories.
          </p>
        </div>
      )}

      {/* Disconnected success */}
      {disconnectSuccess && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
          <p className="text-sm text-slate-700">GitHub disconnected successfully.</p>
        </div>
      )}

      {/* Repository fetch error */}
      {repoErrorMessage && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <p className="text-sm text-amber-700">{repoErrorMessage}</p>
        </div>
      )}

      {/* ── Connection Card ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {connected ? (
          /* ── CONNECTED STATE ── */
          <div className="p-6">
            {/* Status header */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">GitHub Connected</h2>
                {githubLogin && (
                  <p className="text-sm text-slate-600">
                    Authorized as{' '}
                    <a
                      href={`https://github.com/${githubLogin}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-slate-900 underline-offset-2 hover:underline"
                    >
                      @{githubLogin}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Meta info */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <Shield className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-slate-700">Repository access authorized</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <GitBranch className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-slate-700">
                  Scopes:{' '}
                  <code className="rounded bg-slate-200 px-1 font-mono text-xs">
                    repo, read:user
                  </code>
                </span>
              </div>
              {connectedAt && (
                <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-700">
                    Connected {formatDate(connectedAt)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <GitFork className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-700">
                  {repositories.length} repositor{repositories.length === 1 ? 'y' : 'ies'} accessible
                </span>
              </div>
            </div>

            {/* Security note */}
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <p className="text-xs text-indigo-700">
                VibeSafe only reads code. It never writes, pushes, or modifies repositories.
              </p>
            </div>

            {/* Reconnect / Disconnect actions */}
            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
              <a
                href="/api/auth/github"
                id="reconnect-github-btn"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Reconnect GitHub
              </a>

              <button
                id="disconnect-github-btn"
                onClick={handleDisconnect}
                disabled={isDisconnecting || isPending}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-200 px-4 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                {isDisconnecting ? 'Disconnecting…' : 'Disconnect GitHub'}
              </button>
            </div>
          </div>
        ) : (
          /* ── NOT CONNECTED STATE ── */
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                <GithubIcon className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Connect GitHub Repository
                </h2>
                <p className="text-sm text-slate-600">
                  Authorize VibeSafe to scan your code for vulnerabilities.
                </p>
              </div>
            </div>

            <ul className="mt-6 space-y-2">
              {[
                'Read access to your repositories',
                'Identifies security vulnerabilities automatically',
                'Never writes, pushes, or modifies your code',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>

            {/* Security note */}
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
              <p className="text-xs text-indigo-700">
                VibeSafe only reads code. It never writes, pushes, or modifies repositories.
              </p>
            </div>

            <div className="mt-6">
              <a
                id="connect-github-btn"
                href="/api/auth/github"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-6 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <GithubIcon className="h-5 w-5" />
                Connect GitHub
              </a>
              <p className="mt-3 text-center text-xs text-slate-500">
                You will be redirected to GitHub to authorize access.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Repository Grid ── */}
      {connected && !repoError && repositories.length > 0 && (
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              Your Repositories
              <span className="ml-2 inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-sm font-medium text-slate-600">
                {repositories.length}
              </span>
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {repositories.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </div>
      )}

      {/* Connected but no repos (empty state) */}
      {connected && !repoError && repositories.length === 0 && (
        <div className="mt-8 rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <GitFork className="mx-auto h-8 w-8 text-slate-300" />
          <h3 className="mt-3 text-sm font-semibold text-slate-900">No repositories found</h3>
          <p className="mt-1 text-sm text-slate-500">
            No repositories are accessible with the current GitHub authorization.
          </p>
        </div>
      )}
    </div>
  )
}
