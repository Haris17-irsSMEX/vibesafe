import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Calendar, CheckCircle2, ChevronRight, Clock3, ExternalLink, Globe2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSystemTestFindingsForRun, getSystemTestRunForUser, type SystemTestCategory, type SystemTestFindingRecord, type SystemTestSeverity } from "@/lib/db/system-tests";
import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout";
import { AppPageContainer, AppPageHeader, AppSectionHeader } from "@/components/layout/app-page";
import { SurfaceCard } from "@/components/dashboard/dashboard-ui";
import { formatSafeDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

const categoryLabels: Record<SystemTestCategory, string> = {
  broken_page: "Broken page",
  broken_link: "Broken link",
  console_error: "Browser/runtime issue",
  network_error: "Failed request",
  dead_button: "Dead button",
  runtime_error: "App runtime error",
  accessibility_basic: "Basic accessibility issue",
  performance_basic: "Basic performance issue",
  workflow_failure: "Workflow failed",
  missing_element: "Missing button or text",
  expectation_failed: "Expected result did not happen",
  safety_skipped: "Step skipped for safety",
};

const severityClasses: Record<SystemTestSeverity, string> = {
  high: "border-red-500/20 bg-red-500/10 text-red-300",
  medium: "border-orange-500/20 bg-orange-500/10 text-orange-300",
  low: "border-blue-500/20 bg-blue-500/10 text-blue-300",
  info: "border-cc-border-strong bg-cc-surface-raised text-cc-muted",
};

const categoryGuidance: Record<SystemTestCategory, { why: string; next: string }> = {
  broken_page: { why: "Visitors may be unable to reach this page.", next: "Open the affected route and correct the server or route failure." },
  broken_link: { why: "Visitors can be sent to a page that does not exist.", next: "Correct the link target and retest the navigation." },
  console_error: { why: "Browser errors can affect rendering or a user interaction.", next: "Reproduce the captured browser message and resolve its underlying cause." },
  network_error: { why: "A required request did not complete successfully.", next: "Inspect the captured request and its response in the affected page." },
  dead_button: { why: "A visible control may not give users the expected result.", next: "Confirm the control is wired to a safe, visible action." },
  runtime_error: { why: "The app encountered an error while running in the browser.", next: "Reproduce the error on the affected page and fix the failing code path." },
  accessibility_basic: { why: "Some visitors may have trouble using this part of the page.", next: "Review the captured element and address the accessibility observation." },
  performance_basic: { why: "This observation may affect the page experience.", next: "Review the captured evidence and optimise the relevant resource or interaction." },
  workflow_failure: { why: "A safe public workflow did not complete as expected.", next: "Follow the recorded workflow step and correct the blocked behavior." },
  missing_element: { why: "The workflow could not find the expected public control or text.", next: "Check whether the expected label or page content changed." },
  expectation_failed: { why: "The page did not reach the expected URL or visible content.", next: "Follow the recorded workflow and correct the unexpected navigation or content." },
  safety_skipped: { why: "CtrlCode intentionally did not perform an unsafe action.", next: "No product fix is required; use a safe public workflow step instead." },
};

function friendlyFindingLabel(finding: SystemTestFindingRecord) {
  if (finding.category === "console_error" && finding.severity === "low") return "Minor browser warning";
  return categoryLabels[finding.category];
}

function RunStatus({ status }: { status: string }) {
  const classes = status === "completed" || status === "passed"
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
    : status === "failed"
      ? "border-red-500/20 bg-red-500/10 text-red-300"
      : status === "partial" || status === "skipped"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
        : "border-blue-500/20 bg-blue-500/10 text-blue-300";
  return <span className={cn("inline-flex h-auto w-auto shrink-0 self-start rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide leading-none", classes)}>{status}</span>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "high" | "medium" | "low" }) {
  const colors = { neutral: "text-cc-text", high: "text-red-400", medium: "text-orange-400", low: "text-blue-400" };
  return <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4"><p className="text-xs font-medium uppercase tracking-[0.13em] text-cc-subtle">{label}</p><p className={cn("mt-2 text-2xl font-semibold", colors[tone])}>{value}</p></div>;
}

function SummaryMessage({ findings, pagesChecked }: { findings: SystemTestFindingRecord[]; pagesChecked: number }) {
  const high = findings.filter((finding) => finding.severity === "high").length;
  const medium = findings.filter((finding) => finding.severity === "medium").length;
  const low = findings.filter((finding) => finding.severity === "low").length;
  const brokenPages = findings.filter((finding) => finding.category === "broken_page" || finding.category === "broken_link").length;
  const failedRequests = findings.filter((finding) => finding.category === "network_error").length;
  const browserIssues = findings.filter((finding) => finding.category === "console_error" || finding.category === "runtime_error").length;
  const headline = high > 0 ? "Critical workflow problems found." : medium > 0 ? "Some important issues need attention." : low > 0 ? "Only minor issues were found." : "No actionable issues were found in this safe public-page test.";
  const body = high > 0 ? "Fix the highest-severity issues before launch." : medium > 0 ? "Review the prioritised next steps below before sharing this flow with users." : low > 0 ? "Nothing launch-blocking was observed. Review minor warnings when convenient." : "CtrlCode checked public pages and safe navigation only. Authenticated and destructive workflows were not tested.";
  return <SurfaceCard className="mt-5 overflow-hidden"><div className="border-b border-cc-border bg-cc-surface-raised px-5 py-5 sm:px-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-cc-subtle">Plain-English summary</p><h2 className="mt-2 text-xl font-semibold text-cc-text">{headline}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-cc-muted">{body}</p></div><div className="grid divide-y divide-cc-border sm:grid-cols-4 sm:divide-x sm:divide-y-0"><div className="p-4"><p className="text-2xl font-semibold text-cc-text">{pagesChecked}</p><p className="mt-1 text-xs text-cc-muted">pages checked</p></div><div className="p-4"><p className="text-2xl font-semibold text-cc-text">{brokenPages}</p><p className="mt-1 text-xs text-cc-muted">broken pages or links</p></div><div className="p-4"><p className="text-2xl font-semibold text-cc-text">{failedRequests}</p><p className="mt-1 text-xs text-cc-muted">failed requests</p></div><div className="p-4"><p className="text-2xl font-semibold text-cc-text">{browserIssues}</p><p className="mt-1 text-xs text-cc-muted">browser/runtime issues</p></div></div></SurfaceCard>;
}

function FindingCard({ finding }: { finding: SystemTestFindingRecord }) {
  const guidance = categoryGuidance[finding.category];
  return <SurfaceCard className="overflow-hidden p-5 sm:p-6"><div className="flex flex-col gap-4 lg:flex-row lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider", severityClasses[finding.severity])}>{finding.severity}</span><span className="rounded-full border border-cc-border bg-cc-bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cc-muted">{friendlyFindingLabel(finding)}</span></div><h2 className="mt-4 text-base font-semibold text-cc-text">{finding.title}</h2></div><span className="max-w-full shrink-0 rounded-lg border border-cc-border bg-cc-bg-secondary px-3 py-2 font-mono text-xs text-cc-muted lg:max-w-sm">{finding.page_url}</span></div><dl className="mt-5 grid gap-4 border-t border-cc-border pt-5 sm:grid-cols-2"><div><dt className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">What happened</dt><dd className="mt-2 text-sm leading-6 text-cc-muted">{finding.actual_result}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">Why it matters</dt><dd className="mt-2 text-sm leading-6 text-cc-muted">{guidance.why}</dd></div><div><dt className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">How to reproduce</dt><dd><ol className="mt-2 space-y-2 text-sm leading-6 text-cc-muted">{finding.reproduction_steps.map((step, index) => <li key={`${finding.id}-${index}`} className="flex gap-2"><span className="font-mono text-cc-subtle">{index + 1}.</span><span>{step}</span></li>)}</ol></dd></div><div><dt className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">Suggested next step</dt><dd className="mt-2 text-sm leading-6 text-cc-muted">{guidance.next}</dd></div></dl><details className="mt-5 rounded-lg border border-cc-border bg-cc-bg-secondary p-3.5"><summary className="cursor-pointer text-sm font-medium text-cc-text">Advanced evidence and technical details</summary><div className="mt-3 grid gap-4 lg:grid-cols-2"><div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">Expected result</p><p className="mt-1 text-sm leading-6 text-cc-muted">{finding.expected_result ?? "Not specified"}</p>{finding.action && <><p className="mt-3 text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">Observed action</p><p className="mt-1 text-sm leading-6 text-cc-muted">{finding.action}</p></>}</div><div><p className="text-xs font-semibold uppercase tracking-[0.13em] text-cc-subtle">Raw evidence</p><pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-cc-border bg-cc-bg p-3 text-xs leading-5 text-cc-muted">{JSON.stringify(finding.evidence ?? {}, null, 2)}</pre></div></div></details></SurfaceCard>;
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
  const workflow = run.summary?.workflow ?? null;
  const workflowSteps = workflow && Array.isArray(workflow.steps) ? workflow.steps : [];
  const workflowCounts = workflow?.counts ?? { passed: 0, failed: 0, skipped: 0 };
  const priorityOrder: Record<SystemTestSeverity, number> = { high: 0, medium: 1, low: 2, info: 3 };
  const nextSteps = [...findings].sort((a, b) => priorityOrder[a.severity] - priorityOrder[b.severity]).slice(0, 3);

  return <ServerDashboardLayout><AppPageContainer size="wide"><Link href="/system-testing" className="mb-5 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-cc-muted outline-none transition-colors hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20"><ArrowLeft className="h-4 w-4" />System Testing</Link><AppPageHeader title="System Test Results" description="A clear view of what CtrlCode observed during safe public-page testing." badge={<RunStatus status={run.status} />} action={<a href={run.target_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-4 py-2 text-sm font-medium text-cc-text transition-colors hover:bg-cc-surface-hover focus-visible:ring-2 focus-visible:ring-white/20"><ExternalLink className="h-4 w-4" />Open target</a>} />
    <SurfaceCard className="p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-cc-subtle"><Globe2 className="h-3.5 w-3.5" />Target system</div><p className="mt-2 break-all text-base font-semibold text-cc-text">{run.target_url}</p><p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-cc-subtle"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Started {formatSafeDateTime(run.started_at ?? run.created_at)}</span><span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />Completed {formatSafeDateTime(run.completed_at, run.status === "running" ? "Running" : "Not available")}</span></p></div></div>{run.error_message && <div role="alert" className="mt-5 flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" /><p>{run.error_message}</p></div>}</SurfaceCard>
    {run.status === "failed" ? <SurfaceCard className="mt-5 p-6"><h2 className="text-lg font-semibold text-cc-text">System test could not complete.</h2><p className="mt-2 text-sm leading-6 text-cc-muted">{run.error_message ?? "The test stopped before it could collect a complete result."}</p><Link href="/system-testing" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-cc-text px-4 py-2 text-sm font-semibold text-cc-bg outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30">Run another test <ChevronRight className="h-4 w-4" /></Link></SurfaceCard> : <><SummaryMessage findings={findings} pagesChecked={run.summary?.pagesChecked ?? 0} /><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Metric label="Pages checked" value={run.summary?.pagesChecked ?? 0} /><Metric label="High" value={counts.high} tone="high" /><Metric label="Medium" value={counts.medium} tone="medium" /><Metric label="Low" value={counts.low} tone="low" /><Metric label="Total findings" value={findings.length} /></div></>}
    {nextSteps.length > 0 && <section className="mt-10"><AppSectionHeader title="What to fix next" description="Prioritised from the evidence captured in this test." /><SurfaceCard className="divide-y divide-cc-border">{nextSteps.map((finding, index) => <div key={finding.id} className="flex gap-4 p-5 sm:p-6"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cc-border bg-cc-bg-secondary text-xs font-semibold text-cc-muted">{index + 1}</span><div><p className="text-sm font-semibold text-cc-text">{finding.title}</p><p className="mt-1 text-sm leading-6 text-cc-muted">{categoryGuidance[finding.category].next}</p></div></div>)}</SurfaceCard></section>}
    {workflow && <section className="mt-10"><AppSectionHeader title="Workflow result" description="A deterministic record of the safe public workflow you asked CtrlCode to test." /><SurfaceCard className="overflow-hidden"><div className="flex flex-col gap-4 border-b border-cc-border p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6"><div><p className="text-base font-semibold text-cc-text">{workflow.name}</p>{workflow.goal && <p className="mt-1 text-sm text-cc-muted">{workflow.goal}</p>}</div><RunStatus status={workflow.status} /></div><div className="grid gap-3 border-b border-cc-border p-5 sm:grid-cols-3 sm:p-6"><Metric label="Steps passed" value={workflowCounts.passed} /><Metric label="Steps failed" value={workflowCounts.failed} tone="medium" /><Metric label="Steps skipped safely" value={workflowCounts.skipped} tone="low" /></div><ol className="divide-y divide-cc-border">{workflowSteps.map((step) => <li key={step.index} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:gap-4 sm:p-6"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cc-border bg-cc-bg-secondary font-mono text-xs text-cc-muted">{step.index}</span><div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-sm font-semibold capitalize text-cc-text">{step.type.replace(/([A-Z])/g, " $1")}</p><p className="mt-1 text-sm leading-6 text-cc-muted">{step.actualResult ?? step.detail}</p><dl className="mt-3 grid gap-2 text-xs text-cc-subtle"><div><dt className="inline font-semibold uppercase tracking-[0.12em]">Expected: </dt><dd className="inline">{step.expectedResult ?? "The requested safe step should complete."}</dd></div><div><dt className="inline font-semibold uppercase tracking-[0.12em]">Where: </dt><dd className="inline break-all font-mono">{step.urlAfter}</dd></div></dl></div><RunStatus status={step.status} /></div></li>)}</ol></SurfaceCard></section>}
    <section className="mt-10"><AppSectionHeader title="Observed issues" description="Every issue below is tied to browser evidence captured during this safe test." />{findings.length === 0 ? <SurfaceCard className="flex flex-col items-center px-6 py-14 text-center"><CheckCircle2 className="h-6 w-6 text-emerald-400" /><h2 className="mt-4 text-lg font-semibold text-cc-text">No actionable issues were found in this safe public-page test.</h2><p className="mt-2 max-w-lg text-sm leading-6 text-cc-muted">CtrlCode checked public pages and safe navigation only. Authenticated and destructive workflows were not tested.</p></SurfaceCard> : <div className="space-y-4">{findings.map((finding) => <FindingCard key={finding.id} finding={finding} />)}</div>}</section>
    {run.summary && <details className="mt-6 rounded-xl border border-cc-border bg-cc-surface p-4 sm:p-5"><summary className="cursor-pointer text-sm font-medium text-cc-text">Technical run details</summary><div className="mt-4 grid gap-3 text-sm text-cc-muted sm:grid-cols-2 lg:grid-cols-4"><p><span className="font-medium text-cc-text">{run.summary.actionableFindings ?? findings.length}</span> actionable findings</p><p><span className="font-medium text-cc-text">{run.summary.ignoredAbortedRequests ?? 0}</span> cancelled requests ignored</p><p><span className="font-medium text-cc-text">{run.summary.ignoredStaticRequests ?? 0}</span> static/framework events ignored</p><p><span className="font-medium text-cc-text">{(run.summary.ignoredDuplicateFindings ?? 0) + (run.summary.ignoredConsoleEvents ?? 0)}</span> duplicate/noise events ignored</p><p><span className="font-medium text-cc-text">{run.summary.ignoredRscConsoleMessages ?? 0}</span> RSC console messages ignored</p><p><span className="font-medium text-cc-text">{run.summary.ignoredFrameworkConsoleNoise ?? 0}</span> framework console messages ignored</p><p><span className="font-medium text-cc-text">{run.summary.ignoredDuplicateConsoleErrors ?? 0}</span> duplicate console errors ignored</p><p><span className="font-medium text-cc-text">{run.summary.actionableConsoleErrors ?? 0}</span> actionable console errors</p></div><p className="mt-3 text-xs leading-5 text-cc-subtle">MVP coverage: up to {run.summary.limits.maxPages} same-origin public pages at depth {run.summary.limits.maxDepth}. Forms, payments, destructive actions, and external domains are excluded.</p></details>}
  </AppPageContainer></ServerDashboardLayout>;
}
