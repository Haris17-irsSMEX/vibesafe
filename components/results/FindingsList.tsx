'use client'

import Link from 'next/link'
import { FileCode, AlertCircle, ChevronRight, Hash } from 'lucide-react'
import type { ScanResultRecord, FreeScanResultRecord, GatedScanResultRecord } from '@/lib/db/scan-results'
import { isPaidResult } from '@/lib/db/scan-results'
import { SeverityBadge, type SeverityLevel } from './SeverityBadge'
import { LockedFindingCard } from './LockedFindingCard'
import { UpgradeCTA } from './UpgradeCTA'
import { GlowCard } from '@/components/ui/glow-card'

interface FindingsListProps {
  findings: GatedScanResultRecord[]
  scanId: string
  isPaid: boolean
}

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

function PaidFindingCard({
  finding,
  scanId,
}: {
  finding: ScanResultRecord
  scanId: string
}) {
  return (
    <Link
      key={finding.id}
      href={`/results/${scanId}/${finding.id}`}
      className="group block transition-all"
      aria-label={`View finding: ${finding.check_name}`}
    >
      <GlowCard className="p-5 hover:border-primary/50 hover:shadow-[0_0_20px_-5px_rgba(124,58,237,0.3)] transition-all bg-card/50">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <SeverityBadge severity={finding.severity as SeverityLevel} />
              <span className="inline-flex items-center rounded-md bg-white/5 border border-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                {finding.category}
              </span>
              {finding.cwe_id && (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                  <Hash className="h-3 w-3" />
                  {finding.cwe_id}
                </span>
              )}
            </div>

            <div>
              <h4 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                {finding.check_name}
              </h4>
              <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                {finding.description}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <FileCode className="h-4 w-4 shrink-0 text-zinc-500" />
              <span className="truncate font-mono text-xs text-zinc-400">{finding.file_path}</span>
              {finding.line_number && (
                <span className="font-mono text-xs text-zinc-500">
                  :{finding.line_number}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center shrink-0 sm:self-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-500 transition-all group-hover:bg-primary group-hover:border-primary group-hover:text-white group-hover:shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <ChevronRight className="h-5 w-5" />
            </div>
          </div>
        </div>
      </GlowCard>
    </Link>
  )
}

export function FindingsList({ findings, scanId, isPaid }: FindingsListProps) {
  // Sort findings by severity
  const sortedFindings = [...findings].sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity as SeverityLevel] ?? 99
    const bOrder = SEVERITY_ORDER[b.severity as SeverityLevel] ?? 99
    return aOrder - bOrder
  })

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-card/30 py-20 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 shadow-inner relative mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl animate-pulse" />
          <AlertCircle className="h-10 w-10 text-emerald-500 relative z-10" />
        </div>
        <h3 className="text-xl font-bold text-foreground">No issues found in this scan.</h3>
        <p className="mt-3 text-sm text-muted-foreground max-w-md">
          DeepSeek security analysis did not identify any critical, high, medium, or low severity issues. Your codebase is clean!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Upgrade CTA banner for free users — shown once at the top */}
      {!isPaid && (
        <UpgradeCTA
          context="overview"
          className="mb-8"
        />
      )}

      {sortedFindings.map((finding) => {
        if (isPaid && isPaidResult(finding)) {
          return (
            <PaidFindingCard key={finding.id} finding={finding} scanId={scanId} />
          )
        }
        // Free user: show locked card (FreeScanResultRecord)
        return (
          <LockedFindingCard
            key={finding.id}
            finding={finding as FreeScanResultRecord}
          />
        )
      })}
    </div>
  )
}
