/**
 * app/admin/page.tsx
 *
 * Internal Admin Panel — accessible only to authenticated admin emails.
 * All data fetched server-side using service role client.
 * Non-admin users get a 404-style "Not found" response.
 * Unauthenticated users are redirected to /login.
 *
 * SECURITY:
 *  - Admin email list lives in ADMIN_EMAILS env var (server-only)
 *  - Never exposes actual secret values — only configured/not configured
 *  - All queries run via Supabase service role (bypasses RLS)
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import {
  getAdminOverviewStats,
  getAdminRecentUsers,
  getAdminRecentScans,
  getAdminRecentFindings,
  getFindingsMissingFixPromptCount,
} from '@/lib/db/admin-stats'
import { BackfillButton } from '@/components/admin/backfill-button'
import { BackfillScoresButton } from '@/components/admin/backfill-scores-button'
import { ServerDashboardLayout } from '@/components/layout/server-dashboard-layout'
import { scoreToLabel, scoreToColor } from '@/services/scoring/SecurityScorer'
import {
  Users,
  ScanLine,
  ShieldAlert,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EnvStatus({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
      <span className="text-sm text-zinc-400">{label}</span>
      {configured ? (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Configured
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400">
          <XCircle className="h-3.5 w-3.5" />
          Not configured
        </span>
      )}
    </div>
  )
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: Record<string, string> = {
    free: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    starter: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    builder: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pro: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  }
  const cls = colors[plan] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cls}`}
    >
      {plan}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    complete: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
    pending: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
    fetching: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    scanning: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  }
  const cls = colors[status] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cls}`}
    >
      {status}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
    HIGH: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    LOW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  }
  const cls = colors[severity?.toUpperCase()] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cls}`}
    >
      {severity}
    </span>
  )
}

function ReadinessBadge({ readiness }: { readiness: string | null }) {
  if (!readiness) return <span className="text-zinc-600 text-xs">—</span>
  const colors: Record<string, string> = {
    ready:            'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    needs_attention:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
    not_ready:        'bg-orange-500/10 text-orange-400 border-orange-500/20',
    critical_risk:    'bg-red-500/10 text-red-400 border-red-500/20',
  }
  const labels: Record<string, string> = {
    ready:            'Ready',
    needs_attention:  'Needs Attention',
    not_ready:        'Not Ready',
    critical_risk:    'Critical Risk',
  }
  const cls = colors[readiness] ?? 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {labels[readiness] ?? readiness}
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  // 1. Auth check
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Admin email check — server-side only
  if (!isAdminEmail(user.email)) {
    // Return 404-style response — do not reveal admin route exists
    return (
      <ServerDashboardLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-12 max-w-md">
            <ShieldAlert className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Not Found</h1>
            <p className="text-zinc-500 text-sm mb-6">
              The page you&apos;re looking for doesn&apos;t exist.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </ServerDashboardLayout>
    )
  }

  // 3. Fetch admin data (all in parallel)
  const [stats, recentUsers, recentScans, recentFindings, missingFixPrompts] = await Promise.all([
    getAdminOverviewStats(),
    getAdminRecentUsers(20),
    getAdminRecentScans(20),
    getAdminRecentFindings(20),
    getFindingsMissingFixPromptCount(),
  ])

  // 4. Env config status (never exposes values — only configured/not configured)
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

  return (
    <ServerDashboardLayout>
      <div className="mx-auto max-w-7xl animate-fade-in space-y-10">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider border bg-violet-500/10 text-violet-400 border-violet-500/30">
                <ShieldCheck className="h-3 w-3" />
                Admin Panel
              </span>
            </div>
            <h1 className="text-3xl font-black text-foreground tracking-tight">
              Internal Dashboard
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Viewing as <span className="text-violet-400 font-medium">{user.email}</span>
            </p>
          </div>
        </div>

        {/* ── Overview Cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          {[
            {
              label: 'Total Users',
              value: stats.totalUsers,
              icon: Users,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
              border: 'border-blue-500/20',
            },
            {
              label: 'Total Scans',
              value: stats.totalScans,
              icon: ScanLine,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
              border: 'border-violet-500/20',
            },
            {
              label: 'Total Findings',
              value: stats.totalFindings,
              icon: ShieldAlert,
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
              border: 'border-orange-500/20',
            },
            {
              label: 'Paid Users',
              value: stats.paidUsers,
              icon: CreditCard,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
              border: 'border-emerald-500/20',
            },
            {
              label: 'Failed Scans',
              value: stats.failedScans,
              icon: AlertCircle,
              color: 'text-red-400',
              bg: 'bg-red-500/10',
              border: 'border-red-500/20',
            },
          ].map(({ label, value, icon: Icon, color, bg, border }) => (
            <div
              key={label}
              className={`rounded-2xl border ${border} ${bg} p-5 flex flex-col gap-3`}
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} border ${border}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div>
                <p className={`text-3xl font-black ${color} leading-none`}>
                  {value.toLocaleString()}
                </p>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mt-1.5">
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Recent Users Table ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            Recent Users
          </h2>
          <div className="rounded-2xl border border-white/10 bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Scans
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Plan Updated
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Override
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-5 py-3.5 text-zinc-300 font-mono text-xs">
                        {u.email ?? <span className="text-zinc-600">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <PlanBadge plan={u.plan} />
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 font-medium">
                        {u.scan_count}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs">
                        {formatDate(u.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs">
                        {formatDate(u.plan_updated_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <AdminPlanSelector userId={u.id} currentPlan={u.plan} />
                      </td>
                    </tr>
                  ))}
                  {recentUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-zinc-600 text-sm">
                        No users yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Recent Scans Table ────────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-violet-400" />
            Recent Scans
          </h2>
          <div className="rounded-2xl border border-white/10 bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Repository
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Score
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Readiness
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Report
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Findings
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Severities
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Error Message
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Completed
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentScans.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/scan/${s.id}`}
                          className="flex items-center gap-1.5 text-zinc-300 font-mono text-xs hover:text-primary transition-colors"
                        >
                          {s.repo_full_name}
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs font-mono">
                        {s.user_email ?? '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-3.5 text-zinc-300 font-bold text-sm">
                        {s.security_score !== null ? (
                          <div className="flex flex-col">
                            <span className={scoreToColor(s.security_score)}>{s.security_score}</span>
                            <span className="text-[10px] text-zinc-500 font-normal">{scoreToLabel(s.security_score)}</span>
                          </div>
                        ) : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <ReadinessBadge readiness={s.production_readiness} />
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {s.report_generated_at
                          ? <span className="text-emerald-400 text-sm font-bold">✓</span>
                          : <span className="text-zinc-600 text-xs">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 font-medium text-sm">
                        {s.total_findings}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 text-[10px] uppercase font-bold tracking-widest whitespace-nowrap">
                        <span className="text-red-400">C:{s.critical_count}</span>{' '}
                        <span className="text-orange-400">H:{s.high_count}</span>{' '}
                        <span className="text-amber-400">M:{s.medium_count}</span>{' '}
                        <span className="text-blue-400">L:{s.low_count}</span>
                      </td>
                      <td className="px-5 py-3.5 text-red-400 text-xs max-w-[200px] truncate">
                        {s.error_message ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs">
                        {formatDateTime(s.created_at)}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs">
                        {formatDateTime(s.completed_at)}
                      </td>
                    </tr>
                  ))}
                  {recentScans.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-zinc-600 text-sm">
                        No scans yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Recent Findings Table ─────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-orange-400" />
            Recent Findings
          </h2>
          <div className="rounded-2xl border border-white/10 bg-card/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 bg-white/5">
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Check
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      File Path
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Scan ID
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentFindings.map((f) => (
                    <tr key={f.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-5 py-3.5">
                        <SeverityBadge severity={f.severity} />
                      </td>
                      <td className="px-5 py-3.5 text-zinc-300 text-xs">
                        {f.check_name}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-zinc-500 max-w-[200px] truncate">
                        {f.file_path}
                      </td>
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/scan/${f.scan_id}`}
                          className="flex items-center gap-1 font-mono text-[11px] text-zinc-600 hover:text-primary transition-colors"
                        >
                          {f.scan_id.slice(0, 8)}…
                          <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-500 text-xs">
                        {formatDateTime(f.created_at)}
                      </td>
                    </tr>
                  ))}
                  {recentFindings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-zinc-600 text-sm">
                        No findings yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Debug / Env Status ────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            System Configuration
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/10 bg-card/50 p-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
                Services
              </h3>
              <EnvStatus label="Admin Emails (ADMIN_EMAILS)" configured={envStatus.adminEmails} />
              
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-sm text-zinc-400">Admin Mode Active</span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Yes
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/5">
                <span className="text-sm text-zinc-400">Active Admin Email</span>
                <span className="text-xs font-mono text-zinc-300 truncate max-w-[150px]">
                  {user.email}
                </span>
              </div>
              <EnvStatus label="Paddle Billing" configured={envStatus.paddle} />
              <EnvStatus label="GitHub OAuth" configured={envStatus.github} />
              <EnvStatus label="DeepSeek AI" configured={envStatus.deepseek} />
              <EnvStatus label="Resend Email" configured={envStatus.resend} />
              <EnvStatus label="Upstash Rate Limiting" configured={envStatus.upstash} />
            </div>

            <div className="rounded-2xl border border-white/10 bg-card/50 p-6">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
                Quick Stats
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-zinc-400">Conversion Rate</span>
                  <span className="text-zinc-300 font-bold">
                    {stats.totalUsers > 0
                      ? `${((stats.paidUsers / stats.totalUsers) * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-zinc-400">Avg Findings/Scan</span>
                  <span className="text-zinc-300 font-bold">
                    {stats.totalScans > 0
                      ? (stats.totalFindings / stats.totalScans).toFixed(1)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5 border-b border-white/5">
                  <span className="text-zinc-400">Scan Failure Rate</span>
                  <span className="text-zinc-300 font-bold">
                    {stats.totalScans > 0
                      ? `${((stats.failedScans / stats.totalScans) * 100).toFixed(1)}%`
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2.5">
                  <span className="text-zinc-400">Free Users</span>
                  <span className="text-zinc-300 font-bold">
                    {(stats.totalUsers - stats.paidUsers).toLocaleString()}
                  </span>
                </div>
              </div>
              
              <BackfillButton count={missingFixPrompts} />
              <BackfillScoresButton />
            </div>
          </div>
        </section>
      </div>
    </ServerDashboardLayout>
  )
}

// ─── Client component: Plan selector ─────────────────────────────────────────
// Extracted as a separate async server wrapper to keep page RSC.
// The actual interactive element is in a separate client component file.

function AdminPlanSelector({
  userId,
  currentPlan,
}: {
  userId: string
  currentPlan: string
}) {
  return (
    <form
      action={`/api/admin/users/update-plan`}
      method="POST"
      className="flex items-center gap-2"
    >
      <input type="hidden" name="userId" value={userId} />
      <select
        name="plan"
        defaultValue={currentPlan}
        className="rounded-md bg-[#121214] border border-white/10 text-xs text-zinc-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary/50"
        aria-label="Select plan override"
      >
        <option value="free">free</option>
        <option value="starter">starter</option>
        <option value="builder">builder</option>
        <option value="pro">pro</option>
      </select>
      <button
        type="submit"
        className="rounded-md bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider px-2 py-1 hover:bg-primary/20 transition-colors"
      >
        Set
      </button>
    </form>
  )
}
