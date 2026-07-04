import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Calendar,
  FileSearch,
  GitFork,
  Plus,
} from "lucide-react";
import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout";
import {
  AppPageContainer,
  AppPageHeader,
} from "@/components/layout/app-page";
import {
  ReadinessBadge,
  ResultSurface,
} from "@/components/results/result-ui";
import { StatusPill } from "@/components/dashboard/dashboard-ui";
import { createClient } from "@/lib/supabase/server";
import { getCompletedScansForUser } from "@/lib/db/scans";
import { formatSafeDate } from "@/lib/date";
import { scoreToColor, scoreToLabel } from "@/services/scoring/SecurityScorer";
import { cn } from "@/lib/utils";

export default async function ResultsPage() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const completedScans = await getCompletedScansForUser(user.id, 50);

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="wide">
        <AppPageHeader
          title="Results"
          description="Review past repository scans, security scores, and production-readiness reports."
          action={
            <Link
              href="/dashboard/connect"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cc-text px-4 py-2 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
            >
              <Plus className="h-4 w-4" />
              New scan
            </Link>
          }
        />

        {completedScans.length > 0 ? (
          <ResultSurface className="overflow-hidden">
            <div className="border-b border-cc-border bg-cc-bg-secondary px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-cc-text">
                    Security archive
                  </h2>
                  <p className="mt-1 text-xs text-cc-subtle">
                    {completedScans.length} completed{" "}
                    {completedScans.length === 1 ? "review" : "reviews"}
                  </p>
                </div>
                <FileSearch className="h-4 w-4 text-cc-subtle" />
              </div>
            </div>

            <div className="divide-y divide-cc-border">
              {completedScans.map((scan) => (
                <article
                  key={scan.id}
                  className="group px-5 py-5 transition-colors hover:bg-cc-surface-raised sm:px-6"
                >
                  <div className="flex min-w-0 flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-4">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cc-border bg-cc-bg-secondary text-cc-muted transition-colors group-hover:border-cc-border-strong group-hover:text-cc-text">
                        <GitFork className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          <h3 className="max-w-full truncate text-base font-semibold text-cc-text">
                            {scan.repo_full_name || scan.repo_name}
                          </h3>
                          <StatusPill status={scan.status} />
                          <ReadinessBadge
                            readiness={scan.production_readiness}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-cc-subtle">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatSafeDate(
                              scan.completed_at ?? scan.created_at
                            )}
                          </span>
                          <span className="font-mono">
                            {scan.default_branch || "Branch unavailable"}
                          </span>
                        </div>
                        {scan.security_verdict && (
                          <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-cc-muted">
                            {scan.security_verdict}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pl-[3.75rem] sm:flex-row sm:items-center sm:justify-between lg:shrink-0 lg:justify-end lg:pl-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-md border border-red-500/15 bg-red-500/10 px-2 py-1 text-red-400">
                          {scan.critical_count} critical
                        </span>
                        <span className="rounded-md border border-orange-500/15 bg-orange-500/10 px-2 py-1 text-orange-400">
                          {scan.high_count} high
                        </span>
                        <span className="rounded-md border border-amber-500/15 bg-amber-500/10 px-2 py-1 text-amber-400">
                          {scan.medium_count} medium
                        </span>
                        <span className="rounded-md border border-blue-500/15 bg-blue-500/10 px-2 py-1 text-blue-400">
                          {scan.low_count} low
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4 sm:justify-end">
                        <div className="min-w-20 text-left sm:text-right">
                          {scan.security_score !== null ? (
                            <>
                              <p
                                className={cn(
                                  "text-lg font-semibold",
                                  scoreToColor(scan.security_score)
                                )}
                              >
                                {scan.security_score}
                                <span className="text-xs font-normal text-cc-subtle">
                                  {" "}
                                  / 100
                                </span>
                              </p>
                              <p className="text-[10px] uppercase tracking-wider text-cc-subtle">
                                {scoreToLabel(scan.security_score)}
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-cc-subtle">
                              Score unavailable
                            </p>
                          )}
                        </div>
                        <Link
                          href={`/results/${scan.id}`}
                          className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-4 py-2 text-sm font-semibold text-cc-text outline-none transition-colors hover:bg-cc-surface-hover focus-visible:ring-2 focus-visible:ring-white/20"
                        >
                          View report
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </ResultSurface>
        ) : (
          <ResultSurface className="flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cc-border-strong bg-cc-surface-raised text-cc-muted">
              <FileSearch className="h-5 w-5" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-cc-text">
              No scan results yet
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-cc-muted">
              Connect GitHub and run your first CtrlCode review.
            </p>
            <Link
              href="/dashboard/connect"
              className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-cc-text px-5 py-2.5 text-sm font-semibold text-cc-bg transition-colors hover:bg-white"
            >
              <GitFork className="h-4 w-4" />
              Connect GitHub
            </Link>
          </ResultSurface>
        )}
      </AppPageContainer>
    </ServerDashboardLayout>
  );
}
