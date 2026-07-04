"use client";

import { FileCode, Hash, Lock } from "lucide-react";
import type { FreeScanResultRecord } from "@/lib/db/scan-results";
import { SeverityBadge, type SeverityLevel } from "./SeverityBadge";
import { MetadataChip } from "./result-ui";

interface LockedFindingCardProps {
  finding: FreeScanResultRecord;
}

export function LockedFindingCard({ finding }: LockedFindingCardProps) {
  return (
    <article
      className="relative overflow-hidden rounded-2xl border border-cc-border bg-cc-surface"
      aria-label={`Finding: ${finding.check_name}. Premium details locked.`}
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-cc-border-strong" />
      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge
                severity={finding.severity.toUpperCase() as SeverityLevel}
              />
              <MetadataChip>{finding.category}</MetadataChip>
              {finding.cwe_id && (
                <MetadataChip icon={<Hash className="h-3 w-3" />}>
                  {finding.cwe_id}
                </MetadataChip>
              )}
            </div>
            <h3 className="mt-4 text-base font-semibold text-cc-text">
              {finding.check_name}
            </h3>
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

          <div className="flex shrink-0 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-3 py-2 text-xs text-cc-muted">
            <Lock className="h-3.5 w-3.5" />
            Full analysis locked
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-cc-border-strong bg-cc-bg-secondary px-4 py-4">
          <p className="text-sm leading-6 text-cc-muted">
            Unlock vulnerable code, detailed remediation guidance, and an
            agent-ready fix prompt.
          </p>
        </div>
      </div>
    </article>
  );
}
