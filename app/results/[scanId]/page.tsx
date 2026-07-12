import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ExternalLink,
  FileSearch,
  GitBranch,
  ShieldAlert,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getScanById, type ScanRecord } from "@/lib/db/scans";
import {
  getScanResultsForScan,
  getScanResultsForScanFree,
} from "@/lib/db/scan-results";
import {
  getUserProfile,
  upsertUserProfile,
  isPaidPlan,
} from "@/lib/db/users";
import { isAdminEmail } from "@/lib/auth/admin";
import { FindingsList } from "@/components/results/FindingsList";
import { SecurityOfficerReport } from "@/components/results/SecurityOfficerReport";
import { GenerateSecurityReportButton } from "@/components/results/GenerateSecurityReportButton";
import {
  MetadataChip,
  ReadinessBadge,
  ResultSurface,
  RiskSummaryGrid,
} from "@/components/results/result-ui";
import { StatusPill } from "@/components/dashboard/dashboard-ui";
import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout";
import {
  AppPageContainer,
  AppSectionHeader,
} from "@/components/layout/app-page";
import { formatSecurityReportMarkdown } from "@/services/scanner/SecurityReportFormatter";
import {
  scoreToColor,
  scoreToLabel,
} from "@/services/scoring/SecurityScorer";
import { getPlanLabel } from "@/lib/plan-label";
import { formatSafeDateTime } from "@/lib/date";
import { cn } from "@/lib/utils";

interface ResultsPageProps {
  params: {
    scanId: string;
  };
}

function getScoreSummary(scan: ScanRecord): string {
  if (scan.security_score === null) return "Score not available.";
  if (scan.security_score === 100)
    return "No vulnerabilities were detected in this scan.";
  if (scan.critical_count > 0)
    return "Critical security issues require immediate attention.";
  if (scan.high_count > 0)
    return "High-severity findings need review before production release.";
  if (scan.medium_count > 0 || scan.low_count > 0)
    return "Review the recorded improvements before release.";
  return "No recorded findings.";
}

function sanitizeReportForFreeUser(scan: ScanRecord): ScanRecord {
  return {
    ...scan,
    top_risks: [],
    remediation_plan: [],
    business_impact: null,
    technical_summary: null,
    estimated_fix_effort: null,
    audit_checklist: [],
    priority_plan: [],
  };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { scanId } = params;

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const scan = await getScanById(scanId, user.id);

  if (!scan) {
    return (
      <ServerDashboardLayout>
        <AppPageContainer size="narrow">
          <ResultSurface className="flex flex-col items-center px-6 py-14 text-center">
            <ShieldAlert className="h-7 w-7 text-red-400" />
            <h1 className="mt-4 text-lg font-semibold text-cc-text">
              Scan not found
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-cc-muted">
              This scan does not exist or you do not have permission to view it.
            </p>
            <Link
              href="/results"
              className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-4 text-sm font-medium text-cc-text hover:bg-cc-surface-hover"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to results
            </Link>
          </ResultSurface>
        </AppPageContainer>
      </ServerDashboardLayout>
    );
  }

  let profile = await getUserProfile(user.id);
  if (!profile) {
    await upsertUserProfile(user.id, user.email ?? null);
    profile = await getUserProfile(user.id);
  }

  const userPlan = profile?.plan ?? "free";
  const paid = isPaidPlan(userPlan);
  const isAdmin = isAdminEmail(user.email);
  const canViewFull = isAdmin || paid;

  // SECURITY: free users receive the reduced query shape only.
  const findings = canViewFull
    ? await getScanResultsForScan(scanId)
    : await getScanResultsForScanFree(scanId);

  const markdownReport =
    canViewFull && scan.executive_summary
      ? formatSecurityReportMarkdown(
          {
            executive_summary: scan.executive_summary ?? "",
            security_verdict: scan.security_verdict ?? "",
            production_readiness:
              (scan.production_readiness as
                | "ready"
                | "needs_attention"
                | "not_ready"
                | "critical_risk") ?? "needs_attention",
            top_risks:
              (scan.top_risks as {
                title: string;
                severity: string;
                explanation: string;
                affected_area: string;
              }[]) ?? [],
            positive_findings: (scan.positive_findings as string[]) ?? [],
            remediation_plan:
              (scan.remediation_plan as {
                priority: number;
                action: string;
                reason: string;
                estimated_effort: string;
              }[]) ?? [],
            business_impact: scan.business_impact ?? "",
            technical_summary: scan.technical_summary ?? "",
            estimated_fix_effort: scan.estimated_fix_effort ?? "",
          },
          scan,
          findings.map((finding) => ({
            severity: finding.severity,
            check_name: finding.check_name,
            file_path: finding.file_path,
            category: finding.category,
          })),
          (scan.audit_checklist as import("@/lib/types").AuditChecklistItem[]) ??
            [],
          (scan.quick_wins as string[]) ?? []
        )
      : "";

  // SECURITY: paid-only report fields are removed before the client boundary.
  const reportScan = canViewFull ? scan : sanitizeReportForFreeUser(scan);
  const reportStatus = scan.report_status ?? (scan.executive_summary ? "generated" : "not_generated");
  const analysisWarnings = Array.isArray(scan.analysis_warnings)
    ? scan.analysis_warnings.filter((warning): warning is string => typeof warning === "string" && Boolean(warning.trim()))
    : [];

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="wide">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/results"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-cc-muted outline-none transition-colors hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Results archive
          </Link>
          <Link
            href={`/scan/${scanId}`}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-3 text-sm font-medium text-cc-text transition-colors hover:bg-cc-surface-hover"
          >
            View scan terminal
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <ResultSurface className="overflow-hidden">
          <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={scan.status} />
                <ReadinessBadge readiness={scan.production_readiness} />
                <span className="inline-flex rounded-full border border-cc-border-strong bg-cc-surface-raised px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-cc-muted">
                  {getPlanLabel(userPlan)} plan
                </span>
                {isAdmin && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                    <ShieldAlert className="h-3 w-3" />
                    Admin access
                  </span>
                )}
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-cc-subtle">
                Security Officer Report
              </p>
              <h1 className="mt-2 truncate text-2xl font-semibold tracking-[-0.03em] text-cc-text sm:text-3xl">
                {scan.repo_full_name || scan.repo_name}
              </h1>
              {scan.security_verdict && (
                <p className="mt-3 max-w-3xl text-sm leading-6 text-cc-muted">
                  {scan.security_verdict}
                </p>
              )}

              <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2">
                <MetadataChip
                  icon={<GitBranch className="h-3.5 w-3.5" />}
                  mono
                >
                  {scan.default_branch || "Branch unavailable"}
                </MetadataChip>
                <MetadataChip icon={<Calendar className="h-3.5 w-3.5" />}>
                  {formatSafeDateTime(
                    scan.completed_at ?? scan.created_at,
                    scan.completed_at ? "Not available" : "Pending"
                  )}
                </MetadataChip>
                {scan.repo_url && (
                  <a
                    href={scan.repo_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-cc-border bg-cc-bg-secondary px-2.5 text-xs text-cc-muted transition-colors hover:border-cc-border-strong hover:text-cc-text"
                  >
                    Open repository
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-cc-border bg-cc-bg-secondary p-5 text-center">
              {scan.security_score !== null ? (
                <>
                  <p
                    className={cn(
                      "text-5xl font-semibold tracking-[-0.06em]",
                      scoreToColor(scan.security_score)
                    )}
                  >
                    {scan.security_score}
                  </p>
                  <p className="mt-1 text-xs text-cc-subtle">out of 100</p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-cc-text">
                    {scoreToLabel(scan.security_score)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-cc-text">
                    Score pending
                  </p>
                  <p className="mt-2 text-xs leading-5 text-cc-muted">
                    A score has not been recorded.
                  </p>
                </>
              )}
              <p className="mt-3 text-xs leading-5 text-cc-muted">
                {getScoreSummary(scan)}
              </p>
            </div>
          </div>
        </ResultSurface>

        <div className="mt-4">
          <RiskSummaryGrid
            critical={scan.critical_count}
            high={scan.high_count}
            medium={scan.medium_count}
            low={scan.low_count}
            total={scan.total_findings}
          />
        </div>

        <div className="mt-10">
          {scan.executive_summary ? (
            <SecurityOfficerReport
              scan={reportScan}
              findings={findings}
              canViewFull={canViewFull}
              isAdmin={isAdmin}
              markdownReport={markdownReport}
            />
          ) : (
            <ResultSurface className="mb-10 px-5 py-10 text-center sm:px-6">
              <FileSearch className="mx-auto h-6 w-6 text-cc-subtle" />
              <h2 className="mt-4 text-base font-semibold text-cc-text">
                {reportStatus === "generating" ? "Security Officer Report is generating" : "Security Officer Report"}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cc-muted">
                {reportStatus === "generating"
                  ? "Your evidence-backed findings are already available below. The report is being summarized from those saved results."
                  : "Generate an executive summary, prioritized risks, and remediation roadmap from the saved evidence-backed findings. Findings remain available even if report generation fails."}
              </p>
              {reportStatus === "failed" && scan.report_error && (
                <p role="alert" className="mx-auto mt-3 max-w-md text-sm leading-6 text-amber-300">
                  {scan.report_error}
                </p>
              )}
              {reportStatus !== "generated" && (
                <GenerateSecurityReportButton
                  scanId={scanId}
                  status={reportStatus === "failed" || reportStatus === "generating" ? reportStatus : "not_generated"}
                />
              )}
            </ResultSurface>
          )}
        </div>

        {analysisWarnings.length > 0 && (
          <div className="mb-10 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm leading-6 text-amber-200">
            {analysisWarnings.join(" ")}
          </div>
        )}

        <div>
          <AppSectionHeader
            title="Security findings"
            description={`${findings.length} ${findings.length === 1 ? "finding" : "findings"} recorded in this review.`}
          />
          <FindingsList
            findings={findings}
            scanId={scanId}
            isPaid={canViewFull}
          />
        </div>
      </AppPageContainer>
    </ServerDashboardLayout>
  );
}
