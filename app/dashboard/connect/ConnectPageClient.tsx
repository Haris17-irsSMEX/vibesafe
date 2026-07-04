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
  AlertTriangle
} from 'lucide-react'
import type { SafeRepo } from '@/services/github/RepoFetcher'
import { GlowCard, GlassPanel } from '@/components/ui/glow-card'
import { cn } from '@/lib/utils'
import { AppPageContainer, AppPageHeader } from '@/components/layout/app-page'

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

// ─── Error message map ────────────────────────────────────────────────────────
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  github_denied: 'GitHub authorization was denied. Please try again.',
  invalid_callback: 'Invalid callback parameters. Please try again.',
  state_mismatch: 'Security validation failed. Please start the connection again.',
  token_exchange_failed: 'Failed to complete GitHub authorization. Please try again.',
  token_save_failed: 'GitHub token was received but could not be saved. Please try again.',
  github_not_configured: 'GitHub repository connection is not configured. Please contact support.',
}

const REPO_ERROR_MESSAGES: Record<string, string> = {
  invalid_token: 'GitHub connection expired. Reconnect to refresh access.',
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
    <GlowCard className="group flex flex-col gap-3 p-5 transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitFork className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
              {repo.name}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{repo.full_name}</p>
        </div>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${repo.full_name} on GitHub`}
          className="shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap items-center gap-2 mt-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
            repo.private
              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          )}
        >
          {repo.private ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          {repo.private ? 'Private' : 'Public'}
        </span>

        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
          <GitBranch className="h-3 w-3" />
          {repo.default_branch}
        </span>

        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 ml-auto">
          <Clock className="h-3 w-3" />
          {formatRelative(repo.updated_at)}
        </span>
      </div>

      {/* Scan error alert */}
      {scanError && (
        <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
          <p className="text-xs text-red-400">{scanError}</p>
        </div>
      )}

      {/* Start Scan button */}
      <button
        onClick={handleStartScan}
        disabled={isScanning}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2.5 text-sm font-medium text-primary transition-all hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-50"
      >
        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating scan…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Start AI Scan
          </>
        )}
      </button>
    </GlowCard>
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
    <AppPageContainer>
      <AppPageHeader
        title="Connect GitHub"
        description="Authorize CtrlCode to access repositories for read-only security analysis."
      />

      {/* ── Alerts ── */}
      {oauthError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-400">{oauthError}</p>
        </div>
      )}

      {disconnectError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-400">{disconnectError}</p>
        </div>
      )}

      {justConnected && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-400">
            GitHub account successfully connected! CtrlCode can now access your repositories.
          </p>
        </div>
      )}

      {disconnectSuccess && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-zinc-400" />
          <p className="text-sm text-zinc-300">GitHub disconnected successfully.</p>
        </div>
      )}

      {repoErrorMessage && repoError !== 'invalid_token' && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-sm text-amber-400">{repoErrorMessage}</p>
        </div>
      )}

      {connected && repoError === 'invalid_token' && (
        <div role="alert" className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/10 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="flex-1">
              <p className="text-base font-semibold text-amber-500">GitHub connection expired</p>
              <p className="mt-2 text-sm text-amber-400/80">
                Your GitHub token has expired or been revoked. Reconnect to restore repository access and resume scanning.
              </p>
            </div>
          </div>
          <div className="mt-6">
            <a
              href="/api/auth/github"
              id="reconnect-github-expired-btn"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-amber-500 px-5 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-400 shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="h-4 w-4" />
              Reconnect GitHub
            </a>
          </div>
        </div>
      )}

      {/* ── Connection Card ── */}
      <GlassPanel className="p-0 border-white/10 overflow-hidden mb-12">
        {connected ? (
          /* ── CONNECTED STATE ── */
          <div className="p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30">
                    <GithubIcon className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background border-2 border-background">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">GitHub Connected</h2>
                  {githubLogin && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Authorized as{' '}
                      <a
                        href={`https://github.com/${githubLogin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-white underline-offset-4 hover:underline"
                      >
                        @{githubLogin}
                      </a>
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto border-t border-white/5 pt-4 sm:border-0 sm:pt-0">
                <a
                  href="/api/auth/github"
                  id="reconnect-github-btn"
                  className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </a>

                <button
                  id="disconnect-github-btn"
                  onClick={handleDisconnect}
                  disabled={isDisconnecting || isPending}
                  className="inline-flex h-10 flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 text-sm font-medium text-red-500 transition-all hover:bg-red-500 hover:text-white disabled:pointer-events-none disabled:opacity-50"
                >
                  {isDisconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2 rounded-xl bg-black/40 border border-white/5 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <Shield className="h-4 w-4" />
                  <span className="text-sm font-semibold">Scopes Authorized</span>
                </div>
                <code className="text-xs text-muted-foreground">repo, read:user</code>
              </div>
              {connectedAt && (
                <div className="flex flex-col gap-2 rounded-xl bg-black/40 border border-white/5 p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-semibold">Connected Since</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDate(connectedAt)}</span>
                </div>
              )}
              <div className="flex flex-col gap-2 rounded-xl bg-black/40 border border-white/5 p-4">
                <div className="flex items-center gap-2 text-primary">
                  <GitFork className="h-4 w-4" />
                  <span className="text-sm font-semibold">Accessible Repos</span>
                </div>
                <span className="text-xs text-muted-foreground">{repositories.length} found</span>
              </div>
            </div>

            <div className="mt-6 flex items-start gap-3 rounded-lg bg-primary/5 border border-primary/10 px-4 py-3">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-xs text-primary/80">
                <strong>Read-only access:</strong> CtrlCode only reads code to perform security scans. It never writes, pushes, or modifies your repositories.
              </p>
            </div>
          </div>
        ) : (
          /* ── NOT CONNECTED STATE ── */
          <div className="p-8 sm:p-12 text-center flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10 mb-6 relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping opacity-20" />
              <GithubIcon className="h-10 w-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Connect GitHub Repository
            </h2>
            <p className="text-base text-muted-foreground max-w-md mx-auto mb-8">
              Authorize CtrlCode to securely access your codebase and run AI-powered security scans.
            </p>

            <ul className="mb-10 space-y-3 text-left max-w-sm mx-auto">
              {[
                'Read-only access to repositories',
                'Identifies vulnerabilities automatically',
                'Never writes or modifies your code',
              ].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                  <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </ul>

            <a
              id="connect-github-btn"
              href="/api/auth/github"
              className="inline-flex h-12 w-full sm:w-auto min-w-[240px] items-center justify-center gap-3 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground transition-all hover:bg-primary-hover shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]"
            >
              <GithubIcon className="h-5 w-5" />
              Connect GitHub
            </a>
            <p className="mt-4 text-xs text-zinc-500">
              You will be redirected to GitHub to authorize access securely.
            </p>
          </div>
        )}
      </GlassPanel>

      {/* ── Repository Grid ── */}
      {connected && !repoError && repositories.length > 0 && (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-3">
              Your Repositories
              <span className="inline-flex items-center rounded-md bg-white/10 px-2 py-0.5 text-xs font-medium text-zinc-300">
                {repositories.length}
              </span>
            </h2>
            <div className="relative w-64 hidden sm:block">
              <input type="text" placeholder="Filter repositories..." className="w-full h-9 bg-card border border-white/5 rounded-md px-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-primary/50" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {repositories.map((repo) => (
              <RepoCard key={repo.id} repo={repo} />
            ))}
          </div>
        </div>
      )}

      {/* Connected but no repos (empty state) */}
      {connected && !repoError && repositories.length === 0 && (
        <div className="rounded-xl border border-white/5 bg-card p-12 text-center shadow-sm">
          <GitFork className="mx-auto h-10 w-10 text-zinc-500 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No repositories found</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
            We couldn&apos;t find any repositories accessible with the current GitHub authorization. Check your GitHub permissions and try refreshing.
          </p>
        </div>
      )}
    </AppPageContainer>
  )
}
