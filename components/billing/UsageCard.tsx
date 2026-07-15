import type { ReactNode } from 'react'
import { Activity, BarChart3, CheckCircle2, ShieldAlert } from 'lucide-react'
import type { AccountUsageSummary } from '@/lib/usage-limits'
import { GlowCard } from '@/components/ui/glow-card'

interface UsageCardProps {
  totalScans: number
  completedScans: number
  usage: AccountUsageSummary
}

function StatTile({
  label,
  value,
  detail,
  icon,
  accentClassName,
}: {
  label: string
  value: string
  detail: string
  icon: ReactNode
  accentClassName?: string
}) {
  return (
    <div className="rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
            {label}
          </p>
          <p className={`mt-2 text-2xl font-semibold tracking-[-0.03em] text-cc-text ${accentClassName ?? ''}`}>
            {value}
          </p>
          <p className="mt-1 text-xs text-cc-muted">{detail}</p>
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cc-border bg-cc-surface text-cc-muted">
          {icon}
        </span>
      </div>
    </div>
  )
}

export function UsageCard({ totalScans, completedScans, usage }: UsageCardProps) {
  const completionRate =
    totalScans > 0 ? `${Math.round((completedScans / totalScans) * 100)}%` : 'Not available'
  const scanUsage = usage.isAdmin
    ? 'Admin bypass'
    : `${usage.securityScans.used} / ${usage.securityScans.limit}`
  const systemTestUsage = usage.isAdmin
    ? 'Admin bypass'
    : `${usage.systemTests.used} / ${usage.systemTests.limit}`

  return (
    <GlowCard className="overflow-hidden rounded-2xl border-cc-border bg-cc-surface">
      <div className="border-b border-cc-border bg-cc-bg-secondary/80 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cc-border bg-cc-surface text-cc-muted">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-cc-text">Usage</h2>
            <p className="text-sm text-cc-muted">
              Real scan activity for this account, plus the current plan allowance.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-6 py-6 sm:grid-cols-2">
        <StatTile
          label="Total scans"
          value={totalScans.toLocaleString()}
          detail="All scan attempts recorded for this account."
          icon={<Activity className="h-4 w-4" />}
        />
        <StatTile
          label="Completed scans"
          value={completedScans.toLocaleString()}
          detail="Completed reviews with report output."
          icon={<CheckCircle2 className="h-4 w-4" />}
          accentClassName="text-emerald-400"
        />
        <StatTile
          label="Completion rate"
          value={completionRate}
          detail={
            totalScans > 0
              ? 'Completed scans as a share of total scan attempts.'
              : 'Completion rate appears after your first review finishes.'
          }
          icon={<ShieldAlert className="h-4 w-4" />}
        />
        <StatTile
          label="Daily AI review allowance"
          value={scanUsage}
          detail={`Security scans used today. Resets at ${new Date(usage.window.resetAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' })}.`}
          icon={<BarChart3 className="h-4 w-4" />}
        />
        <StatTile
          label="Daily system test allowance"
          value={systemTestUsage}
          detail="System Testing runs used today on the same UTC reset window."
          icon={<Activity className="h-4 w-4" />}
        />
      </div>
    </GlowCard>
  )
}
