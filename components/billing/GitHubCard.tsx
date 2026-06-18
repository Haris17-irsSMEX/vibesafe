'use client'

import { useState } from 'react'
import { CheckCircle2, AlertCircle, Loader2, Calendar, Unlink } from 'lucide-react'

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
import { useRouter } from 'next/navigation'

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <GithubIcon className="h-4 w-4 text-slate-700" />
          <h2 className="text-base font-semibold text-slate-900">GitHub Connection</h2>
        </div>
      </div>

      <div className="px-6 py-5">
        {connected && githubLogin ? (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900">
                  <GithubIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">@{githubLogin}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </span>
                  </div>
                  {connectedAt && (
                    <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Connected {formatDate(connectedAt)}
                    </p>
                  )}
                </div>
              </div>

              <button
                id="disconnect-github-btn"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 focus:ring-offset-1 disabled:opacity-50 shrink-0"
                aria-label="Disconnect GitHub account"
              >
                {disconnecting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Unlink className="h-3 w-3" />
                )}
                Disconnect
              </button>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-3 flex items-center gap-1.5 text-sm text-red-600"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </p>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <GithubIcon className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-700">No GitHub account connected</p>
            <p className="mt-1 text-xs text-slate-500">
              Connect your GitHub account to start scanning repositories.
            </p>
            <a
              href="/dashboard/connect"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
            >
              <GithubIcon className="h-4 w-4" />
              Connect GitHub
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
