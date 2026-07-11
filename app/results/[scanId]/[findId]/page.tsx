import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  FileCode,
  Hash,
  Lightbulb,
  Lock,
  ShieldAlert,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getScanById } from "@/lib/db/scans";
import {
  getScanResultById,
  getScanResultByIdFree,
  type ScanResultRecord,
  type FreeScanResultRecord,
} from "@/lib/db/scan-results";
import {
  getUserProfile,
  upsertUserProfile,
  isPaidPlan,
} from "@/lib/db/users";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  SeverityBadge,
  type SeverityLevel,
} from "@/components/results/SeverityBadge";
import { CopyButton } from "@/components/results/CopyButton";
import { CopyFixPromptButton } from "@/components/results/copy-fix-prompt-button";
import { UpgradeCTA } from "@/components/results/UpgradeCTA";
import {
  MetadataChip,
  FindingStatusBadge,
  ResultSurface,
} from "@/components/results/result-ui";
import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout";
import {
  AppPageContainer,
  AppSectionHeader,
} from "@/components/layout/app-page";
import { formatSafeDateTime } from "@/lib/date";

interface FindingDetailPageProps {
  params: {
    scanId: string;
    findId: string;
  };
}

function NotFoundState({
  scanId,
  kind,
}: {
  scanId?: string;
  kind: "scan" | "finding";
}) {
  return (
    <ServerDashboardLayout>
      <AppPageContainer size="narrow">
        <ResultSurface className="flex flex-col items-center px-6 py-14 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
          <h1 className="mt-4 text-lg font-semibold text-cc-text">
            {kind === "scan" ? "Scan not found" : "Finding not found"}
          </h1>
          <p className="mt-2 text-sm text-cc-muted">
            The requested security record is unavailable.
          </p>
          <Link
            href={scanId ? `/results/${scanId}` : "/results"}
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

export default async function FindingDetailPage({
  params,
}: FindingDetailPageProps) {
  const { scanId, findId } = params;

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
    return <NotFoundState kind="scan" />;
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

  let paidFinding: ScanResultRecord | null = null;
  let freeFinding: FreeScanResultRecord | null = null;

  // SECURITY: the selected DB query is determined server-side by access level.
  if (canViewFull) {
    paidFinding = await getScanResultById(findId, user.id);
    if (!paidFinding || paidFinding.scan_id !== scanId) {
      return <NotFoundState scanId={scanId} kind="finding" />;
    }
  } else {
    freeFinding = await getScanResultByIdFree(findId, user.id);
    if (!freeFinding || freeFinding.scan_id !== scanId) {
      return <NotFoundState scanId={scanId} kind="finding" />;
    }
  }

  const baseFinding = canViewFull ? paidFinding! : freeFinding!;
  const severity = baseFinding.severity.toUpperCase() as SeverityLevel;

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="narrow">
        <Link
          href={`/results/${scanId}`}
          className="mb-5 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-cc-muted outline-none transition-colors hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to report
        </Link>

        <ResultSurface className="overflow-hidden">
          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={severity} />
              {canViewFull && paidFinding && (
                <FindingStatusBadge status={paidFinding.finding_status} />
              )}
              <MetadataChip>{baseFinding.category}</MetadataChip>
              {baseFinding.cwe_id && (
                <MetadataChip icon={<Hash className="h-3 w-3" />}>
                  {baseFinding.cwe_id}
                </MetadataChip>
              )}
              {isAdmin && (
                <span className="inline-flex items-center gap-1 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-violet-300">
                  <ShieldAlert className="h-3 w-3" />
                  Admin access
                </span>
              )}
            </div>

            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-cc-text sm:text-3xl">
              {baseFinding.check_name}
            </h1>
            <p className="mt-2 text-sm text-cc-muted">
              Finding from{" "}
              <span className="font-medium text-cc-text">
                {scan.repo_full_name || scan.repo_name}
              </span>
            </p>

            <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2">
              <MetadataChip
                mono
                icon={<FileCode className="h-3.5 w-3.5" />}
                className="max-w-full"
              >
                {baseFinding.file_path || "File unavailable"}
              </MetadataChip>
              {baseFinding.line_number && (
                <MetadataChip mono>Line {baseFinding.line_number}</MetadataChip>
              )}
              {canViewFull && paidFinding?.confidence && (
                <MetadataChip>{paidFinding.confidence} confidence</MetadataChip>
              )}
              <MetadataChip icon={<Calendar className="h-3.5 w-3.5" />}>
                {formatSafeDateTime(baseFinding.created_at)}
              </MetadataChip>
            </div>
          </div>
        </ResultSurface>

        {!canViewFull && (
          <div className="mt-7 space-y-5">
            <UpgradeCTA context="detail" />
            <ResultSurface className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cc-border-strong bg-cc-surface-raised text-cc-muted">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-base font-semibold text-cc-text">
                    Full finding analysis locked
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-cc-muted">
                    Unlock the detailed explanation, vulnerable code evidence,
                    recommendation, and Cursor/Codex fix prompt.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  ["Issue impact", AlertTriangle],
                  ["Code evidence", FileCode],
                  ["Agent fix prompt", TerminalSquare],
                ].map(([label, Icon]) => {
                  const ItemIcon = Icon as typeof AlertTriangle;
                  return (
                    <div
                      key={label as string}
                      className="flex items-center gap-2 rounded-xl border border-dashed border-cc-border-strong bg-cc-bg-secondary p-3 text-xs text-cc-muted"
                    >
                      <ItemIcon className="h-4 w-4" />
                      {label as string}
                    </div>
                  );
                })}
              </div>
            </ResultSurface>
          </div>
        )}

        {canViewFull && paidFinding && (
          <div className="mt-8 space-y-10">
            <section>
              <AppSectionHeader
                title="Issue summary"
                description="What the scanner found and why it matters."
              />
              <ResultSurface className="p-5 sm:p-6">
                <p className="whitespace-pre-wrap text-sm leading-7 text-cc-muted">
                  {paidFinding.description || "Description not available."}
                </p>

                {paidFinding.why_it_matters && (
                  <div className="mt-6 border-t border-cc-border pt-6">
                    <div className="flex items-center gap-2 text-cc-text">
                      <AlertTriangle className="h-4 w-4 text-orange-400" />
                      <h2 className="text-sm font-semibold">Why it matters</h2>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-cc-muted">
                      {paidFinding.why_it_matters}
                    </p>
                  </div>
                )}
              </ResultSurface>
            </section>

            <section>
              <AppSectionHeader
                title="Evidence and verification"
                description="How this finding was grounded, and what to check before treating a non-confirmed issue as exploitable."
              />
              <ResultSurface className="p-5 sm:p-6">
                {paidFinding.evidence && (
                  <div>
                    <h2 className="text-sm font-semibold text-cc-text">Observed evidence</h2>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-cc-muted">{paidFinding.evidence}</p>
                  </div>
                )}
                {paidFinding.attack_scenario && (
                  <div className={paidFinding.evidence ? "mt-6 border-t border-cc-border pt-6" : ""}>
                    <h2 className="text-sm font-semibold text-cc-text">Attack scenario</h2>
                    <p className="mt-2 text-sm leading-7 text-cc-muted">{paidFinding.attack_scenario}</p>
                  </div>
                )}
                {paidFinding.verification_steps?.length ? (
                  <div className={(paidFinding.evidence || paidFinding.attack_scenario) ? "mt-6 border-t border-cc-border pt-6" : ""}>
                    <h2 className="text-sm font-semibold text-cc-text">Verification steps</h2>
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-cc-muted">
                      {paidFinding.verification_steps.map((step, index) => <li key={`${step}-${index}`}>{step}</li>)}
                    </ol>
                  </div>
                ) : null}
                {paidFinding.false_positive_risk && (
                  <p className={(paidFinding.evidence || paidFinding.attack_scenario || paidFinding.verification_steps?.length) ? "mt-6 border-t border-cc-border pt-6 text-xs leading-6 text-cc-subtle" : "text-xs leading-6 text-cc-subtle"}>
                    False-positive risk: {paidFinding.false_positive_risk}
                  </p>
                )}
                {!paidFinding.evidence && !paidFinding.attack_scenario && !paidFinding.verification_steps?.length && !paidFinding.false_positive_risk && (
                  <p className="text-sm text-cc-muted">Additional verification context is not available for this legacy finding.</p>
                )}
              </ResultSurface>
            </section>

            <section>
              <AppSectionHeader
                title="Code evidence"
                description="Recorded vulnerable code or evidence from the scan."
              />
              {paidFinding.vulnerable_code ||
              paidFinding.evidence_snippet ? (
                <div className="overflow-hidden rounded-2xl border border-red-500/20 bg-[#101010]">
                  <div className="flex min-w-0 items-center justify-between gap-3 border-b border-red-500/15 bg-red-500/[0.06] px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-red-300">
                        {paidFinding.file_path}
                        {paidFinding.line_number
                          ? ` · line ${paidFinding.line_number}`
                          : ""}
                      </p>
                    </div>
                    <CopyButton
                      text={
                        paidFinding.vulnerable_code ||
                        paidFinding.evidence_snippet ||
                        ""
                      }
                    />
                  </div>
                  <div className="max-w-full overflow-x-auto p-5">
                    <pre className="min-w-max whitespace-pre text-[13px] leading-6 text-red-200/80">
                      <code>
                        {paidFinding.vulnerable_code ||
                          paidFinding.evidence_snippet}
                      </code>
                    </pre>
                  </div>
                </div>
              ) : (
                <ResultSurface className="p-5">
                  <p className="text-sm text-cc-muted">
                    Evidence not available. Review the affected file and
                    recommendation.
                  </p>
                </ResultSurface>
              )}
            </section>

            <section>
              <AppSectionHeader
                title="Recommendation"
                description="Suggested remediation direction for this finding."
              />
              <ResultSurface className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="whitespace-pre-wrap text-sm leading-7 text-cc-muted">
                    {paidFinding.recommendation ||
                      "Recommendation not available."}
                  </p>
                </div>
              </ResultSurface>
            </section>

            <section>
              <AppSectionHeader
                title="AI fix prompt"
                description="Agent-ready instructions for Cursor or Codex."
              />
              {paidFinding.fix_prompt ? (
                <ResultSurface className="overflow-hidden border-cc-border-strong">
                  <div className="flex items-center justify-between gap-3 border-b border-cc-border bg-cc-bg-secondary px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-cc-text">
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      Ready for your coding agent
                    </div>
                    <CopyFixPromptButton
                      promptText={paidFinding.fix_prompt}
                    />
                  </div>
                  <div className="max-w-full overflow-x-auto p-5">
                    <pre className="whitespace-pre-wrap break-words font-mono text-[13px] leading-7 text-cc-muted">
                      <code>{paidFinding.fix_prompt}</code>
                    </pre>
                  </div>
                </ResultSurface>
              ) : (
                <ResultSurface className="p-5">
                  <p className="text-sm text-cc-muted">
                    An AI fix prompt is not available for this finding.
                  </p>
                </ResultSurface>
              )}
            </section>
          </div>
        )}
      </AppPageContainer>
    </ServerDashboardLayout>
  );
}
