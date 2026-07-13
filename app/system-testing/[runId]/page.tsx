import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, Clock3, ExternalLink, Globe2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSystemTestFindingsForRun, getSystemTestRunForUser, type SystemTestCategory, type SystemTestSeverity } from "@/lib/db/system-tests";
import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout";
import { AppPageContainer, AppPageHeader, AppSectionHeader } from "@/components/layout/app-page";
import { SurfaceCard } from "@/components/dashboard/dashboard-ui";
import { formatSafeDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

const categoryLabels: Record<SystemTestCategory, string> = {
  broken_page: "Broken page",
  broken_link: "Broken link",
  console_error: "Console error",
  network_error: "Network error",
  dead_button: "Unresponsive button",
  runtime_error: "Runtime error",
  accessibility_basic: "Accessibility",
  performance_basic: "Performance",
};

const severityClasses: Record<SystemTestSeverity, string> = {
  high: "border-red-500/20 bg-red-500/10 text-red-300",
  medium: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  low: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  info: "border-cc-border-strong bg-cc-surface-raised text-cc-muted",
};

function RunStatus({ status }: { status: string }) {
  const classes = status === "completed"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    : status === "failed"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : "border-blue-500/20 bg-blue-500/10 text-blue-300";
  return <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", classes)}>{status}</span>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "high" | "medium" | "low" }) {
  const colors = {
    neutral: "text-cc-text",
    high: "text-red-400",
    medium: "text-orange-400",
    low: "text-blue-400",
  };
  return <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4"><p className="text-xs font-medium uppercase tracking-[0.13em] text-cc-subtle">{label}</p><p className={cn("mt-2 text-2xl font-semibold", colors[tone])}>{value}</p></div>;
}

export default async function SystemTestResultsPage({ params }: { params: { runId: string } }) {
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(params.runId)) notFound();
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const run = await getSystemTestRunForUser(params.runId, user.id);
  if (!run) notFound();
  const findings = await getSystemTestFindingsForRun(run.id, user.id);
  const counts = run.summary?.severityCounts ?? { high: 0, medium: 0, low: 0, info: 0 };

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="wide">
        <Link href="/system-testing" className="mb-5 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-cc-muted outline-none transition-colors hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20"><ArrowLeft className="h-4 w-4" />System Testing</Link>
        <AppPageHeader
          title="System Test Results"
          description="Evidence collected from safe, same-origin public-page checks."
          badge={<RunStatus status={run.status} />}
          action={<a href={run.target_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-4 py-2 text-sm font-medium text-cc-text transition-colors hover:bg-cc-surface-hover focus-visible:ring-2 focus-visible:ring-white/20"><ExternalLink className="h-4 w-4" />Open target</a>}
        />

        <SurfaceCard className="p-5 sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cc-subtle"><Globe2 className="h-3.5 w-3.5" />Target system</div>
              <p className="mt-2 break-all text-base font-semibold text-cc-text">{run.target_url}</p>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cc-subtle"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Started {formatSafeDateTime(run.started_at ?? run.created_at)}</span><span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Completed {formatSafeDateTime(run.completed_at, run.status === "running" ? "Running" : "Not available")}</span></p>
            </div>
          </div>
          {run.error_message && <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><p>{run.error_message}</p></div>}
        </SurfaceCard>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Pages checked" value={run.summary?.pagesChecked ?? 0} />
          <Metric label="High" value={counts.high} tone="high" />
          <Metric label="Medium" value={counts.medium} tone="medium" />
          <Metric label="Low" value={counts.low} tone="low" />
          <Metric label="Total findings" value={findings.length} />
        </div>

        <section className="mt-10">
          <AppSectionHeader title="Observed findings" description="Each entry is based on a captured browser response, error, request, or safe interaction trace." />
          {findings.length === 0 ? (
            <SurfaceCard className="flex flex-col items-center px-6 py-14 text-center"><CheckCircle2 className="h-6 w-6 text-emerald-400" /><h2 className="mt-4 text-lg font-semibold text-cc-text">No deterministic issues observed</h2><p className="mt-2 max-w-lg text-sm leading-6 text-cc-muted">The completed public-page checks did not produce an evidence-backed finding. This does not prove the system is free of defects.</p></SurfaceCard>
          ) : (
            <div className="space-y-4">
              {findings.map((finding) => (
                <SurfaceCard key={finding.id} className="overflow-hidden p-5 sm:p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", severityClasses[finding.severity])}>{finding.severity}</span><span className="rounded-full border border-cc-border bg-cc-bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cc-muted">{categoryLabels[finding.category]}</span></div>
                      <h2 className="mt-4 text-base font-semibold text-cc-text">{finding.title}</h2>
                      <p className="mt-2 text-sm leading-6 text-cc-muted">{finding.actual_result}</p>
                    </div>
                    <span className="max-w-full shrink-0 rounded-lg border border-cc-border bg-cc-bg-secondary px-3 py-2 font-mono text-xs text-cc-muted lg:max-w-sm">{finding.page_url}</span>
                  </div>
                  <div className="mt-5 grid gap-4 border-t border-cc-border pt-5 lg:grid-cols-2">
                    <div><h3 className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">Evidence</h3><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-cc-border bg-cc-bg p-3 text-xs leading-5 text-cc-muted">{JSON.stringify(finding.evidence, null, 2)}</pre></div>
                    <div><h3 className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">Reproduction</h3><ol className="mt-2 space-y-2 text-sm leading-6 text-cc-muted">{finding.reproduction_steps.map((step, index) => <li key={`${finding.id}-${index}`} className="flex gap-2"><span className="font-mono text-cc-subtle">{index + 1}.</span><span>{step}</span></li>)}</ol>{finding.action && <p className="mt-4 text-xs text-cc-subtle">Action: <span className="text-cc-muted">{finding.action}</span></p>}</div>
                  </div>
                </SurfaceCard>
              ))}
            </div>
          )}
        </section>
        {run.summary && (
          <SurfaceCard className="mt-6 p-4 sm:p-5">
            <h2 className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">Run diagnostics</h2>
            <div className="mt-3 grid gap-3 text-sm text-cc-muted sm:grid-cols-2 lg:grid-cols-4">
              <p><span className="font-medium text-cc-text">{run.summary.actionableFindings ?? findings.length}</span> actionable findings</p>
              <p><span className="font-medium text-cc-text">{run.summary.ignoredAbortedRequests ?? 0}</span> cancelled requests ignored</p>
              <p><span className="font-medium text-cc-text">{run.summary.ignoredStaticRequests ?? 0}</span> static/framework events ignored</p>
              <p><span className="font-medium text-cc-text">{(run.summary.ignoredDuplicateFindings ?? 0) + (run.summary.ignoredConsoleEvents ?? 0)}</span> duplicate/noise events ignored</p>
              <p><span className="font-medium text-cc-text">{run.summary.ignoredRscConsoleMessages ?? 0}</span> RSC console messages ignored</p>
              <p><span className="font-medium text-cc-text">{run.summary.ignoredFrameworkConsoleNoise ?? 0}</span> framework console messages ignored</p>
              <p><span className="font-medium text-cc-text">{run.summary.ignoredDuplicateConsoleErrors ?? 0}</span> duplicate console errors ignored</p>
              <p><span className="font-medium text-cc-text">{run.summary.actionableConsoleErrors ?? 0}</span> actionable console errors</p>
            </div>
            <p className="mt-3 text-xs leading-5 text-cc-subtle">MVP coverage: up to {run.summary.limits.maxPages} same-origin public pages at depth {run.summary.limits.maxDepth}. Forms, payments, destructive actions, and external domains are excluded.</p>
          </SurfaceCard>
        )}
      </AppPageContainer>
    </ServerDashboardLayout>
  );
}
