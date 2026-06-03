'use client'

import Link from 'next/link'
import { FileCode, AlertCircle, ChevronRight, Hash } from 'lucide-react'
import type { ScanResultRecord } from '@/lib/db/scan-results'
import { SeverityBadge, type SeverityLevel } from './SeverityBadge'

interface FindingsListProps {
  findings: ScanResultRecord[]
  scanId: string
}

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

export function FindingsList({ findings, scanId }: FindingsListProps) {
  // Sort findings by severity
  const sortedFindings = [...findings].sort((a, b) => {
    const aOrder = SEVERITY_ORDER[a.severity as SeverityLevel] ?? 99
    const bOrder = SEVERITY_ORDER[b.severity as SeverityLevel] ?? 99
    return aOrder - bOrder
  })

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 shadow-sm">
          <AlertCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">No issues found in this scan.</h3>
        <p className="mt-2 text-sm text-slate-600 max-w-sm">
          DeepSeek security analysis did not identify any critical, high, medium, or low severity issues.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sortedFindings.map((finding) => (
        <Link
          key={finding.id}
          href={`/results/${scanId}/${finding.id}`}
          className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 space-y-3">
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
              
              <div>
                <h4 className="text-base font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">
                  {finding.check_name}
                </h4>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                  {finding.description}
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-slate-500">
                <FileCode className="h-4 w-4 shrink-0 text-slate-400" />
                <span className="truncate font-mono text-xs text-slate-600">{finding.file_path}</span>
                {finding.line_number && (
                  <span className="font-mono text-xs text-slate-400">
                    :{finding.line_number}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center shrink-0 sm:self-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600">
                <ChevronRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
