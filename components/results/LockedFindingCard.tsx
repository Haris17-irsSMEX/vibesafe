'use client'

import { Lock, FileCode, Hash } from 'lucide-react'
import { SeverityBadge, type SeverityLevel } from './SeverityBadge'
import type { FreeScanResultRecord } from '@/lib/db/scan-results'
import { GlowCard } from '@/components/ui/glow-card'

interface LockedFindingCardProps {
  finding: FreeScanResultRecord
}

/**
 * Renders a finding card for free users.
 * Shows: severity, category, file path, check name, CWE.
 * Premium content area shows a locked/blurred placeholder.
 * No links to finding detail — detail page gating handles that separately.
 */
export function LockedFindingCard({ finding }: LockedFindingCardProps) {
  return (
    <GlowCard
      className="group block p-5 bg-card/50"
      aria-label={`Finding: ${finding.check_name} — premium details locked`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
        <div className="flex-1 space-y-4">
          {/* Badges row */}
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

          {/* Check name */}
          <div>
            <h4 className="text-base font-semibold text-foreground">
              {finding.check_name}
            </h4>

            {/* Blurred premium description placeholder */}
            <div className="relative mt-3 overflow-hidden rounded-lg border border-white/5 bg-black/50">
              <p
                className="select-none text-sm leading-relaxed text-zinc-500 blur-[6px] p-4"
                aria-hidden="true"
              >
                This issue has a detailed security explanation and recommended fix
                available for paid plan users. Upgrade to see the full analysis
                including why it matters and what to do next to secure your application.
              </p>
              {/* Lock overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 backdrop-blur-[2px]">
                <div className="flex items-center gap-2 bg-zinc-900/90 border border-white/10 px-4 py-2 rounded-full shadow-xl">
                  <Lock className="h-4 w-4 text-zinc-400" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">
                    Upgrade to unlock full details
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* File path */}
          <div className="flex items-center gap-2 text-sm">
            <FileCode className="h-4 w-4 shrink-0 text-zinc-500" />
            <span className="truncate font-mono text-xs text-zinc-400">
              {finding.file_path}
            </span>
            {finding.line_number && (
              <span className="font-mono text-xs text-zinc-500">
                :{finding.line_number}
              </span>
            )}
          </div>
        </div>

        {/* Lock icon and prompt badge */}
        <div className="flex items-center shrink-0 sm:self-center gap-3">
          <div className="hidden sm:flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 border border-zinc-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Fix prompt locked
            </span>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 border border-white/10 text-zinc-500">
            <Lock className="h-4 w-4" />
          </div>
        </div>
      </div>
    </GlowCard>
  )
}
