import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getScanById } from '@/lib/db/scans'
import { getScanResultById, getScanResultByIdFree } from '@/lib/db/scan-results'
import type { ScanResultRecord, FreeScanResultRecord } from '@/lib/db/scan-results'
import { getUserProfile, upsertUserProfile, isPaidPlan } from '@/lib/db/users'
import { SeverityBadge, type SeverityLevel } from '@/components/results/SeverityBadge'
import { CopyButton } from '@/components/results/CopyButton'
import { UpgradeCTA } from '@/components/results/UpgradeCTA'
import {
  ArrowLeft,
  Clock,
  FileCode,
  Hash,
  AlertTriangle,
  ShieldCheck,
  Lock,
} from 'lucide-react'

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

  // 2. Verify scan ownership (user cannot access another user's results)
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

  // 3. Load user profile & detect plan
  let profile = await getUserProfile(user.id)
  if (!profile) {
    await upsertUserProfile(user.id, user.email ?? null)
    profile = await getUserProfile(user.id)
  }
  const userPlan = profile?.plan ?? 'free'
  const paid = isPaidPlan(userPlan)

  // 4. Fetch finding — GATED at DB level based on plan.
  //    For free users, premium fields (description, why_it_matters, vulnerable_code,
  //    fix_code, fix_prompt) are NEVER queried from the database.
  //    For paid users, fetch the full record.
  let paidFinding: ScanResultRecord | null = null
  let freeFinding: FreeScanResultRecord | null = null

  if (paid) {
    paidFinding = await getScanResultById(findId, user.id)
    if (!paidFinding || paidFinding.scan_id !== scanId) {
      return (
        <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Finding not found</h2>
          <Link href={`/results/${scanId}`} className="text-indigo-600 hover:underline mt-4 inline-block">
            Return to Results
          </Link>
        </div>
      )
    }
  } else {
    freeFinding = await getScanResultByIdFree(findId, user.id)
    if (!freeFinding || freeFinding.scan_id !== scanId) {
      return (
        <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-lg font-semibold text-slate-900">Finding not found</h2>
          <Link href={`/results/${scanId}`} className="text-indigo-600 hover:underline mt-4 inline-block">
            Return to Results
          </Link>
        </div>
      )
    }
  }

  // 5. Build a safe base object with fields common to both free & paid
  //    This is the only data we render in the shared header section.
  const baseFinding = paid ? paidFinding! : freeFinding!

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

      {/* ── Header — visible to all plans ─────────────────────────────── */}
      <div className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SeverityBadge severity={baseFinding.severity as SeverityLevel} />
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
            {baseFinding.category}
          </span>
          {baseFinding.cwe_id && (
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2.5 py-1 text-sm font-medium text-indigo-700">
              <Hash className="h-3.5 w-3.5" />
              {baseFinding.cwe_id}
            </span>
          )}
          {/* effort_minutes only on paid records */}
          {paid && paidFinding?.effort_minutes && (
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-1 text-sm font-medium text-slate-600">
              <Clock className="h-3.5 w-3.5" />
              ~{paidFinding.effort_minutes} min to fix
            </span>
          )}
        </div>

        <h1 className="text-3xl font-bold text-slate-900">{baseFinding.check_name}</h1>

        <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 max-w-full overflow-hidden">
          <FileCode className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate font-mono">{baseFinding.file_path}</span>
          {baseFinding.line_number && (
            <span className="shrink-0 text-slate-400">line {baseFinding.line_number}</span>
          )}
        </div>
      </div>

      {/* ── FREE USER: locked panels + upgrade CTA ────────────────────── */}
      {!paid && (
        <div className="space-y-6">
          {/* Description locked panel */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-700">Issue Description</h2>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <Lock className="h-3 w-3" />
                Paid only
              </span>
            </div>
            <div className="p-6 space-y-4">
              {/* Placeholder text — NOT real DB data */}
              <div className="relative overflow-hidden rounded-lg">
                <p
                  className="select-none whitespace-pre-wrap text-slate-700 blur-[6px]"
                  aria-hidden="true"
                >
                  This security issue has a detailed explanation covering root cause,
                  attack vectors, and real-world impact. The full description helps you
                  understand why this vulnerability exists and how it could be exploited
                  in your specific codebase context.
                </p>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/70 backdrop-blur-[2px]">
                  <Lock className="h-6 w-6 text-slate-400" />
                  <p className="text-sm font-medium text-slate-600">Full description locked</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <div className="relative overflow-hidden rounded-lg">
                  <p
                    className="select-none text-sm text-slate-600 blur-[5px]"
                    aria-hidden="true"
                  >
                    Why it matters: This vulnerability can lead to serious security
                    consequences including data exposure, account takeover, or remote
                    code execution depending on the attack surface.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-white/60 backdrop-blur-[1px]">
                    <Lock className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-xs font-medium text-slate-600">
                      Upgrade to see why it matters
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code context locked panel */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-2">
              <FileCode className="h-5 w-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-700">Code Context &amp; Fix</h2>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <Lock className="h-3 w-3" />
                Paid only
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
              <div className="rounded-xl border border-red-200 overflow-hidden shadow-sm">
                <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-xs font-semibold text-red-800 uppercase tracking-wide">
                  Vulnerable Code
                </div>
                <div className="bg-slate-950 p-4 min-h-[100px] flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="h-5 w-5 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-500 mt-2">Locked on free plan</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
                <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                  Suggested Fix
                </div>
                <div className="bg-slate-950 p-4 min-h-[100px] flex items-center justify-center">
                  <div className="text-center">
                    <Lock className="h-5 w-5 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-500 mt-2">Locked on free plan</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Fix Prompt locked panel */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50 px-6 py-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-slate-400" />
              <h2 className="text-base font-semibold text-slate-700">AI Fix Prompt</h2>
              <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                <Lock className="h-3 w-3" />
                Paid only
              </span>
            </div>
            <div className="p-6">
              <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-indigo-50/30">
                <div className="px-5 py-4">
                  <p
                    className="select-none text-sm text-slate-700 font-mono whitespace-pre-wrap blur-[5px]"
                    aria-hidden="true"
                  >
                    Fix the security vulnerability in [FILE_PATH] at line [LINE].
                    The issue is [DESCRIPTION]. Apply the suggested fix and verify
                    that the change does not break existing functionality.
                  </p>
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-1.5 bg-white/60 backdrop-blur-[1px]">
                  <Lock className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-600">
                    Unlock copy-paste fixes for Cursor, Claude, or your IDE
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Upgrade CTA */}
          <UpgradeCTA context="detail" />
        </div>
      )}

      {/* ── PAID USER: full finding detail ────────────────────────────── */}
      {paid && paidFinding && (
        <div className="space-y-8">
          {/* Description */}
          <section>
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-indigo-500" />
              Issue Description
            </h2>
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="whitespace-pre-wrap text-slate-700">{paidFinding.description}</p>

              <div className="mt-6 pt-6 border-t border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">Why it matters</h3>
                <p className="whitespace-pre-wrap text-sm text-slate-600">{paidFinding.why_it_matters}</p>
              </div>
            </div>
          </section>

          {/* Code Diff / Snippets */}
          {(paidFinding.vulnerable_code || paidFinding.fix_code) && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <FileCode className="h-5 w-5 text-indigo-500" />
                Code Context
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {paidFinding.vulnerable_code && (
                  <div className="rounded-xl border border-red-200 overflow-hidden shadow-sm flex flex-col">
                    <div className="bg-red-50 border-b border-red-100 px-4 py-2 text-xs font-semibold text-red-800 uppercase tracking-wide">
                      Vulnerable Code
                    </div>
                    <div className="bg-slate-950 p-4 overflow-x-auto flex-1">
                      <pre className="text-sm text-red-300 font-mono">
                        <code>{paidFinding.vulnerable_code}</code>
                      </pre>
                    </div>
                  </div>
                )}

                {paidFinding.fix_code && (
                  <div className="rounded-xl border border-emerald-200 overflow-hidden shadow-sm flex flex-col">
                    <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-800 uppercase tracking-wide flex justify-between items-center">
                      <span>Suggested Fix</span>
                      <CopyButton
                        text={paidFinding.fix_code}
                        className="py-1 px-2 text-[10px] uppercase tracking-wider bg-transparent border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      />
                    </div>
                    <div className="bg-slate-950 p-4 overflow-x-auto flex-1">
                      <pre className="text-sm text-emerald-300 font-mono">
                        <code>{paidFinding.fix_code}</code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Fix Prompt */}
          {paidFinding.fix_prompt && (
            <section>
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2 mb-3">
                <ShieldCheck className="h-5 w-5 text-indigo-500" />
                AI Fix Prompt
              </h2>
              <div className="rounded-xl border border-slate-200 bg-indigo-50/30 overflow-hidden shadow-sm">
                <div className="px-5 py-4 flex justify-between items-start gap-4">
                  <p className="text-sm text-slate-700 font-mono whitespace-pre-wrap">
                    {paidFinding.fix_prompt}
                  </p>
                  <CopyButton text={paidFinding.fix_prompt} />
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
