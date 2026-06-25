'use client'

import { useState, useEffect } from 'react'
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
  
  XCircle,
  Download,
  FileText,
  RefreshCw,
  Cpu,
  AlertTriangle,
} from 'lucide-react'
import type { ScanStatus } from '@/lib/db/scans'
import { GlowCard, GlassPanel } from '@/components/ui/glow-card'
import { cn } from '@/lib/utils'

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
    glowColor?: string
  }
> = {
  pending: {
    label: 'Waiting to Start',
    description: 'Your scan is queued. Click the button below to fetch repository files.',
    icon: Clock,
    iconColor: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    badgeColor: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    glowColor: 'rgba(245, 158, 11, 0.1)',
  },
  fetching: {
    label: 'Fetching Files',
    description: 'VibeSafe is securely fetching files from your repository.',
    icon: Download,
    iconColor: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    badgeColor: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    animate: 'animate-bounce',
    glowColor: 'rgba(59, 130, 246, 0.15)',
  },
  scanning: {
    label: 'Files Collected',
    description: 'Files have been fetched. Ready for AI security analysis.',
    icon: FileText,
    iconColor: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/20',
    badgeColor: 'bg-primary/10 text-primary border border-primary/20',
    glowColor: 'rgba(124, 58, 237, 0.15)',
  },
  complete: {
    label: 'Scan Complete',
    description: 'Security analysis finished. Review your findings.',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    glowColor: 'rgba(16, 185, 129, 0.15)',
  },
  completed: {
    label: 'Scan Complete',
    description: 'Security analysis finished. Review your findings.',
    icon: CheckCircle,
    iconColor: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    badgeColor: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    glowColor: 'rgba(16, 185, 129, 0.15)',
  },
  failed: {
    label: 'Scan Failed',
    description: 'An error occurred. See details below and click Retry to try again.',
    icon: XCircle,
    iconColor: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    badgeColor: 'bg-red-500/10 text-red-400 border border-red-500/20',
    glowColor: 'rgba(239, 68, 68, 0.15)',
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
  isAdmin?: boolean
  scanEngine?: string | null
  errorStage?: string | null
}

export function ScanStatusClient({
  scanId,
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
  fileCount,
  readyForAI,
  isAdmin,
  scanEngine,
  errorStage,
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
  const [isStuck, setIsStuck] = useState(false)

  useEffect(() => {
    if (status === 'scanning' || isScanning) {
      const timer = setTimeout(() => setIsStuck(true), 120000) // 2 minutes
      return () => clearTimeout(timer)
    } else {
      setIsStuck(false)
    }
  }, [status, isScanning])

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
  const canFetchFiles = status === 'pending' || (status === 'failed' && !readyForAI)
  const canReset = status === 'scanning' || (status === 'failed' && readyForAI)
  const isTerminal = status === 'complete' || status === 'completed'
  const isAiPhase = status === 'scanning' || (status === 'failed' && readyForAI)

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Back link */}
      <Link
        href="/dashboard/connect"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to repositories
      </Link>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Scan Status</h1>
        <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
          Security scan for
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-white transition-colors hover:text-primary"
          >
            <GithubIcon className="h-3.5 w-3.5" />
            {repoFullName}
          </a>
          {isAdmin && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/30 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wider">
              <Shield className="h-3 w-3" />
              Admin access
            </span>
          )}
        </p>
      </div>

      {/* ── Inline alerts ── */}
      {fetchError && (
        <div role="alert" className="mb-6 flex flex-col gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-400">{fetchError}</p>
          </div>
          {fetchError.includes('Upgrade') && (
            <Link href="/settings" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 hover:text-red-300">
              Upgrade Plan
            </Link>
          )}
        </div>
      )}

      {fetchSuccess && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-400">{fetchSuccess}</p>
        </div>
      )}

      {resetError && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-400">{resetError}</p>
        </div>
      )}

      {scanError && (
        <div role="alert" className="mb-6 flex flex-col gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <p className="text-sm text-red-400">{scanError}</p>
          </div>
          {scanError.includes('Upgrade') && (
            <Link href="/settings" className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30 hover:text-red-300">
              Upgrade Plan
            </Link>
          )}
        </div>
      )}

      {scanSuccess && (
        <div role="status" className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          <p className="text-sm text-emerald-400">{scanSuccess}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* ── Status card ── */}
          <GlowCard glowColor={config.glowColor} className={cn("p-6", config.bgColor, config.borderColor)}>
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background/50 border border-white/10 backdrop-blur-md">
                  <StatusIcon className={cn("h-7 w-7", config.iconColor, config.animate)} />
                </div>
                {status === 'fetching' && <div className="absolute inset-0 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground">{config.label}</h2>
                  <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", config.badgeColor)}>
                    {status}
                  </span>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{config.description}</p>
              </div>
            </div>
          </GlowCard>

          {/* ── Fetch Files action card (pending | failed) ── */}
          {canFetchFiles && (
            <GlassPanel className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-foreground">
                    {status === 'failed' ? 'Retry fetching repository files' : 'Fetch repository files to begin scanning'}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    VibeSafe will read security-relevant files (.ts, .js, .py, .env, .json, etc.) from your repository. No files will be written or modified.
                  </p>
                  <button
                    id="fetch-files-btn"
                    onClick={handleFetchFiles}
                    disabled={isFetching}
                    className="mt-6 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50 shadow-[0_0_15px_-3px_rgba(124,58,237,0.4)]"
                  >
                    {isFetching ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {isFetching ? 'Fetching files…' : status === 'failed' ? 'Retry Fetch Files' : 'Fetch Repository Files'}
                  </button>
                </div>
              </div>
            </GlassPanel>
          )}

          {/* ── Scanning state (files ready) ── */}
          {isAiPhase && (
            <GlassPanel className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <FileText className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Files collected — awaiting AI analysis</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      <strong className="text-indigo-400 font-semibold">{fileCount}</strong> security-relevant {fileCount === 1 ? 'file' : 'files'} fetched and categorized. AI-powered analysis is available in the next phase.
                      {status === 'failed' && (
                        <span className="block mt-1 text-red-400 font-medium">AI scan could not be completed. Please retry.</span>
                      )}
                      {(status === 'scanning' || isScanning) && isStuck && (
                        <span className="block mt-1 text-amber-400 font-medium">Scan appears stuck. Please retry AI Scan.</span>
                      )}
                    </p>
                    {readyForAI && (
                      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Ready for AI scan
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 shrink-0 sm:w-48">
                  {readyForAI && (
                    <button
                      id="run-ai-btn"
                      onClick={handleRunAIScan}
                      disabled={isScanning || isResetting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50 shadow-[0_0_15px_-3px_rgba(124,58,237,0.4)]"
                    >
                      {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
                      {isScanning ? 'Scanning…' : status === 'failed' || isStuck ? 'Retry AI Scan' : 'Run AI Scan'}
                    </button>
                  )}
                  {canReset && (
                    <button
                      id="reset-scan-btn"
                      onClick={handleReset}
                      disabled={isResetting || isScanning}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {isResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {isResetting ? 'Resetting…' : 'Re-fetch Files'}
                    </button>
                  )}
                </div>
              </div>
            </GlassPanel>
          )}

          {/* ── Complete state ── */}
          {isTerminal && (
            <GlassPanel className="p-6 border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 border border-emerald-500/30">
                    <CheckCircle className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-emerald-400">Scan complete</h3>
                    <p className="mt-1 text-sm text-zinc-400">Security analysis has finished successfully.</p>
                    {isAdmin && scanEngine === 'fallback' && (
                      <p className="mt-2 text-xs font-medium text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded inline-block">
                        Admin Note: Fallback scanner used because AI provider failed.
                      </p>
                    )}
                  </div>
                </div>
                <Link
                  href={`/results/${scanId}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-bold text-emerald-950 transition-all hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Results
                </Link>
              </div>
            </GlassPanel>
          )}

          {/* ── Failed state ── */}
          {status === 'failed' && !readyForAI && (
            <GlassPanel className="p-6 border-red-500/20 bg-red-500/5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20 border border-red-500/30">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-red-400">Scan encountered an error</h3>
                  {errorMessage ? (
                    <p className="mt-2 text-sm text-red-400/80 leading-relaxed font-mono bg-black/40 p-3 rounded border border-red-500/20">{errorMessage}</p>
                  ) : (
                    <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                      An error occurred during file fetching. Click &quot;Retry Fetch Files&quot; above. If the issue persists, try reconnecting your GitHub account.
                    </p>
                  )}
                </div>
              </div>
            </GlassPanel>
          )}

        </div>

        {/* ── Sidebar (Info & Stats) ── */}
        <div className="space-y-6">
          <GlowCard className="p-0 overflow-hidden">
            <div className="border-b border-white/5 bg-white/5 px-5 py-4">
              <h3 className="text-sm font-semibold text-foreground">Repository Info</h3>
            </div>
            <div className="divide-y divide-white/5">
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                <span className="text-sm text-zinc-400">Repository</span>
                <a href={repoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-primary transition-colors">
                  <span className="truncate max-w-[120px]">{repoFullName.split('/')[1] || repoFullName}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                <span className="text-sm text-zinc-400">Branch</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white">
                  <GitBranch className="h-3.5 w-3.5 text-zinc-500" />
                  {defaultBranch}
                </span>
              </div>
              {fileCount > 0 && (
                <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                  <span className="text-sm text-zinc-400">Files Collected</span>
                  <span className="text-sm font-medium text-white">{fileCount}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                <span className="text-sm text-zinc-400">Started</span>
                <span className="text-xs text-white">{formatDate(startedAt)}</span>
              </div>
              {completedAt && (
                <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                  <span className="text-sm text-zinc-400">Completed</span>
                  <span className="text-xs text-white">{formatDate(completedAt)}</span>
                </div>
              )}
              <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                <span className="text-sm text-zinc-400">Scan ID</span>
                <code className="rounded bg-black/50 border border-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-400">
                  {scanId.slice(0, 8)}
                </code>
              </div>
              {isAdmin && (
                <>
                  <div className="border-t border-white/5 bg-primary/5 px-5 py-3">
                    <h3 className="text-xs font-semibold text-primary uppercase tracking-wider">Admin Debug</h3>
                  </div>
                  <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                    <span className="text-sm text-zinc-400">Scan Engine</span>
                    <span className="text-xs text-white">{scanEngine || 'N/A'}</span>
                  </div>
                  {errorStage && (
                    <div className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5 transition-colors">
                      <span className="text-sm text-zinc-400">Error Stage</span>
                      <span className="text-xs text-red-400">{errorStage}</span>
                    </div>
                  )}
                  {errorMessage && (
                    <div className="px-5 py-3.5 hover:bg-white/5 transition-colors border-t border-white/5">
                      <span className="text-sm text-zinc-400 block mb-2">Error Message</span>
                      <code className="block rounded bg-black/50 border border-white/10 px-2 py-1.5 font-mono text-[10px] text-red-400 whitespace-pre-wrap">
                        {errorMessage}
                      </code>
                    </div>
                  )}
                </>
              )}
            </div>
          </GlowCard>

          {/* ── Findings summary (complete/completed only) ── */}
          {isTerminal && (
            <GlowCard className="p-0 overflow-hidden" glowColor="rgba(16, 185, 129, 0.1)">
              <div className="border-b border-white/5 bg-white/5 px-5 py-4">
                <h3 className="text-sm font-semibold text-foreground">Findings Summary</h3>
              </div>
              <div className="p-5">
                {securityScore !== null && (
                  <div className="flex items-end gap-3 mb-6 pb-6 border-b border-white/5">
                    <span className={cn("text-5xl font-extrabold tracking-tighter", securityScore >= 90 ? "text-emerald-400" : securityScore >= 70 ? "text-yellow-400" : "text-red-400")}>
                      {securityScore}
                    </span>
                    <span className="text-sm font-medium text-zinc-500 mb-1.5 uppercase tracking-wider">Security Score</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                  <div>
                    <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">Critical</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">{highCount}</div>
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">High</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-yellow-500">{mediumCount}</div>
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">Medium</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-500">{lowCount}</div>
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mt-1">Low</div>
                  </div>
                </div>
              </div>
            </GlowCard>
          )}
        </div>
      </div>
    </div>
  )
}
