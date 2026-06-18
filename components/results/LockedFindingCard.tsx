'use client'

import { Lock, FileCode, Hash } from 'lucide-react'
import { SeverityBadge, type SeverityLevel } from './SeverityBadge'
import type { FreeScanResultRecord } from '@/lib/db/scan-results'

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
    <div
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      aria-label={`Finding: ${finding.check_name} — premium details locked`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 space-y-3">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-3">
            <SeverityBadge severity={finding.severity as SeverityLevel} />
            <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {finding.category}
            </span>
            {finding.cwe_id && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
                <Hash className="h-3 w-3" />
                {finding.cwe_id}
              </span>
            )}
          </div>

          {/* Check name */}
          <div>
            <h4 className="text-base font-semibold text-slate-900">
              {finding.check_name}
            </h4>

            {/* Blurred premium description placeholder */}
            <div className="relative mt-2 overflow-hidden rounded-lg">
              <p
                className="select-none text-sm leading-relaxed text-slate-600 blur-[5px]"
                aria-hidden="true"
              >
                This issue has a detailed security explanation and recommended fix
                available for paid plan users. Upgrade to see the full analysis
                including why it matters and what to do next.
              </p>
              {/* Lock overlay */}
              <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-white/60 backdrop-blur-[1px]">
                <Lock className="h-3.5 w-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">
                  Upgrade to unlock full description
                </span>
              </div>
            </div>
          </div>

          {/* File path */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <FileCode className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate font-mono text-xs text-slate-600">
              {finding.file_path}
            </span>
            {finding.line_number && (
              <span className="font-mono text-xs text-slate-400">
                :{finding.line_number}
              </span>
            )}
          </div>
        </div>

        {/* Lock icon */}
        <div className="flex items-center shrink-0 sm:self-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400">
            <Lock className="h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
