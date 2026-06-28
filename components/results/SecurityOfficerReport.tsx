'use client'

import { Shield, CheckCircle2, AlertTriangle, TrendingUp, Briefcase, Code2, ListOrdered, Lock } from 'lucide-react'
import type { ScanRecord } from '@/lib/db/scans'
import type { GatedScanResultRecord } from '@/lib/db/scan-results'
import { CopyReportButton } from './CopyReportButton'
import { GlassPanel } from '@/components/ui/glow-card'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopRisk {
  title: string
  severity: string
  explanation: string
  affected_area: string
}

interface RemediationStep {
  priority: number
  action: string
  reason: string
  estimated_effort: string
}

interface SecurityOfficerReportProps {
  scan: ScanRecord
  findings?: GatedScanResultRecord[]
  canViewFull: boolean
  isAdmin?: boolean
  markdownReport: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type ReadinessKey = 'ready' | 'needs_attention' | 'not_ready' | 'critical_risk'

const READINESS_CONFIG: Record<ReadinessKey, {
  label: string
  color: string
  bg: string
  border: string
  glow: string
}> = {
  ready: {
    label: 'Production Ready',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-[0_0_20px_-4px_rgba(16,185,129,0.4)]',
  },
  needs_attention: {
    label: 'Needs Attention',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-[0_0_20px_-4px_rgba(245,158,11,0.3)]',
  },
  not_ready: {
    label: 'Not Production Ready',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    glow: 'shadow-[0_0_20px_-4px_rgba(249,115,22,0.3)]',
  },
  critical_risk: {
    label: 'Critical Risk',
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    glow: 'shadow-[0_0_20px_-4px_rgba(239,68,68,0.4)]',
  },
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  CRITICAL: { color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-500' },
  HIGH:     { color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  MEDIUM:   { color: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-500' },
  LOW:      { color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-500' },
}

function getSeverityConfig(severity: string) {
  return SEVERITY_CONFIG[severity?.toUpperCase()] ?? SEVERITY_CONFIG['MEDIUM']
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, className }: {
  icon: React.ElementType
  title: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2.5 mb-5', className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">{title}</h3>
    </div>
  )
}

function PaidGate({ featureName }: { featureName: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-white/10 bg-white/[0.02]">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 mb-4">
        <Lock className="h-6 w-6 text-primary/60" />
      </div>
      <p className="text-sm font-semibold text-zinc-400">{featureName} is available on paid plans</p>
      <p className="mt-1 text-xs text-zinc-600">Upgrade to unlock the full security officer report</p>
      <a
        href="/pricing"
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-4 py-2 text-xs font-bold text-primary uppercase tracking-wider hover:bg-primary/20 transition-colors"
      >
        Upgrade Plan
      </a>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SecurityOfficerReport({
  scan,
  canViewFull,
  markdownReport,
}: SecurityOfficerReportProps) {
  const readiness = (scan.production_readiness as ReadinessKey) ?? 'needs_attention'
  const readinessCfg = READINESS_CONFIG[readiness] ?? READINESS_CONFIG['needs_attention']

  const topRisks: TopRisk[] = Array.isArray(scan.top_risks) ? (scan.top_risks as TopRisk[]) : []
  const positiveFindings: string[] = Array.isArray(scan.positive_findings) ? (scan.positive_findings as string[]) : []
  const remediationPlan: RemediationStep[] = Array.isArray(scan.remediation_plan) ? (scan.remediation_plan as RemediationStep[]) : []

  const hasReport = !!scan.executive_summary

  if (!hasReport) {
    return null
  }

  return (
    <GlassPanel className="mb-10 p-0 overflow-hidden border-white/10">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.03] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 shadow-[0_0_20px_-4px_rgba(124,58,237,0.3)]">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Security Officer Report</h2>
            <p className="text-xs text-zinc-500">AI-powered security posture analysis</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Production readiness badge */}
          <span className={cn(
            'hidden sm:inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border',
            readinessCfg.bg, readinessCfg.border, readinessCfg.color, readinessCfg.glow
          )}>
            {readinessCfg.label}
          </span>

          {/* Copy report button — paid/admin only */}
          {canViewFull && (
            <CopyReportButton markdown={markdownReport} />
          )}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* Mobile readiness badge */}
        <div className="sm:hidden">
          <span className={cn(
            'inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider border',
            readinessCfg.bg, readinessCfg.border, readinessCfg.color
          )}>
            {readinessCfg.label}
          </span>
        </div>

        {/* Verdict + Executive Summary */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <p className={cn('text-sm font-semibold mb-3', readinessCfg.color)}>
            {scan.security_verdict}
          </p>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {scan.executive_summary}
          </p>
        </div>

        {/* Positive Findings — visible to all users */}
        {positiveFindings.length > 0 && (
          <div>
            <SectionHeader icon={CheckCircle2} title="What Looks Good" />
            <div className="grid gap-2 sm:grid-cols-2">
              {positiveFindings.map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg border border-emerald-500/10 bg-emerald-500/[0.04] px-4 py-3"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-zinc-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Risks — paid/admin only */}
        {canViewFull ? (
          topRisks.length > 0 && (
            <div>
              <SectionHeader icon={AlertTriangle} title="Top Risks" />
              <div className="space-y-3">
                {topRisks.map((risk, i) => {
                  const cfg = getSeverityConfig(risk.severity)
                  return (
                    <div
                      key={i}
                      className="rounded-xl border border-white/5 bg-white/[0.02] p-5"
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          'inline-flex shrink-0 items-center rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider border mt-0.5',
                          cfg.bg, cfg.border, cfg.color
                        )}>
                          {risk.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{risk.title}</p>
                          <p className="mt-1 text-xs text-zinc-500 truncate">{risk.affected_area}</p>
                          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{risk.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        ) : (
          <PaidGate featureName="Top Risks analysis" />
        )}

        {/* Business Impact — paid/admin only */}
        {canViewFull ? (
          scan.business_impact && (
            <div>
              <SectionHeader icon={Briefcase} title="Business Impact" />
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-sm text-zinc-400 leading-relaxed">{scan.business_impact}</p>
              </div>
            </div>
          )
        ) : null}

        {/* Technical Summary — paid/admin only */}
        {canViewFull ? (
          scan.technical_summary && (
            <div>
              <SectionHeader icon={Code2} title="Technical Summary" />
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <p className="text-sm text-zinc-400 leading-relaxed">{scan.technical_summary}</p>
              </div>
            </div>
          )
        ) : null}

        {/* Remediation Plan — paid/admin only */}
        {canViewFull ? (
          remediationPlan.length > 0 && (
            <div>
              <SectionHeader icon={ListOrdered} title="Remediation Plan" />
              <div className="space-y-3">
                {remediationPlan.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-5"
                  >
                    {/* Priority number */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-sm font-black text-primary">
                      {step.priority}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{step.action}</p>
                      <p className="mt-1 text-sm text-zinc-500 leading-relaxed">{step.reason}</p>
                      <span className="mt-2 inline-flex items-center rounded-md bg-white/5 border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-500">
                        ⏱ {step.estimated_effort}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : null}

        {/* Estimated Fix Effort — paid/admin only */}
        {canViewFull && scan.estimated_fix_effort && (
          <div>
            <SectionHeader icon={TrendingUp} title="Estimated Fix Effort" />
            <div className="rounded-xl border border-primary/10 bg-primary/[0.03] px-5 py-4">
              <p className="text-sm font-medium text-zinc-300">{scan.estimated_fix_effort}</p>
            </div>
          </div>
        )}
      </div>
    </GlassPanel>
  )
}
