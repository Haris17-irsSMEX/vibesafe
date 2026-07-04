"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileCode,
  Hash,
  ShieldCheck,
} from "lucide-react";
import type {
  ScanResultRecord,
  FreeScanResultRecord,
  GatedScanResultRecord,
} from "@/lib/db/scan-results";
import { SeverityBadge, type SeverityLevel } from "./SeverityBadge";
import { LockedFindingCard } from "./LockedFindingCard";
import { UpgradeCTA } from "./UpgradeCTA";
import { CopyFixPromptButton } from "./copy-fix-prompt-button";
import { MetadataChip } from "./result-ui";
import { cn } from "@/lib/utils";

interface FindingsListProps {
  findings: GatedScanResultRecord[];
  scanId: string;
  isPaid: boolean;
}

const severityOrder: Record<SeverityLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

const severityRail: Record<SeverityLevel, string> = {
  CRITICAL: "bg-red-500",
  HIGH: "bg-orange-500",
  MEDIUM: "bg-amber-500",
  LOW: "bg-blue-500",
};

function isFullFinding(
  finding: GatedScanResultRecord
): finding is ScanResultRecord {
  return "description" in finding;
}

function PaidFindingCard({
  finding,
  scanId,
}: {
  finding: ScanResultRecord;
  scanId: string;
}) {
  const severity = finding.severity.toUpperCase() as SeverityLevel;

  return (
    <article className="relative overflow-hidden rounded-2xl border border-cc-border bg-cc-surface transition-colors hover:border-cc-border-strong hover:bg-cc-surface-raised">
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-y-0 left-0 w-1",
          severityRail[severity] ?? severityRail.LOW
        )}
      />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={severity} />
              <MetadataChip>{finding.category}</MetadataChip>
              {finding.cwe_id && (
                <MetadataChip icon={<Hash className="h-3 w-3" />}>
                  {finding.cwe_id}
                </MetadataChip>
              )}
              {finding.confidence && (
                <MetadataChip>
                  {finding.confidence} confidence
                </MetadataChip>
              )}
            </div>

            <h3 className="mt-4 text-base font-semibold text-cc-text">
              {finding.check_name}
            </h3>
            <p className="mt-2 line-clamp-2 max-w-3xl text-sm leading-6 text-cc-muted">
              {finding.description || "Description not available."}
            </p>

            <div className="mt-4 flex min-w-0 flex-wrap items-center gap-2">
              <MetadataChip
                mono
                icon={<FileCode className="h-3.5 w-3.5 shrink-0" />}
                className="max-w-full"
              >
                {finding.file_path || "File unavailable"}
              </MetadataChip>
              {finding.line_number && (
                <MetadataChip mono>Line {finding.line_number}</MetadataChip>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            {finding.fix_prompt && (
              <CopyFixPromptButton promptText={finding.fix_prompt} />
            )}
            <Link
              href={`/results/${scanId}/${finding.id}`}
              aria-label={`View details for ${finding.check_name}`}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-3 text-sm font-medium text-cc-text outline-none transition-colors hover:bg-cc-surface-hover focus-visible:ring-2 focus-visible:ring-white/20"
            >
              View details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function FindingsList({
  findings,
  scanId,
  isPaid,
}: FindingsListProps) {
  const sortedFindings = [...findings].sort((a, b) => {
    const aSeverity = a.severity.toUpperCase() as SeverityLevel;
    const bSeverity = b.severity.toUpperCase() as SeverityLevel;
    return (
      (severityOrder[aSeverity] ?? 99) - (severityOrder[bSeverity] ?? 99)
    );
  });

  if (findings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-6 py-14 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h3 className="mt-5 text-lg font-semibold text-cc-text">
          No findings recorded
        </h3>
        <p className="mt-2 max-w-md text-sm leading-6 text-cc-muted">
          This scan did not record critical, high, medium, or low-severity
          findings.
        </p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Review complete
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!isPaid && <UpgradeCTA context="overview" className="mb-7" />}

      {sortedFindings.map((finding) =>
        isPaid && isFullFinding(finding) ? (
          <PaidFindingCard
            key={finding.id}
            finding={finding}
            scanId={scanId}
          />
        ) : (
          <LockedFindingCard
            key={finding.id}
            finding={finding as FreeScanResultRecord}
          />
        )
      )}
    </div>
  );
}
