import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  FileSearch,
  GitFork,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout";
import {
  AppPageContainer,
  AppPageHeader,
  AppSectionHeader,
} from "@/components/layout/app-page";
import {
  DashboardEmptyState,
  StatMetricCard,
  StatusPill,
  SurfaceCard,
} from "@/components/dashboard/dashboard-ui";
import { Sparkline, DonutChart } from "@/components/ui/chart";
import { createClient } from "@/lib/supabase/server";
import {
  getUserProfile,
  getGitHubLoginForUser,
  getUserScanCount,
} from "@/lib/db/users";
import { getRecentScansForUser } from "@/lib/db/scans";
import { getPlanLabel } from "@/lib/plan-label";
import { getAccountUsageSummary } from "@/lib/usage-limits";
import { formatSafeDate } from "@/lib/date";
import { scoreToColor, scoreToLabel } from "@/services/scoring/SecurityScorer";
import { cn } from "@/lib/utils";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const [profile, githubLogin, scanCount, recentScans, usage] = await Promise.all([
    getUserProfile(user.id),
    getGitHubLoginForUser(user.id),
    getUserScanCount(user.id),
    getRecentScansForUser(user.id, 5),
    getAccountUsageSummary(user.id, user.email),
  ]);

  const plan = profile?.plan ?? "free";
  const isConnected = Boolean(githubLogin);
  const hasScans = recentScans.length > 0;
  const completedScans = recentScans.filter(
    (scan) =>
      (scan.status === "complete" || scan.status === "completed") &&
      scan.security_score !== null
  );
  const averageScore =
    completedScans.length > 0
      ? Math.round(
          completedScans.reduce(
            (sum, scan) => sum + (scan.security_score ?? 0),
            0
          ) / completedScans.length
        )
      : null;
  const scoreTrend = completedScans
    .map((scan) => scan.security_score as number)
    .reverse();

  const recentSeverity = recentScans.reduce(
    (summary, scan) => ({
      critical: summary.critical + (scan.critical_count ?? 0),
      high: summary.high + (scan.high_count ?? 0),
      medium: summary.medium + (scan.medium_count ?? 0),
      low: summary.low + (scan.low_count ?? 0),
    }),
    { critical: 0, high: 0, medium: 0, low: 0 }
  );
  const recentFindings =
    recentSeverity.critical +
    recentSeverity.high +
    recentSeverity.medium +
    recentSeverity.low;
  const needsAttention =
    recentSeverity.critical > 0 || recentSeverity.high > 0;

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="wide">
        <AppPageHeader
          title="Dashboard"
          description="Monitor repository security, scan activity, and production readiness."
          badge={
            <span className="inline-flex items-center rounded-full border border-cc-border-strong bg-cc-surface-raised px-3 py-1 text-xs font-semibold text-cc-muted">
              {getPlanLabel(plan)} plan
            </span>
          }
          action={
            <Link
              href="/dashboard/connect"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cc-text px-4 py-2 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
            >
              {isConnected ? (
                <Plus className="h-4 w-4" />
              ) : (
                <GitFork className="h-4 w-4" />
              )}
              {isConnected ? "New scan" : "Connect GitHub"}
            </Link>
          }
        />

        <div className="grid gap-4 xl:grid-cols-12">
          <SurfaceCard className="relative overflow-hidden p-6 sm:p-7 xl:col-span-5">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cc-subtle">
                  Recent security posture
                </p>
                <div className="mt-5 flex items-end gap-3">
                  {averageScore === null ? (
                    <span className="text-3xl font-semibold tracking-[-0.04em] text-cc-text">
                      Not available
                    </span>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "text-6xl font-semibold tracking-[-0.07em]",
                          scoreToColor(averageScore)
                        )}
                      >
                        {averageScore}
                      </span>
                      <span className="pb-2 text-sm text-cc-subtle">/ 100</span>
                    </>
                  )}
                </div>
                <p className="mt-3 text-sm font-medium text-cc-text">
                  {averageScore === null
                    ? "Run a completed scan to establish a baseline."
                    : scoreToLabel(averageScore)}
                </p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-cc-muted">
                  {averageScore === null
                    ? "CtrlCode will summarize recent completed repository reviews here."
                    : needsAttention
                      ? "Critical or high-severity findings in recent scans need review."
                      : "No critical or high-severity findings appear in the recent scan window."}
                </p>
              </div>
              <span
                className={cn(
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border",
                  needsAttention
                    ? "border-orange-500/20 bg-orange-500/10 text-orange-400"
                    : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                )}
              >
                {needsAttention ? (
                  <ShieldAlert className="h-5 w-5" />
                ) : (
                  <ShieldCheck className="h-5 w-5" />
                )}
              </span>
            </div>
            <div className="mt-7 grid grid-cols-2 gap-3 border-t border-cc-border pt-5">
              <div>
                <p className="text-2xl font-semibold text-red-400">
                  {recentSeverity.critical}
                </p>
                <p className="mt-1 text-xs text-cc-subtle">Recent critical</p>
              </div>
              <div>
                <p className="text-2xl font-semibold text-orange-400">
                  {recentSeverity.high}
                </p>
                <p className="mt-1 text-xs text-cc-subtle">Recent high</p>
              </div>
            </div>
          </SurfaceCard>

          <div className="grid gap-4 sm:grid-cols-2 xl:col-span-7">
            <StatMetricCard
              label="Total scans"
              value={scanCount}
              detail="All scan attempts"
              icon={<Activity className="h-4 w-4" />}
            />
            <StatMetricCard
              label="Scans today"
              value={usage.isAdmin ? "Admin" : `${usage.securityScans.used} / ${usage.securityScans.limit}`}
              detail="UTC daily allowance"
              icon={<FileSearch className="h-4 w-4" />}
            />
            <StatMetricCard
              label="System tests today"
              value={usage.isAdmin ? "Admin" : `${usage.systemTests.used} / ${usage.systemTests.limit}`}
              detail="UTC daily allowance"
              icon={<Activity className="h-4 w-4" />}
            />
            <StatMetricCard
              label="Critical findings"
              value={recentSeverity.critical}
              detail="Across five recent scans"
              icon={<ShieldAlert className="h-4 w-4" />}
              tone="critical"
            />
            <StatMetricCard
              label="High findings"
              value={recentSeverity.high}
              detail="Across five recent scans"
              icon={<ShieldAlert className="h-4 w-4" />}
              tone="high"
            />
            <StatMetricCard
              label="GitHub"
              value={isConnected ? `@${githubLogin?.login}` : "Not connected"}
              detail={isConnected ? "Repository access active" : "Connection required"}
              icon={<GitFork className="h-4 w-4" />}
              tone={isConnected ? "safe" : "neutral"}
            />
          </div>
        </div>

        {!hasScans ? (
          <div className="mt-8">
            <DashboardEmptyState connected={isConnected} />
          </div>
        ) : (
          <>
            <div className="mt-10">
              <AppSectionHeader
                title="Security insights"
                description="Based on the five most recent scans currently available."
              />
              <div className="grid gap-4 lg:grid-cols-5">
                <SurfaceCard className="p-6 lg:col-span-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-cc-text">
                        Score trend
                      </h2>
                      <p className="mt-1 text-xs text-cc-subtle">
                        Completed recent scans, oldest to newest
                      </p>
                    </div>
                    <FileSearch className="h-4 w-4 text-cc-subtle" />
                  </div>
                  {scoreTrend.length >= 2 ? (
                    <div className="mt-8 min-h-[210px] w-full">
                      <Sparkline
                        data={scoreTrend}
                        color="#f5f5f5"
                        height={210}
                        width={620}
                      />
                    </div>
                  ) : (
                    <div className="mt-6 flex min-h-[210px] items-center justify-center rounded-xl border border-dashed border-cc-border-strong bg-cc-bg-secondary px-6 text-center">
                      <p className="max-w-sm text-sm leading-6 text-cc-muted">
                        Complete at least two scans to see a real score trend.
                      </p>
                    </div>
                  )}
                </SurfaceCard>

                <SurfaceCard className="flex flex-col p-6 lg:col-span-2">
                  <div>
                    <h2 className="text-sm font-semibold text-cc-text">
                      Severity distribution
                    </h2>
                    <p className="mt-1 text-xs text-cc-subtle">
                      Findings across recent scans
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col items-center justify-center py-7">
                    <div className="relative h-36 w-36">
                      {recentFindings > 0 ? (
                        <DonutChart
                          data={[
                            {
                              label: "Critical",
                              value: recentSeverity.critical,
                              color: "#ef4444",
                            },
                            {
                              label: "High",
                              value: recentSeverity.high,
                              color: "#f97316",
                            },
                            {
                              label: "Medium",
                              value: recentSeverity.medium,
                              color: "#eab308",
                            },
                            {
                              label: "Low",
                              value: recentSeverity.low,
                              color: "#3b82f6",
                            },
                          ]}
                          size={144}
                          strokeWidth={17}
                        />
                      ) : (
                        <div className="h-full w-full rounded-full border-[17px] border-cc-surface-raised" />
                      )}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-semibold text-cc-text">
                          {recentFindings}
                        </span>
                        <span className="text-[10px] uppercase tracking-wider text-cc-subtle">
                          Findings
                        </span>
                      </div>
                    </div>
                    <div className="mt-6 grid w-full grid-cols-2 gap-2 text-xs">
                      {[
                        ["Critical", recentSeverity.critical, "bg-red-500"],
                        ["High", recentSeverity.high, "bg-orange-500"],
                        ["Medium", recentSeverity.medium, "bg-yellow-500"],
                        ["Low", recentSeverity.low, "bg-blue-500"],
                      ].map(([label, value, dot]) => (
                        <div
                          key={String(label)}
                          className="flex items-center justify-between rounded-lg bg-cc-bg-secondary px-3 py-2"
                        >
                          <span className="flex items-center gap-2 text-cc-muted">
                            <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                            {label}
                          </span>
                          <span className="font-medium text-cc-text">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </SurfaceCard>
              </div>
            </div>

            <div className="mt-10">
              <AppSectionHeader
                title="Recent scans"
                description="Latest repository review activity."
                action={
                  <Link
                    href="/results"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-cc-muted transition-colors hover:text-cc-text"
                  >
                    View all results
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                }
              />
              <SurfaceCard className="overflow-hidden">
                <div className="divide-y divide-cc-border">
                  {recentScans.map((scan) => {
                    const completed =
                      scan.status === "complete" ||
                      scan.status === "completed";
                    return (
                      <Link
                        key={scan.id}
                        href={`/results/${scan.id}`}
                        className="group flex min-w-0 flex-col gap-4 px-5 py-5 outline-none transition-colors hover:bg-cc-surface-raised focus-visible:bg-cc-surface-raised sm:flex-row sm:items-center sm:justify-between sm:px-6"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cc-border bg-cc-bg-secondary text-cc-muted transition-colors group-hover:border-cc-border-strong group-hover:text-cc-text">
                            <GithubIcon className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-cc-text">
                              {scan.repo_full_name || scan.repo_name}
                            </p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-cc-subtle">
                              <span>{formatSafeDate(scan.created_at)}</span>
                              <StatusPill status={scan.status} />
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 pl-14 sm:justify-end sm:pl-0">
                          <div className="flex items-center gap-3 text-xs">
                            {scan.critical_count > 0 && (
                              <span className="text-red-400">
                                {scan.critical_count} critical
                              </span>
                            )}
                            {scan.high_count > 0 && (
                              <span className="text-orange-400">
                                {scan.high_count} high
                              </span>
                            )}
                          </div>
                          {completed && scan.security_score !== null ? (
                            <div className="text-right">
                              <p
                                className={cn(
                                  "text-sm font-semibold",
                                  scoreToColor(scan.security_score)
                                )}
                              >
                                {scan.security_score} / 100
                              </p>
                              <p className="text-[10px] uppercase tracking-wider text-cc-subtle">
                                {scoreToLabel(scan.security_score)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-xs text-cc-subtle">
                              Score pending
                            </span>
                          )}
                          <ArrowRight className="h-4 w-4 shrink-0 text-cc-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-cc-text" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </SurfaceCard>
            </div>
          </>
        )}
      </AppPageContainer>
    </ServerDashboardLayout>
  );
}
