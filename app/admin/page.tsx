import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { BackfillButton } from '@/components/admin/backfill-button'
import { BackfillScoresButton } from '@/components/admin/backfill-scores-button'
import { SurfaceCard, StatMetricCard } from '@/components/dashboard/dashboard-ui'
import {
  AppPageContainer,
  AppPageHeader,
  AppSectionHeader,
} from '@/components/layout/app-page'
import { ServerDashboardLayout } from '@/components/layout/server-dashboard-layout'
import { ReadinessBadge, ResultSurface } from '@/components/results/result-ui'
import { isAdminEmail } from '@/lib/auth/admin'
import {
  getAdminOverviewStats,
  getAdminRecentFindings,
  getAdminRecentScans,
  getAdminRecentUsers,
  getFindingsMissingFixPromptCount,
} from '@/lib/db/admin-stats'
import { formatSafeDate, formatSafeDateTime } from '@/lib/date'
import { getPlanLabel } from '@/lib/plan-label'
import { scoreToColor, scoreToLabel } from '@/services/scoring/SecurityScorer'

function formatMetric(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString() : 'Not available'
}

function formatPercent(numerator: number, denominator: number): string {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 'Not available'
  }

  return `${((numerator / denominator) * 100).toFixed(1)}%`
}

function formatAverage(total: number, count: number): string {
  if (!Number.isFinite(total) || !Number.isFinite(count) || count <= 0) {
    return 'Not available'
  }

  return (total / count).toFixed(1)
}

function formatStatusLabel(status: string): string {
  if (status === 'complete') return 'Completed'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function PlanBadge({ plan }: { plan: string }) {
  const tones: Record<string, string> = {
    free: 'border-white/10 bg-white/5 text-cc-muted',
    starter: 'border-white/15 bg-white/8 text-cc-text',
    builder: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    pro: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tones[plan] ?? 'border-white/10 bg-white/5 text-cc-muted'}`}
    >
      {getPlanLabel(plan)}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const tones: Record<string, string> = {
    complete: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    completed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    failed: 'border-red-500/20 bg-red-500/10 text-red-400',
    pending: 'border-white/10 bg-white/5 text-cc-muted',
    fetching: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    scanning: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tones[status] ?? 'border-white/10 bg-white/5 text-cc-muted'}`}
    >
      {formatStatusLabel(status)}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const tones: Record<string, string> = {
    CRITICAL: 'border-red-500/20 bg-red-500/10 text-red-400',
    HIGH: 'border-orange-500/20 bg-orange-500/10 text-orange-400',
    MEDIUM: 'border-amber-500/20 bg-amber-500/10 text-amber-400',
    LOW: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${tones[severity?.toUpperCase()] ?? 'border-white/10 bg-white/5 text-cc-muted'}`}
    >
      {severity}
    </span>
  )
}

function EnvStatus({
  label,
  configured,
  value,
}: {
  label: string
  configured?: boolean
  value?: string
}) {
  const content =
    typeof configured === 'boolean' ? (
      configured ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Configured
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
          <AlertCircle className="h-3.5 w-3.5" />
          Not configured
        </span>
      )
    ) : (
      <span className="max-w-[220px] truncate text-xs font-medium text-cc-text">
        {value ?? 'Not available'}
      </span>
    )

  return (
    <div className="flex items-center justify-between gap-3 border-b border-cc-border py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-sm text-cc-muted">{label}</span>
      {content}
    </div>
  )
}

function AdminPlanSelector({
  userId,
  currentPlan,
}: {
  userId: string
  currentPlan: string
}) {
  return (
    <form
      action="/api/admin/users/update-plan"
      method="POST"
      className="flex items-center gap-2"
    >
      <input type="hidden" name="userId" value={userId} />
      <select
        name="plan"
        defaultValue={currentPlan}
        className="min-h-9 rounded-lg border border-cc-border bg-cc-bg-secondary px-3 text-xs text-cc-text outline-none transition-colors focus:border-cc-border-strong focus:ring-2 focus:ring-white/10"
        aria-label="Select plan override"
      >
        <option value="free">Free</option>
        <option value="starter">Starter</option>
        <option value="builder">Builder</option>
        <option value="pro">Legacy Pro</option>
      </select>
      <button
        type="submit"
        className="inline-flex min-h-9 items-center justify-center rounded-lg border border-cc-border-strong bg-cc-surface-raised px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-text transition-colors hover:bg-cc-surface-hover focus-visible:ring-2 focus-visible:ring-white/20"
      >
        Apply
      </button>
    </form>
  )
}

function TableHeader({ children }: { children: ReactNode }) {
  return (
    <th className="bg-cc-bg-secondary px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
      {children}
    </th>
  )
}

function EmptyRow({
  colSpan,
  message,
}: {
  colSpan: number
  message: string
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-cc-subtle">
        {message}
      </td>
    </tr>
  )
}

export default async function AdminPage() {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  if (!isAdminEmail(user.email)) {
    return (
      <ServerDashboardLayout>
        <AppPageContainer size="narrow">
          <div className="flex min-h-[60vh] items-center justify-center">
            <SurfaceCard className="max-w-md p-10 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cc-border bg-cc-surface-raised text-cc-muted">
                <ShieldAlert className="h-6 w-6" />
              </span>
              <h1 className="mt-5 text-2xl font-semibold text-cc-text">Not Found</h1>
              <p className="mt-2 text-sm leading-6 text-cc-muted">
                The page you&apos;re looking for doesn&apos;t exist.
              </p>
              <Link
                href="/dashboard"
                className="mt-6 inline-flex min-h-10 items-center justify-center rounded-lg bg-cc-text px-4 py-2 text-sm font-semibold text-cc-bg transition-colors hover:bg-white"
              >
                Return to dashboard
              </Link>
            </SurfaceCard>
          </div>
        </AppPageContainer>
      </ServerDashboardLayout>
    )
  }

  const [stats, recentUsers, recentScans, recentFindings, missingFixPrompts] =
    await Promise.all([
      getAdminOverviewStats(),
      getAdminRecentUsers(20),
      getAdminRecentScans(20),
      getAdminRecentFindings(20),
      getFindingsMissingFixPromptCount(),
    ])

  const envStatus = {
    adminEmails: !!process.env.ADMIN_EMAILS?.trim(),
    paddle:
      !!process.env.PADDLE_API_KEY &&
      !!process.env.PADDLE_WEBHOOK_SECRET &&
      !!process.env.PADDLE_STARTER_PRICE_ID,
    github:
      !!process.env.GITHUB_CLIENT_ID && !!process.env.GITHUB_CLIENT_SECRET,
    deepseek: !!process.env.DEEPSEEK_API_KEY,
    resend: !!process.env.RESEND_API_KEY,
    upstash:
      !!process.env.UPSTASH_REDIS_REST_URL &&
      !!process.env.UPSTASH_REDIS_REST_TOKEN,
  }

  const freeUsers = Math.max(stats.totalUsers - stats.paidUsers, 0)

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="wide" className="space-y-10">
        <AppPageHeader
          title="Admin Panel"
          description="Monitor CtrlCode usage, scans, users, billing state, and system health."
          badge={
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              Internal / Admin only
            </span>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatMetricCard
            label="Total users"
            value={formatMetric(stats.totalUsers)}
            detail="Authenticated accounts provisioned in CtrlCode."
            icon={<Users className="h-4 w-4" />}
          />
          <StatMetricCard
            label="Total scans"
            value={formatMetric(stats.totalScans)}
            detail="All repository scans across every account."
            icon={<ScanLine className="h-4 w-4" />}
          />
          <StatMetricCard
            label="Total findings"
            value={formatMetric(stats.totalFindings)}
            detail="Stored findings generated by completed reviews."
            icon={<ShieldAlert className="h-4 w-4" />}
            tone="high"
          />
          <StatMetricCard
            label="Paid users"
            value={formatMetric(stats.paidUsers)}
            detail="Accounts on Starter, Builder, or legacy paid access."
            icon={<CreditCard className="h-4 w-4" />}
            tone="safe"
          />
          <StatMetricCard
            label="Failed scans"
            value={formatMetric(stats.failedScans)}
            detail="Scans that ended in a failed state."
            icon={<AlertCircle className="h-4 w-4" />}
            tone="critical"
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-12">
          <SurfaceCard className="p-6 xl:col-span-7">
            <AppSectionHeader
              title="System health"
              description="Configured services and active admin context."
            />
            <div className="space-y-1">
              <EnvStatus label="Admin mode" value="Active" />
              <EnvStatus label="Active admin email" value={user.email ?? 'Not available'} />
              <EnvStatus label="Admin emails" configured={envStatus.adminEmails} />
              <EnvStatus label="Paddle billing" configured={envStatus.paddle} />
              <EnvStatus label="GitHub OAuth" configured={envStatus.github} />
              <EnvStatus label="DeepSeek AI" configured={envStatus.deepseek} />
              <EnvStatus label="Resend email" configured={envStatus.resend} />
              <EnvStatus label="Upstash rate limiting" configured={envStatus.upstash} />
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6 xl:col-span-5">
            <AppSectionHeader
              title="Operational stats"
              description="Derived indicators from the current admin overview data."
            />
            <div className="grid gap-3">
              <div className="rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
                  Conversion rate
                </p>
                <p className="mt-2 text-2xl font-semibold text-cc-text">
                  {formatPercent(stats.paidUsers, stats.totalUsers)}
                </p>
              </div>
              <div className="rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
                  Avg findings / scan
                </p>
                <p className="mt-2 text-2xl font-semibold text-cc-text">
                  {formatAverage(stats.totalFindings, stats.totalScans)}
                </p>
              </div>
              <div className="rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
                  Scan failure rate
                </p>
                <p className="mt-2 text-2xl font-semibold text-cc-text">
                  {formatPercent(stats.failedScans, stats.totalScans)}
                </p>
              </div>
              <div className="rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
                  Free users
                </p>
                <p className="mt-2 text-2xl font-semibold text-cc-text">
                  {formatMetric(freeUsers)}
                </p>
              </div>
            </div>
          </SurfaceCard>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <SurfaceCard className="p-6">
            <AppSectionHeader
              title="Operations"
              description="Non-destructive maintenance tasks for keeping report output complete."
            />
            <div className="rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-4">
              <p className="text-sm font-medium text-cc-text">
                Missing fix prompts
              </p>
              <p className="mt-1 text-sm leading-6 text-cc-muted">
                Backfill AI fix prompts for findings that do not yet have one stored.
              </p>
              <p className="mt-3 text-xs uppercase tracking-[0.12em] text-cc-subtle">
                Pending items: {formatMetric(missingFixPrompts)}
              </p>
            </div>
            <div className="mt-4">
              <BackfillButton count={missingFixPrompts} />
            </div>
          </SurfaceCard>

          <SurfaceCard className="p-6">
            <AppSectionHeader
              title="Danger zone"
              description="High-impact maintenance operations touching historical data."
            />
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-4">
              <p className="text-sm font-medium text-red-300">Recalibrate all stored scores</p>
              <p className="mt-1 text-sm leading-6 text-red-200/80">
                Re-runs score calibration for historical scans. A confirmation prompt appears before execution.
              </p>
            </div>
            <div className="mt-4">
              <BackfillScoresButton />
            </div>
          </SurfaceCard>
        </div>

        <section>
          <AppSectionHeader
            title="Recent users"
            description="Latest provisioned accounts, plan state, and admin override access."
          />
          <ResultSurface className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-cc-border">
                    <TableHeader>Email</TableHeader>
                    <TableHeader>Plan</TableHeader>
                    <TableHeader>Scans</TableHeader>
                    <TableHeader>Joined</TableHeader>
                    <TableHeader>Plan updated</TableHeader>
                    <TableHeader>Override</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cc-border">
                  {recentUsers.map((record) => (
                    <tr key={record.id} className="transition-colors hover:bg-white/3">
                      <td
                        className="px-4 py-4 font-mono text-xs text-cc-text"
                        title={record.email ?? undefined}
                      >
                        <span className="block max-w-[220px] truncate">
                          {record.email ?? 'Not available'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <PlanBadge plan={record.plan} />
                      </td>
                      <td className="px-4 py-4 text-cc-muted">
                        {formatMetric(record.scan_count)}
                      </td>
                      <td className="px-4 py-4 text-xs text-cc-muted">
                        {formatSafeDate(record.created_at)}
                      </td>
                      <td className="px-4 py-4 text-xs text-cc-muted">
                        {formatSafeDate(record.plan_updated_at)}
                      </td>
                      <td className="px-4 py-4">
                        <AdminPlanSelector
                          userId={record.id}
                          currentPlan={record.plan}
                        />
                      </td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && (
                    <EmptyRow colSpan={6} message="No users yet." />
                  )}
                </tbody>
              </table>
            </div>
          </ResultSurface>
        </section>

        <section>
          <AppSectionHeader
            title="Recent scans"
            description="Latest scan activity, repository status, findings, and completion state."
          />
          <ResultSurface className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1220px] text-sm">
                <thead>
                  <tr className="border-b border-cc-border">
                    <TableHeader>Repository</TableHeader>
                    <TableHeader>User</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Score</TableHeader>
                    <TableHeader>Readiness</TableHeader>
                    <TableHeader>Report</TableHeader>
                    <TableHeader>Findings</TableHeader>
                    <TableHeader>Severities</TableHeader>
                    <TableHeader>Error</TableHeader>
                    <TableHeader>Created</TableHeader>
                    <TableHeader>Completed</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cc-border">
                  {recentScans.map((scan) => (
                    <tr key={scan.id} className="transition-colors hover:bg-white/3">
                      <td className="px-4 py-4">
                        <Link
                          href={`/scan/${scan.id}`}
                          className="group inline-flex max-w-[230px] items-center gap-1.5 font-mono text-xs text-cc-text transition-colors hover:text-white"
                          title={scan.repo_full_name}
                        >
                          <span className="truncate">{scan.repo_full_name}</span>
                          <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </td>
                      <td
                        className="px-4 py-4 font-mono text-xs text-cc-muted"
                        title={scan.user_email ?? undefined}
                      >
                        <span className="block max-w-[200px] truncate">
                          {scan.user_email ?? 'Not available'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={scan.status} />
                      </td>
                      <td className="px-4 py-4">
                        {scan.security_score !== null ? (
                          <div className="space-y-1">
                            <p className={`text-sm font-semibold ${scoreToColor(scan.security_score)}`}>
                              {scan.security_score}
                            </p>
                            <p className="text-xs text-cc-subtle">
                              {scoreToLabel(scan.security_score)}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-cc-subtle">Not available</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <ReadinessBadge readiness={scan.production_readiness} />
                      </td>
                      <td className="px-4 py-4 text-xs text-cc-muted">
                        {scan.report_generated_at ? 'Generated' : 'Pending'}
                      </td>
                      <td className="px-4 py-4 text-cc-muted">
                        {formatMetric(scan.total_findings)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1.5 text-[10px]">
                          <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-red-400">
                            C {scan.critical_count}
                          </span>
                          <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-orange-400">
                            H {scan.high_count}
                          </span>
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-amber-400">
                            M {scan.medium_count}
                          </span>
                          <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-1 text-blue-400">
                            L {scan.low_count}
                          </span>
                        </div>
                      </td>
                      <td
                        className="px-4 py-4 text-xs text-red-300/80"
                        title={scan.error_message ?? undefined}
                      >
                        <span className="block max-w-[220px] truncate">
                          {scan.error_message ?? 'Not available'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-cc-muted">
                        {formatSafeDateTime(scan.created_at)}
                      </td>
                      <td className="px-4 py-4 text-xs text-cc-muted">
                        {formatSafeDateTime(scan.completed_at)}
                      </td>
                    </tr>
                  ))}
                  {recentScans.length === 0 && (
                    <EmptyRow colSpan={11} message="No scans yet." />
                  )}
                </tbody>
              </table>
            </div>
          </ResultSurface>
        </section>

        <section>
          <AppSectionHeader
            title="Recent findings"
            description="Latest stored findings flowing into report and remediation surfaces."
          />
          <ResultSurface className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-cc-border">
                    <TableHeader>Severity</TableHeader>
                    <TableHeader>Check</TableHeader>
                    <TableHeader>File path</TableHeader>
                    <TableHeader>Scan</TableHeader>
                    <TableHeader>Created</TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cc-border">
                  {recentFindings.map((finding) => (
                    <tr key={finding.id} className="transition-colors hover:bg-white/3">
                      <td className="px-4 py-4">
                        <SeverityBadge severity={finding.severity} />
                      </td>
                      <td className="px-4 py-4 text-xs text-cc-text">
                        {finding.check_name}
                      </td>
                      <td
                        className="px-4 py-4 font-mono text-xs text-cc-muted"
                        title={finding.file_path}
                      >
                        <span className="block max-w-[260px] truncate">
                          {finding.file_path}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/scan/${finding.scan_id}`}
                          className="group inline-flex items-center gap-1.5 font-mono text-[11px] text-cc-muted transition-colors hover:text-cc-text"
                        >
                          {finding.scan_id.slice(0, 8)}...
                          <ChevronRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-xs text-cc-muted">
                        {formatSafeDateTime(finding.created_at)}
                      </td>
                    </tr>
                  ))}
                  {recentFindings.length === 0 && (
                    <EmptyRow colSpan={5} message="No findings yet." />
                  )}
                </tbody>
              </table>
            </div>
          </ResultSurface>
        </section>
      </AppPageContainer>
    </ServerDashboardLayout>
  )
}
