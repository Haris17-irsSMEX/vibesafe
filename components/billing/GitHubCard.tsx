'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Unlink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatSafeDate } from '@/lib/date'
import { GlowCard } from '@/components/ui/glow-card'

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

interface GitHubCardProps {
  connected: boolean
  githubLogin: string | null
  connectedAt: string | null
}

export function GitHubCard({
  connected,
  githubLogin,
  connectedAt,
}: GitHubCardProps) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDisconnect = async () => {
    if (disconnecting) return

    const confirmed = window.confirm(
      'Disconnect your GitHub account? You will need to reconnect before starting new scans.'
    )
    if (!confirmed) return

    setDisconnecting(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/github/disconnect', {
        method: 'POST',
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Failed to disconnect. Please try again.')
        setDisconnecting(false)
        return
      }

      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setDisconnecting(false)
    }
  }

  return (
    <GlowCard className="overflow-hidden rounded-2xl border-cc-border bg-cc-surface">
      <div className="border-b border-cc-border bg-cc-bg-secondary/80 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cc-border bg-cc-surface text-cc-muted">
            <GithubIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-cc-text">GitHub integration</h2>
            <p className="text-sm text-cc-muted">
              Repository access for CtrlCode reviews and scan execution.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-6 py-6">
        {connected && githubLogin ? (
          <>
            <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cc-border bg-cc-surface text-cc-text">
                    <GithubIcon className="h-6 w-6" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-cc-text">
                        @{githubLogin}
                      </p>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Connected
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-cc-muted">
                      Connected since {formatSafeDate(connectedAt, 'Not available')}
                    </p>
                    <p className="mt-3 max-w-lg text-xs leading-5 text-cc-subtle">
                      CtrlCode uses your GitHub connection to fetch repository files and metadata for security reviews. Sensitive tokens are never displayed in settings.
                    </p>
                  </div>
                </div>

                <button
                  id="disconnect-github-btn"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 outline-none transition-colors hover:bg-red-500/15 focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:cursor-not-allowed disabled:opacity-50 lg:w-auto"
                  aria-label="Disconnect GitHub account"
                >
                  {disconnecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Unlink className="h-4 w-4" />
                  )}
                  Disconnect
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-cc-border bg-cc-surface-raised px-4 py-3 text-xs leading-5 text-cc-muted">
              Repository access stays tied to your existing GitHub OAuth connection. Reconnect only if you need to refresh or change account access.
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-cc-border-strong bg-cc-bg-secondary px-6 py-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cc-border bg-cc-surface text-cc-muted">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-base font-semibold text-cc-text">
              No GitHub account connected
            </h3>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-cc-muted">
              Connect GitHub to choose repositories and start CtrlCode security reviews.
            </p>
            <a
              href="/dashboard/connect"
              className="mt-6 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-cc-text px-4 py-2 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <GithubIcon className="h-4 w-4" />
              Connect GitHub
            </a>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}
      </div>
    </GlowCard>
  )
}
