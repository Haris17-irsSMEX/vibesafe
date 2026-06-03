'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Shield,
  Clock,
  GitBranch,
  ExternalLink,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  FileText,
  RefreshCw,
  Cpu,
} from 'lucide-react'
import type { ScanStatus } from '@/lib/db/scans'

// ─── Status configuration ────────────────────────────────────────────────────
const STATUS_CONFIG: Record<
  ScanStatus,
  {
    label: string
    description: string
    icon: React.ElementType
    iconColor: string
    bgColor: string
    borderColor: string
    badgeColor: string
    animate?: string
  }
> = {
  pending: {
    label: 'Waiting to Start',
    description: 'Your scan is queued. Click the button below to fetch repository files.',
    icon: Clock,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-700',
  },
  fetching: {
    label: 'Fetching Files',
    description: 'VibeSafe is fetching security-relevant files from your repository.',
    icon: Download,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700',
    animate: 'animate-pulse',
  },
  scanning: {
    label: 'Files Collected',
    description: 'Repository files have been fetched and categorized. Ready for AI security analysis.',
    icon: FileText,
    iconColor: 'text-indigo-500',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    badgeColor: 'bg-indigo-100 text-indigo-700',
  },
  complete: {
    label: 'Scan Complete',
    description: 'Security analysis finished. Review your findings.',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  completed: {
    label: 'Scan Complete',
    description: 'Security analysis finished. Review your findings.',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  failed: {
    label: 'Scan Failed',
    description: 'An error occurred. See details below and click Retry to try again.',
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    badgeColor: 'bg-red-100 text-red-700',
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface ScanStatusClientProps {
  scanId: string
  repoName: string
  repoFullName: string
  repoUrl: string
  defaultBranch: string
  status: ScanStatus
  errorMessage: string | null
  startedAt: string
  completedAt: string | null
  securityScore: number | null
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  totalFindings: number
  fileCount: number
  readyForAI: boolean
}

export function ScanStatusClient({
  scanId,
  repoName,
  repoFullName,
  repoUrl,
  defaultBranch,
  status,
  errorMessage,
  startedAt,
  completedAt,
  securityScore,
  criticalCount,
  highCount,
  mediumCount,
  lowCount,
  totalFindings,
  fileCount,
  readyForAI,
}: ScanStatusClientProps) {
  const router = useRouter()
  const config = STATUS_CONFIG[status]
  const StatusIcon = config.icon

  // ── Fetch Files state ──
  const [isFetching, setIsFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchSuccess, setFetchSuccess] = useState<string | null>(null)

  // ── Reset state ──
  const [isResetting, setIsResetting] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  // ── AI Scan state ──
  const [isScanning, setIsScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)
  const [scanSuccess, setScanSuccess] = useState<string | null>(null)

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleFetchFiles() {
    if (isFetching) return
    setIsFetching(true)
    setFetchError(null)
    setFetchSuccess(null)

    try {
      const res = await fetch('/api/scans/fetch-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        setFetchError(
          typeof json.error === 'string'
            ? json.error
            : 'Failed to fetch repository files. Please try again.'
        )
        router.refresh()
        return
      }

      setFetchSuccess(
        `Successfully fetched ${json.filesStored} file${json.filesStored === 1 ? '' : 's'} from the repository.`
      )
      router.refresh()
    } catch {
      setFetchError('Network error. Please try again.')
    } finally {
      setIsFetching(false)
    }
  }

  async function handleReset() {
    if (isResetting) return
    setIsResetting(true)
    setResetError(null)

    try {
      const res = await fetch('/api/scans/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        setResetError(
          typeof json.error === 'string'
            ? json.error
            : 'Failed to reset scan. Please try again.'
        )
        return
      }

      // After reset → trigger fetch automatically for smooth UX
      router.refresh()
    } catch {
      setResetError('Network error. Please try again.')
    } finally {
      setIsResetting(false)
    }
  }

  async function handleRunAIScan() {
    if (isScanning) return
    setIsScanning(true)
    setScanError(null)
    setScanSuccess(null)

    try {
      const res = await fetch('/api/scans/run-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok || !json.success) {
        setScanError(
          typeof json.error === 'string'
            ? json.error
            : 'Failed to run AI scan. Please try again.'
        )
        router.refresh()
        return
      }

      setScanSuccess('AI Scan completed successfully!')
      router.refresh()
    } catch {
      setScanError('Network error. Please try again.')
    } finally {
      setIsScanning(false)
    }
  }

  // Derived state
  const canFetchFiles = status === 'pending' || status === 'failed'
  const canReset = status === 'scanning'
  const isTerminal = status === 'complete' || status === 'completed'

  return (
    <div className="max-w-3xl">
      {/* Back link */}
      <Link
        href="/dashboard/connect"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to repositories
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Scan Details</h1>
        <p className="mt-1 text-sm text-slate-600">
          Security scan for{' '}
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-slate-900 underline-offset-2 hover:underline"
          >
            {repoFullName}
          </a>
        </p>
      </div>

      {/* ── Inline alerts ── */}

      {fetchError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{fetchError}</p>
        </div>
      )}

      {fetchSuccess && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
        >
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-700">{fetchSuccess}</p>
        </div>
      )}

      {resetError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{resetError}</p>
        </div>
      )}

      {scanError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-700">{scanError}</p>
        </div>
      )}

      {scanSuccess && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
        >
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <p className="text-sm text-emerald-700">{scanSuccess}</p>
        </div>
      )}

      {/* ── Status card ── */}
      <div className={`rounded-xl border ${config.borderColor} ${config.bgColor} p-6`}>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <StatusIcon
              className={`h-6 w-6 ${config.iconColor} ${config.animate ?? ''}`}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{config.label}</h2>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${config.badgeColor}`}
              >
                {status}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-600">{config.description}</p>
          </div>
        </div>
      </div>

      {/* ── Fetch Files action card (pending | failed) ── */}
      {canFetchFiles && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-900">
                {status === 'failed'
                  ? 'Retry fetching repository files'
                  : 'Fetch repository files to begin scanning'}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                VibeSafe will read security-relevant files (.ts, .js, .py, .env, .json, etc.)
                from your repository. No files will be written or modified.
              </p>
              <button
                id="fetch-files-btn"
                onClick={handleFetchFiles}
                disabled={isFetching}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-60"
              >
                {isFetching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Fetching files…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    {status === 'failed' ? 'Retry Fetch Files' : 'Fetch Repository Files'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Scanning state (files ready) ── */}
      {status === 'scanning' && (
        <div className="mt-6 rounded-xl border border-indigo-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Files collected — awaiting AI analysis
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  <span className="font-medium text-indigo-700">{fileCount}</span> security-relevant
                  {fileCount === 1 ? ' file' : ' files'} fetched and categorized.
                  AI-powered analysis is available in the next phase.
                </p>
                {readyForAI && (
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle className="h-3 w-3" />
                    Ready for AI scan
                  </span>
                )}
              </div>
            </div>
            
            {readyForAI && (
              <div className="shrink-0">
                <button
                  id="run-ai-btn"
                  onClick={handleRunAIScan}
                  disabled={isScanning || isResetting}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:pointer-events-none disabled:opacity-60"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning…
                    </>
                  ) : (
                    <>
                      <Cpu className="h-4 w-4" />
                      Run AI Security Scan
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* Reset button — lets user re-fetch with latest files */}
            {canReset && (
              <div className="shrink-0">
                <button
                  id="reset-scan-btn"
                  onClick={handleReset}
                  disabled={isResetting}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50"
                  title="Reset scan to re-fetch repository files"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting…
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Re-fetch Files
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Complete placeholder ── */}
      {isTerminal && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-medium text-emerald-900">Scan complete</p>
              <p className="mt-1 text-sm text-emerald-700">
                Security analysis has finished.
              </p>
            </div>
          </div>
          <Link
            href={`/results/${scanId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700 shadow-sm"
          >
            <ExternalLink className="h-4 w-4" />
            View Results
          </Link>
        </div>
      )}

      {/* ── Failed state — show stored error_message if available ── */}
      {status === 'failed' && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-6">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div>
            <p className="text-sm font-medium text-red-900">Scan encountered an error</p>
            {errorMessage ? (
              <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
            ) : (
              <p className="mt-1 text-sm text-red-700">
                An error occurred during file fetching. Click &quot;Retry Fetch Files&quot; above.
                If the issue persists, try reconnecting your GitHub account.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Repository information ── */}
      <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="text-sm font-semibold text-slate-900">Repository Information</h3>
        </div>
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-slate-500">Repository</span>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:underline"
            >
              {repoFullName}
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
            </a>
          </div>
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-slate-500">Branch</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
              <GitBranch className="h-3.5 w-3.5 text-slate-400" />
              {defaultBranch}
            </span>
          </div>
          {fileCount > 0 && (
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-slate-500">Files Collected</span>
              <span className="text-sm font-medium text-slate-900">{fileCount}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-slate-500">Started</span>
            <span className="text-sm text-slate-900">{formatDate(startedAt)}</span>
          </div>
          {completedAt && (
            <div className="flex items-center justify-between px-6 py-3">
              <span className="text-sm text-slate-500">Completed</span>
              <span className="text-sm text-slate-900">{formatDate(completedAt)}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-3">
            <span className="text-sm text-slate-500">Scan ID</span>
            <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">
              {scanId.slice(0, 8)}
            </code>
          </div>
        </div>
      </div>

      {/* ── Findings summary (complete/completed only) ── */}
      {isTerminal && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h3 className="text-sm font-semibold text-slate-900">Findings Summary</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-5">
            {securityScore !== null && (
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-900">{securityScore}</div>
                <div className="text-xs text-slate-500">Score</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
              <div className="text-xs text-slate-500">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{highCount}</div>
              <div className="text-xs text-slate-500">High</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">{mediumCount}</div>
              <div className="text-xs text-slate-500">Medium</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-600">{totalFindings}</div>
              <div className="text-xs text-slate-500">Total</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
