import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getScanById } from '@/lib/db/scans'
import {
  getScanResultsForScan,
  getScanResultsForScanFree,
} from '@/lib/db/scan-results'
import { getUserProfile, upsertUserProfile, isPaidPlan } from '@/lib/db/users'
import { isAdminEmail } from '@/lib/auth/admin'
import { scoreToLabel, scoreToColor } from '@/services/scoring/SecurityScorer'
import { FindingsList } from '@/components/results/FindingsList'
import { SecurityOfficerReport } from '@/components/results/SecurityOfficerReport'
import { formatSecurityReportMarkdown } from '@/services/scanner/SecurityReportFormatter'
import { ArrowLeft, ExternalLink, GitBranch, Calendar, ShieldAlert } from 'lucide-react'
import { ServerDashboardLayout } from '@/components/layout/server-dashboard-layout'
import { GlassPanel } from '@/components/ui/glow-card'
import { cn } from '@/lib/utils'

interface ResultsPageProps {
  params: {
    scanId: string
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getScoreWarningText(scan: { security_score: number | null, critical_count: number, high_count: number, medium_count: number, low_count: number }): string | null {
  if (scan.security_score === 100) return "No vulnerabilities were detected in this scan."
  if (scan.critical_count > 0) return "Critical security issues require immediate attention."
  if (scan.high_count > 0) return "High severity findings need review before production launch."
  if (scan.medium_count > 0 || scan.low_count > 0) return "Non-critical issues were found. Review recommended improvements."
  return null
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { scanId } = params

  // 1. Verify user session
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Load scan & verify ownership (server-side, never trusts client input)
  const scan = await getScanById(scanId, user.id)

  if (!scan) {
    return (
      <ServerDashboardLayout>
        <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-red-400">Scan not found</h2>
            <p className="mt-2 text-sm text-red-400/80">
              This scan does not exist or you do not have permission to view it.
            </p>
            <Link
              href="/dashboard"
              className="mt-4 inline-flex items-center text-sm font-medium text-red-400 hover:text-red-300 hover:underline"
            >
              &larr; Back to Dashboard
            </Link>
          </div>
        </div>
      </ServerDashboardLayout>
    )
  }

  // 3. Load user profile & detect plan
  //    Auto-provision a free profile row if not yet created (first login edge case)
  let profile = await getUserProfile(user.id)
  if (!profile) {
    await upsertUserProfile(user.id, user.email ?? null)
    profile = await getUserProfile(user.id)
  }
  const userPlan = profile?.plan ?? 'free'
  const paid = isPaidPlan(userPlan)

  // Admin override — server-side only, never trusts client input
  const isAdmin = isAdminEmail(user.email)

  // canViewFull: admin gets full access regardless of plan (paid or free)
  const canViewFull = isAdmin || paid

  // 4. Fetch findings — GATED at the DB query level
  //    Free users: only safe fields (no description/fix_code/fix_prompt etc.)
  //    Paid/Admin users: full fields
  const findings = canViewFull
    ? await getScanResultsForScan(scanId)
    : await getScanResultsForScanFree(scanId)

  // Build markdown report for copy button (paid/admin only)
  const markdownReport = (canViewFull && scan.executive_summary)
    ? formatSecurityReportMarkdown(
        {
          executive_summary:    scan.executive_summary ?? '',
          security_verdict:     scan.security_verdict ?? '',
          production_readiness: (scan.production_readiness as 'ready' | 'needs_attention' | 'not_ready' | 'critical_risk') ?? 'needs_attention',
          top_risks:            (scan.top_risks as { title: string; severity: string; explanation: string; affected_area: string }[]) ?? [],
          positive_findings:    (scan.positive_findings as string[]) ?? [],
          remediation_plan:     (scan.remediation_plan as { priority: number; action: string; reason: string; estimated_effort: string }[]) ?? [],
          business_impact:      scan.business_impact ?? '',
          technical_summary:    scan.technical_summary ?? '',
          estimated_fix_effort: scan.estimated_fix_effort ?? '',
        },
        scan,
        findings.map(f => ({
          severity:   f.severity,
          check_name: f.check_name,
          file_path:  f.file_path,
          category:   f.category,
        }))
      )
    : ''

  return (
    <ServerDashboardLayout>
      <div className="mx-auto max-w-5xl animate-fade-in">
        {/* Back link */}
        <Link
          href={`/scan/${scanId}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to scan terminal
        </Link>

        {/* Header Summary */}
        <GlassPanel className="mb-10 p-0 overflow-hidden border-white/10">
          <div className="border-b border-white/5 bg-white/5 px-6 py-6 sm:flex sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Security Scan Results</h1>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-400">
                <a
                  href={scan.repo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-white hover:text-primary transition-colors"
                >
                  <span className="font-medium">{scan.repo_full_name}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <span className="flex items-center gap-1.5">
                  <GitBranch className="h-4 w-4 text-zinc-500" />
                  {scan.default_branch}
                </span>
                {scan.completed_at && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-zinc-500" />
                    {formatDate(scan.completed_at)}
                  </span>
                )}
                {/* Plan badge */}
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                    paid
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_-2px_rgba(16,185,129,0.3)]'
                      : 'bg-white/5 text-zinc-400 border-white/10'
                  )}
                >
                  {userPlan} plan
                </span>
                {/* Admin badge — only visible when logged in as admin */}
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border bg-violet-500/10 text-violet-400 border-violet-500/30 shadow-[0_0_10px_-2px_rgba(139,92,246,0.4)]">
                    <ShieldAlert className="h-3 w-3" />
                    Founder mode
                  </span>
                )}
              </div>
            </div>
            {scan.security_score !== null && (
              <div className="mt-6 sm:mt-0 flex shrink-0 items-center justify-center rounded-2xl bg-black/50 border border-white/10 px-6 py-4 shadow-inner max-w-[280px]">
                <div className="text-center flex flex-col items-center">
                  <div className={cn(
                    "text-3xl font-black tracking-tighter mb-1",
                    scoreToColor(scan.security_score)
                  )}>
                    {scan.security_score}
                  </div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">
                    {scoreToLabel(scan.security_score)}
                  </div>
                  <div className="text-xs text-zinc-400 leading-tight">
                    {getScoreWarningText(scan)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Counts */}
          <div className="grid grid-cols-2 divide-x divide-y sm:divide-y-0 divide-white/5 sm:grid-cols-5 bg-background/50">
            <div className="p-6 text-center group hover:bg-white/5 transition-colors">
              <p className="text-3xl font-black text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]">{scan.critical_count}</p>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-red-400 transition-colors">Critical</p>
            </div>
            <div className="p-6 text-center group hover:bg-white/5 transition-colors">
              <p className="text-3xl font-black text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.3)]">{scan.high_count}</p>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-orange-400 transition-colors">High</p>
            </div>
            <div className="p-6 text-center group hover:bg-white/5 transition-colors">
              <p className="text-3xl font-black text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.2)]">{scan.medium_count}</p>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-yellow-400 transition-colors">Medium</p>
            </div>
            <div className="p-6 text-center group hover:bg-white/5 transition-colors">
              <p className="text-3xl font-black text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.2)]">{scan.low_count}</p>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-blue-400 transition-colors">Low</p>
            </div>
            <div className="p-6 text-center sm:border-l border-white/5 col-span-2 sm:col-span-1 group hover:bg-white/5 transition-colors">
              <p className="text-3xl font-black text-primary drop-shadow-[0_0_10px_rgba(124,58,237,0.3)]">{scan.total_findings}</p>
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-2 group-hover:text-primary transition-colors">Total</p>
            </div>
          </div>
        </GlassPanel>

        {/* Security Officer Report — shown above findings when available */}
        {scan.executive_summary && (
          <SecurityOfficerReport
            scan={scan}
            findings={findings}
            canViewFull={canViewFull}
            isAdmin={isAdmin}
            markdownReport={markdownReport}
          />
        )}

        {/* Findings List */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Findings Details</h2>
          </div>
          <FindingsList findings={findings} scanId={scanId} isPaid={canViewFull} />
        </div>
      </div>
    </ServerDashboardLayout>
  )
}
