import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getScanById } from '@/lib/db/scans'
import {
  getScanResultsForScan,
  getScanResultsForScanFree,
} from '@/lib/db/scan-results'
import { getUserProfile, upsertUserProfile, isPaidPlan } from '@/lib/db/users'
import { FindingsList } from '@/components/results/FindingsList'
import { ArrowLeft, ExternalLink, GitBranch, Calendar } from 'lucide-react'

interface ResultsPageProps {
  params: {
    scanId: string
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { scanId } = params

  // 1. Verify user session
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Load scan & verify ownership (server-side, never trusts client input)
  const scan = await getScanById(scanId, user.id)

  if (!scan) {
    return (
      <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-900">Scan not found</h2>
          <p className="mt-2 text-sm text-red-700">
            This scan does not exist or you do not have permission to view it.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center text-sm font-medium text-red-700 hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  // 3. Load user profile & detect plan
  //    Auto-provision a free profile row if not yet created (first login edge case)
  let profile = await getUserProfile(user.id)
  if (!profile) {
    await upsertUserProfile(user.id, user.email ?? null)
    profile = await getUserProfile(user.id)
  }
  const userPlan = profile?.plan ?? 'free'
  const paid = isPaidPlan(userPlan)

  // 4. Fetch findings — GATED at the DB query level
  //    Free users: only safe fields (no description/fix_code/fix_prompt etc.)
  //    Paid users: full fields
  const findings = paid
    ? await getScanResultsForScan(scanId)
    : await getScanResultsForScanFree(scanId)

  return (
    <div className="mx-auto max-w-4xl py-10 px-4 sm:px-6 lg:px-8">
      {/* Back link */}
      <Link
        href={`/scan/${scanId}`}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to scan terminal
      </Link>

      {/* Header Summary */}
      <div className="mb-10 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Security Scan Results</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <a
                href={scan.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-indigo-600 hover:underline"
              >
                {scan.repo_full_name}
                <ExternalLink className="h-3 w-3" />
              </a>
              <span className="flex items-center gap-1">
                <GitBranch className="h-4 w-4 text-slate-400" />
                {scan.default_branch}
              </span>
              {scan.completed_at && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatDate(scan.completed_at)}
                </span>
              )}
              {/* Plan badge */}
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                  paid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                {userPlan} plan
              </span>
            </div>
          </div>
          {scan.security_score !== null && (
            <div className="mt-4 sm:mt-0 flex shrink-0 items-center justify-center rounded-xl bg-slate-900 px-5 py-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{scan.security_score}</div>
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">Score</div>
              </div>
            </div>
          )}
        </div>

        {/* Counts */}
        <div className="grid grid-cols-2 divide-x divide-y sm:divide-y-0 divide-slate-100 sm:grid-cols-5 bg-white">
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{scan.critical_count}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Critical</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{scan.high_count}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">High</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{scan.medium_count}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Medium</p>
          </div>
          <div className="p-4 text-center">
            <p className="text-2xl font-bold text-slate-600">{scan.low_count}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Low</p>
          </div>
          <div className="p-4 text-center sm:border-l border-slate-100 col-span-2 sm:col-span-1">
            <p className="text-2xl font-bold text-indigo-600">{scan.total_findings}</p>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-1">Total</p>
          </div>
        </div>
      </div>

      {/* Findings List */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Findings Details</h2>
        <FindingsList findings={findings} scanId={scanId} isPaid={paid} />
      </div>
    </div>
  )
}
