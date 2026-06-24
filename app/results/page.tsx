import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getCompletedScansForUser } from "@/lib/db/scans"
import { Shield, GitFork, ArrowRight, CheckCircle, Clock } from "lucide-react"

export default async function ResultsPage() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const completedScans = await getCompletedScansForUser(user.id, 50)

  return (
    <ServerDashboardLayout>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Scan Results</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review detailed vulnerability findings from your completed scans.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          {completedScans.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {completedScans.map((scan) => (
                <div key={scan.id} className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                      <Shield className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{scan.repo_name}</p>
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle className="h-3 w-3" />
                          Score: {scan.security_score ?? 'N/A'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <GitFork className="h-4 w-4 text-slate-400" />
                          {scan.repo_full_name}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {new Date(scan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end">
                    <Link
                      href={`/results/${scan.id}`}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
                    >
                      View Findings
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-16 text-center">
              <Shield className="mx-auto h-16 w-16 text-slate-200" />
              <h2 className="mt-4 text-lg font-semibold text-slate-900">No completed scans yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Run your first repository scan to uncover vulnerabilities.
              </p>
              <Link
                href="/dashboard/connect"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <GitFork className="h-4 w-4" />
                Start a New Scan
              </Link>
            </div>
          )}
        </div>
      </div>
    </ServerDashboardLayout>
  )
}
