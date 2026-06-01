'use client'

import { CheckCircle, AlertCircle, GitBranch, Shield } from 'lucide-react'

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

const ERROR_MESSAGES: Record<string, string> = {
  github_denied: 'GitHub authorization was denied. Please try again.',
  invalid_callback: 'Invalid callback parameters. Please try again.',
  state_mismatch: 'Security validation failed. Please start the connection again.',
  token_exchange_failed: 'Failed to exchange authorization code. Please try again.',
}

interface ConnectPageClientProps {
  isConnected: boolean
  githubLogin: string | null
  connectedAt: string | null
  successParam: string | null
  errorParam: string | null
}

export function ConnectPageClient({
  isConnected,
  githubLogin,
  connectedAt,
  successParam,
  errorParam,
}: ConnectPageClientProps) {
  const errorMessage = errorParam ? ERROR_MESSAGES[errorParam] ?? 'An error occurred.' : null
  const justConnected = successParam === 'true'

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Connect GitHub</h1>
        <p className="mt-1 text-sm text-slate-600">
          Authorize VibeSafe to access your repositories for security scanning.
        </p>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{errorMessage}</p>
        </div>
      )}

      {/* Success Banner */}
      {justConnected && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-700">
            GitHub account successfully connected! VibeSafe can now access your repositories.
          </p>
        </div>
      )}

      {/* Connection Card */}
      <div className="max-w-xl rounded-xl border border-slate-200 bg-white shadow-sm">
        {isConnected ? (
          /* ── Connected State ── */
          <div className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  GitHub Connected
                </h2>
                {githubLogin && (
                  <p className="text-sm text-slate-600">
                    Authorized as <strong className="text-slate-900">@{githubLogin}</strong>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <Shield className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-slate-700">Repository access authorized</span>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
                <GitBranch className="h-4 w-4 text-indigo-600" />
                <span className="text-sm text-slate-700">Scopes: <code className="font-mono text-xs">repo, read:user</code></span>
              </div>
              {connectedAt && (
                <p className="text-xs text-slate-500 pl-1">
                  Connected on {new Date(connectedAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              )}
            </div>

            {/* Reconnect option */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs text-slate-500">
                Need to switch accounts or update permissions?
              </p>
              <a
                href="/api/auth/github"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <GithubIcon className="h-4 w-4" />
                Reconnect GitHub
              </a>
            </div>
          </div>
        ) : (
          /* ── Not Connected State ── */
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
                'Read access to selected repositories',
                'Identify security vulnerabilities automatically',
                'Never write, push, or modify your code',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                  <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <a
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
    </div>
  )
}
