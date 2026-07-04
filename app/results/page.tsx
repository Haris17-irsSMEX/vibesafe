import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getCompletedScansForUser } from "@/lib/db/scans"
import { Shield, GitFork, ArrowRight, CheckCircle, Clock } from "lucide-react"
import { AppPageContainer, AppPageHeader } from "@/components/layout/app-page"

export default async function ResultsPage() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const completedScans = await getCompletedScansForUser(user.id, 50)

  return (
    <ServerDashboardLayout>
      <AppPageContainer>
        <AppPageHeader
          title="Results"
          description="Review completed scans and detailed security findings."
        />

        <div className="overflow-hidden rounded-xl border border-cc-border bg-cc-surface">
          {completedScans.length > 0 ? (
            <div className="divide-y divide-cc-border">
              {completedScans.map((scan) => (
                <div key={scan.id} className="flex flex-col gap-4 px-5 py-5 transition-colors hover:bg-cc-surface-raised sm:flex-row sm:items-center sm:justify-between sm:px-6">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/15 bg-emerald-500/10">
                      <Shield className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-cc-text">{scan.repo_name}</p>
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-emerald-500/15 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          <CheckCircle className="h-3 w-3" />
                          Score: {scan.security_score ?? 'N/A'}
                        </span>
                      </div>
                      <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-4 text-sm text-cc-subtle">
                        <span className="flex min-w-0 items-center gap-1.5">
                          <GitFork className="h-4 w-4 shrink-0" />
                          <span className="truncate">{scan.repo_full_name}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          {new Date(scan.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end">
                    <Link
                      href={`/results/${scan.id}`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-4 py-2 text-sm font-semibold text-cc-text outline-none transition-colors hover:bg-cc-surface-hover focus-visible:ring-2 focus-visible:ring-white/20"
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
              <Shield className="mx-auto h-14 w-14 text-cc-subtle" />
              <h2 className="mt-4 text-lg font-semibold text-cc-text">No completed scans yet</h2>
              <p className="mt-2 text-sm text-cc-muted">
                Run your first repository scan to uncover vulnerabilities.
              </p>
              <Link
                href="/dashboard/connect"
                className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-cc-text px-5 py-2.5 text-sm font-semibold text-cc-bg transition-colors hover:bg-white"
              >
                <GitFork className="h-4 w-4" />
                Start a New Scan
              </Link>
            </div>
          )}
        </div>
      </AppPageContainer>
    </ServerDashboardLayout>
  )
}
