import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getScanById } from '@/lib/db/scans'
import { getScanResultById } from '@/lib/db/scan-results'
import { SeverityBadge, type SeverityLevel } from '@/components/results/SeverityBadge'
import { CopyButton } from '@/components/results/CopyButton'
import { ArrowLeft, Clock, FileCode, Hash, AlertTriangle, ShieldCheck } from 'lucide-react'

interface FindingDetailPageProps {
  params: {
    scanId: string
    findId: string
  }
}

export default async function FindingDetailPage({ params }: FindingDetailPageProps) {
  const { scanId, findId } = params

  // 1. Verify user session
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Verify scan ownership
  const scan = await getScanById(scanId, user.id)
  if (!scan) {
    return (
      <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Scan not found</h2>
        <Link href="/dashboard" className="text-indigo-600 hover:underline mt-4 inline-block">
          Return to Dashboard
        </Link>
      </div>
    )
  }

  // 3. Load finding
  const finding = await getScanResultById(findId, user.id)
  if (!finding || finding.scan_id !== scanId) {
    return (
      <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-lg font-semibold text-slate-900">Finding not found</h2>
        <Link href={`/results/${scanId}`} className="text-indigo-600 hover:underline mt-4 inline-block">
          Return to Results
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl py-10 px-4 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href={`/results/${scanId}`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to results
      </Link>

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SeverityBadge severity={finding.severity as SeverityLevel} />
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
            {finding.category}
          </span>
          {finding.cwe_id && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-sm font-medium text-indigo-700">
              <Hash className="h-3.5 w-3.5" />
              {finding.cwe_id}
            </span>
          )}
          {finding.effort_minutes && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
              <Clock className="h-3.5 w-3.5" />
              ~{finding.effort_minutes} min to fix
            </span>
          )}
        </div>
        <h1 className="text-3xl font-bold text-slate-900">{finding.check_name}</h1>
        
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 inline-flex max-w-full overflow-hidden">
          <FileCode className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate font-mono">{finding.file_path}</span>
          {finding.line_number && (
            <span className="shrink-0 text-slate-400">line {finding.line_number}</span>
          )}
        </div>
      </div>

      <div className="space-y-8">
        {/* Description */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-indigo-500" />
            Issue Description
          </h2>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="whitespace-pre-wrap text-slate-700">{finding.description}</p>
            
            <div className="mt-6 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Why it matters</h3>
              <p className="whitespace-pre-wrap text-sm text-slate-600">{finding.why_it_matters}</p>
            </div>
          </div>
        </section>

        {/* Code Diff / Snippets */}
        {(finding.vulnerable_code || finding.fix_code) && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <FileCode className="h-5 w-5 text-indigo-500" />
              Code Context
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {finding.vulnerable_code && (
                <div className="rounded-xl border border-red-200 overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-xs font-semibold text-red-800 uppercase tracking-wide">
                    Vulnerable Code
                  </div>
                  <div className="bg-slate-950 p-4 overflow-x-auto flex-1">
                    <pre className="text-sm text-red-300 font-mono">
                      <code>{finding.vulnerable_code}</code>
                    </pre>
                  </div>
                </div>
              )}
              
              {finding.fix_code && (
                <div className="rounded-xl border border-emerald-200 overflow-hidden shadow-sm flex flex-col relative group">
                  <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800 uppercase tracking-wide flex justify-between items-center">
                    <span>Suggested Fix</span>
                    <CopyButton text={finding.fix_code} className="py-1 px-2 text-[10px] uppercase tracking-wider bg-transparent border-emerald-200 text-emerald-700 hover:bg-emerald-100" />
                  </div>
                  <div className="bg-slate-950 p-4 overflow-x-auto flex-1">
                    <pre className="text-sm text-emerald-300 font-mono">
                      <code>{finding.fix_code}</code>
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Fix Prompt */}
        {finding.fix_prompt && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <ShieldCheck className="h-5 w-5 text-indigo-500" />
              AI Fix Prompt
            </h2>
            <div className="rounded-xl border border-slate-200 bg-indigo-50/30 overflow-hidden shadow-sm">
              <div className="px-5 py-4 flex justify-between items-start gap-4">
                <p className="text-sm text-slate-700 font-mono whitespace-pre-wrap">{finding.fix_prompt}</p>
                <CopyButton text={finding.fix_prompt} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
