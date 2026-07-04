"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Briefcase,
  CheckCircle2,
  CheckSquare,
  Clock3,
  Code2,
  Lightbulb,
  ListOrdered,
  Lock,
  Shield,
  Zap,
} from "lucide-react";
import type { ScanRecord } from "@/lib/db/scans";
import type { GatedScanResultRecord } from "@/lib/db/scan-results";
import type { AuditChecklistItem } from "@/lib/types";
import { CopyReportButton } from "./CopyReportButton";
import {
  ReadinessBadge,
  ReportSection,
  ResultSurface,
} from "./result-ui";
import { cn } from "@/lib/utils";

interface TopRisk {
  title: string;
  severity: string;
  explanation: string;
  affected_area: string;
}

interface RemediationStep {
  priority: number;
  action: string;
  reason: string;
  estimated_effort: string;
}

interface SecurityOfficerReportProps {
  scan: ScanRecord;
  findings?: GatedScanResultRecord[];
  canViewFull: boolean;
  isAdmin?: boolean;
  markdownReport: string;
}

const severityStyles: Record<string, string> = {
  CRITICAL: "border-red-500/20 bg-red-500/10 text-red-400",
  HIGH: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  MEDIUM: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  LOW: "border-blue-500/20 bg-blue-500/10 text-blue-400",
};

const checklistStyles: Record<string, string> = {
  pass: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  fail: "border-red-500/20 bg-red-500/10 text-red-400",
  partial: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  na: "border-cc-border-strong bg-cc-surface-raised text-cc-muted",
};

function ChecklistBadge({ verdict }: { verdict: string }) {
  const normalized = verdict?.toLowerCase() || "na";
  return (
    <span
      className={cn(
        "inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
        checklistStyles[normalized] ?? checklistStyles.na
      )}
    >
      {normalized === "na" ? "N/A" : normalized}
    </span>
  );
}

function PaidGate({ featureName }: { featureName: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-cc-border-strong bg-cc-bg-secondary px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-cc-border-strong bg-cc-surface-raised text-cc-muted">
        <Lock className="h-4 w-4" />
      </span>
      <p className="mt-4 text-sm font-semibold text-cc-text">
        {featureName} is locked
      </p>
      <p className="mt-1 max-w-sm text-xs leading-5 text-cc-muted">
        Unlock full risk analysis, remediation guidance, and agent-ready fixes.
      </p>
      <Link
        href="/pricing"
        className="mt-4 inline-flex min-h-9 items-center rounded-lg border border-cc-border-strong bg-cc-surface-raised px-3 text-xs font-semibold text-cc-text transition-colors hover:bg-cc-surface-hover"
      >
        View plans
      </Link>
    </div>
  );
}

export function SecurityOfficerReport({
  scan,
  canViewFull,
  isAdmin,
  markdownReport,
}: SecurityOfficerReportProps) {
  if (!scan.executive_summary) return null;

  const topRisks = Array.isArray(scan.top_risks)
    ? (scan.top_risks as TopRisk[])
    : [];
  const positiveFindings = Array.isArray(scan.positive_findings)
    ? (scan.positive_findings as string[])
    : [];
  const whatIsDoneRight = Array.isArray(scan.what_is_done_right)
    ? scan.what_is_done_right
    : [];
  const remediationPlan = Array.isArray(scan.remediation_plan)
    ? (scan.remediation_plan as RemediationStep[])
    : [];
  const quickWins = Array.isArray(scan.quick_wins) ? scan.quick_wins : [];
  const checklist = Array.isArray(scan.audit_checklist)
    ? (scan.audit_checklist as AuditChecklistItem[])
    : [];
  const strengths =
    whatIsDoneRight.length > 0 ? whatIsDoneRight : positiveFindings;

  return (
    <ResultSurface className="mb-10 overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-cc-border bg-cc-bg-secondary px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cc-border-strong bg-cc-surface-raised text-cc-text">
            <Shield className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-cc-text">
              Security Officer Report
            </h2>
            <p className="mt-0.5 text-xs text-cc-subtle">
              Executive posture and remediation guidance
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ReadinessBadge readiness={scan.production_readiness} />
          {canViewFull && markdownReport && (
            <CopyReportButton markdown={markdownReport} />
          )}
        </div>
      </div>

      {isAdmin && checklist.length === 0 && (
        <div className="flex items-center gap-2 border-b border-cc-border bg-amber-500/5 px-5 py-2.5 text-xs text-amber-400/80 sm:px-6">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>Admin note: structured audit metadata is unavailable.</span>
        </div>
      )}

      <div className="space-y-8 p-5 sm:p-6">
        <section className="rounded-xl border border-cc-border bg-cc-bg-secondary p-5 sm:p-6">
          {scan.security_verdict && (
            <p className="text-sm font-semibold text-cc-text">
              {scan.security_verdict}
            </p>
          )}
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-cc-muted">
            {scan.executive_summary}
          </p>
        </section>

        {canViewFull &&
          (scan.business_impact ||
            scan.technical_summary ||
            scan.estimated_fix_effort) && (
            <div className="grid gap-3 lg:grid-cols-3">
              {scan.business_impact && (
                <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4">
                  <div className="flex items-center gap-2 text-cc-muted">
                    <Briefcase className="h-4 w-4" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                      Business impact
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-cc-muted">
                    {scan.business_impact}
                  </p>
                </div>
              )}
              {scan.technical_summary && (
                <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4">
                  <div className="flex items-center gap-2 text-cc-muted">
                    <Code2 className="h-4 w-4" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                      Technical summary
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-cc-muted">
                    {scan.technical_summary}
                  </p>
                </div>
              )}
              {scan.estimated_fix_effort && (
                <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4">
                  <div className="flex items-center gap-2 text-cc-muted">
                    <Clock3 className="h-4 w-4" />
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em]">
                      Estimated effort
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-cc-text">
                    {scan.estimated_fix_effort}
                  </p>
                </div>
              )}
            </div>
          )}

        {quickWins.length > 0 && (
          <ReportSection
            icon={<Zap className="h-4 w-4" />}
            title="Quick wins"
            description="High-impact improvements that can be addressed first."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {quickWins.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-3.5"
                >
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="text-sm leading-6 text-cc-muted">{item}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {strengths.length > 0 && (
          <ReportSection
            icon={<CheckCircle2 className="h-4 w-4" />}
            title="What is done right"
            description="Existing controls and practices worth preserving."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {strengths.map((item, index) => (
                <div
                  key={`${item}-${index}`}
                  className="flex items-start gap-3 rounded-xl border border-emerald-500/10 bg-emerald-500/[0.04] px-4 py-3.5"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <p className="text-sm leading-6 text-cc-muted">{item}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        <ReportSection
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Top risks"
          description="Prioritized risks identified by the security review."
        >
          {canViewFull ? (
            topRisks.length > 0 ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {topRisks.map((risk, index) => {
                  const severity = risk.severity?.toUpperCase() || "MEDIUM";
                  return (
                    <article
                      key={`${risk.title}-${index}`}
                      className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <span
                          className={cn(
                            "inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider",
                            severityStyles[severity] ??
                              severityStyles.MEDIUM
                          )}
                        >
                          {severity}
                        </span>
                        {risk.affected_area && (
                          <span className="max-w-full truncate font-mono text-[10px] text-cc-subtle">
                            {risk.affected_area}
                          </span>
                        )}
                      </div>
                      <h4 className="mt-3 text-sm font-semibold text-cc-text">
                        {risk.title}
                      </h4>
                      <p className="mt-2 text-sm leading-6 text-cc-muted">
                        {risk.explanation}
                      </p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4 text-sm text-cc-muted">
                No prioritized risks were included in this report.
              </p>
            )
          ) : (
            <PaidGate featureName="Top risk analysis" />
          )}
        </ReportSection>

        {canViewFull && remediationPlan.length > 0 && (
          <ReportSection
            icon={<ListOrdered className="h-4 w-4" />}
            title="Remediation roadmap"
            description="Ordered actions from the generated remediation plan."
          >
            <ol className="relative space-y-3 before:absolute before:bottom-5 before:left-4 before:top-5 before:w-px before:bg-cc-border-strong">
              {remediationPlan.map((step, index) => (
                <li
                  key={`${step.action}-${index}`}
                  className="relative flex items-start gap-4 rounded-xl border border-cc-border bg-cc-bg-secondary p-4"
                >
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cc-border-strong bg-cc-surface-raised text-xs font-semibold text-cc-text">
                    {step.priority || index + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-cc-text">
                      {step.action}
                    </h4>
                    {step.reason && (
                      <p className="mt-1.5 text-sm leading-6 text-cc-muted">
                        {step.reason}
                      </p>
                    )}
                    {step.estimated_effort && (
                      <span className="mt-2 inline-flex rounded-md border border-cc-border bg-cc-surface-raised px-2 py-1 text-[10px] text-cc-subtle">
                        {step.estimated_effort}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </ReportSection>
        )}

        {canViewFull && checklist.length > 0 && (
          <ReportSection
            icon={<CheckSquare className="h-4 w-4" />}
            title="Automated security checklist"
            description="Control-level evidence collected during the audit."
          >
            <div className="overflow-hidden rounded-xl border border-cc-border">
              <div className="divide-y divide-cc-border">
                {checklist.map((item, index) => (
                  <div
                    key={item.id || `${item.check}-${index}`}
                    className="flex flex-col gap-3 bg-cc-bg-secondary px-4 py-4 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-cc-subtle">
                          {item.section}
                        </span>
                        <p className="text-sm font-medium text-cc-text">
                          {item.check}
                        </p>
                      </div>
                      {item.evidence && (
                        <p className="mt-2 break-words text-xs leading-5 text-cc-muted">
                          {item.evidence}
                        </p>
                      )}
                    </div>
                    <ChecklistBadge verdict={item.verdict} />
                  </div>
                ))}
              </div>
            </div>
          </ReportSection>
        )}
      </div>
    </ResultSurface>
  );
}
