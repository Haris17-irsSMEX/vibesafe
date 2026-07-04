import type { ReactNode } from 'react'
import { Calendar, GitBranch, Mail, ShieldCheck } from 'lucide-react'
import { formatSafeDate } from '@/lib/date'
import { GlowCard } from '@/components/ui/glow-card'

interface AccountCardProps {
  email: string | null
  createdAt: string | null
  planLabel: string
  githubLogin: string | null
}

function DetailRow({
  label,
  value,
  icon,
  mono = false,
}: {
  label: string
  value: string
  icon: ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cc-border bg-cc-surface text-cc-muted">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
          {label}
        </p>
        <p className={`mt-1 text-sm font-medium text-cc-text ${mono ? 'truncate font-mono' : ''}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

export function AccountCard({
  email,
  createdAt,
  planLabel,
  githubLogin,
}: AccountCardProps) {
  return (
    <GlowCard className="overflow-hidden rounded-2xl border-cc-border bg-cc-surface">
      <div className="border-b border-cc-border bg-cc-bg-secondary/80 px-6 py-5">
        <h2 className="text-base font-semibold text-cc-text">Account details</h2>
        <p className="mt-1 text-sm text-cc-muted">
          Account identity and access metadata for your CtrlCode workspace.
        </p>
      </div>

      <div className="space-y-4 px-6 py-6">
        <DetailRow
          label="Email"
          value={email ?? 'Not available'}
          icon={<Mail className="h-4 w-4" />}
          mono
        />
        <DetailRow
          label="Member since"
          value={formatSafeDate(createdAt, 'Not available')}
          icon={<Calendar className="h-4 w-4" />}
        />
        <DetailRow
          label="Current plan"
          value={planLabel}
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <DetailRow
          label="GitHub account"
          value={githubLogin ? `@${githubLogin}` : 'Not available'}
          icon={<GitBranch className="h-4 w-4" />}
        />

        <div className="rounded-xl border border-cc-border bg-cc-surface-raised px-4 py-3 text-xs leading-5 text-cc-muted">
          Tokens and sensitive access credentials are never shown here. Repository access is managed through your authenticated session and GitHub connection.
        </div>
      </div>
    </GlowCard>
  )
}
