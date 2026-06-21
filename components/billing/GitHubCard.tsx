'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2, Calendar, Unlink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { GlowCard } from '@/components/ui/glow-card'

// lucide-react dropped the Github icon — use an inline SVG instead
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function GitHubCard({ connected, githubLogin, connectedAt }: GitHubCardProps) {
  const router = useRouter()
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDisconnect = async () => {
    if (disconnecting) return
    const confirmed = window.confirm(
      'Disconnect your GitHub account? You will need to reconnect to run new scans.'
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

      // Refresh to show updated state
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
      setDisconnecting(false)
    }
  }

  return (
    <GlowCard className="p-0 overflow-hidden bg-card/50">
      <div className="border-b border-white/5 bg-white/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <GithubIcon className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">GitHub Integration</h2>
        </div>
      </div>

      <div className="px-6 py-6">
        {connected && githubLogin ? (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-black/40 border border-white/5 p-5 rounded-xl">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 border border-white/10 shadow-inner">
                  <GithubIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-white">@{githubLogin}</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </span>
                  </div>
                  {connectedAt && (
                    <p className="text-[11px] font-medium text-zinc-500 flex items-center gap-1.5 uppercase tracking-wide">
                      <Calendar className="h-3 w-3" />
                      Since {formatDate(connectedAt)}
                    </p>
                  )}
                </div>
              </div>

              <button
                id="disconnect-github-btn"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-xs font-semibold text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 focus:ring-offset-background disabled:opacity-50 w-full sm:w-auto"
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

            {error && (
              <p
                role="alert"
                className="mt-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-8 text-center bg-black/40 border border-dashed border-white/10 rounded-xl">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-white/5 border border-white/10">
                <GithubIcon className="h-7 w-7 text-zinc-400" />
              </div>
            </div>
            <h3 className="mt-5 text-base font-bold text-white">No GitHub account connected</h3>
            <p className="mt-2 text-sm text-zinc-500 max-w-sm">
              Connect your GitHub account to start analyzing your repositories for security vulnerabilities.
            </p>
            <a
              href="/dashboard/connect"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_0_15px_-3px_rgba(124,58,237,0.5)] transition-all hover:bg-primary-hover"
            >
              <GithubIcon className="h-4 w-4" />
              Connect GitHub
            </a>
          </div>
        )}
      </div>
    </GlowCard>
  )
}
