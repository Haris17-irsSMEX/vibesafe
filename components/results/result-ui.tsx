import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function ResultSurface({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-cc-border bg-cc-surface",
        className
      )}
    >
      {children}
    </section>
  );
}

export function MetadataChip({
  icon,
  children,
  mono = false,
  className,
}: {
  icon?: ReactNode;
  children: ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 rounded-lg border border-cc-border bg-cc-bg-secondary px-2.5 py-1.5 text-xs text-cc-muted",
        mono && "font-mono",
        className
      )}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </span>
  );
}

type ReadinessKey =
  | "ready"
  | "needs_attention"
  | "not_ready"
  | "critical_risk";

const readinessStyles: Record<
  ReadinessKey,
  { label: string; className: string }
> = {
  ready: {
    label: "Production ready",
    className:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  },
  needs_attention: {
    label: "Needs attention",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-400",
  },
  not_ready: {
    label: "Not production ready",
    className: "border-orange-500/20 bg-orange-500/10 text-orange-400",
  },
  critical_risk: {
    label: "Critical risk",
    className: "border-red-500/20 bg-red-500/10 text-red-400",
  },
};

export function ReadinessBadge({
  readiness,
}: {
  readiness: string | null | undefined;
}) {
  const config =
    readinessStyles[readiness as ReadinessKey] ?? {
      label: "Readiness unavailable",
      className: "border-cc-border-strong bg-cc-surface-raised text-cc-muted",
    };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em]",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

const riskItems = [
  {
    key: "critical",
    label: "Critical",
    valueClass: "text-red-400",
    borderClass: "border-t-red-500",
  },
  {
    key: "high",
    label: "High",
    valueClass: "text-orange-400",
    borderClass: "border-t-orange-500",
  },
  {
    key: "medium",
    label: "Medium",
    valueClass: "text-amber-400",
    borderClass: "border-t-amber-500",
  },
  {
    key: "low",
    label: "Low",
    valueClass: "text-blue-400",
    borderClass: "border-t-blue-500",
  },
  {
    key: "total",
    label: "Total",
    valueClass: "text-cc-text",
    borderClass: "border-t-cc-border-strong",
  },
] as const;

export function RiskSummaryGrid({
  critical,
  high,
  medium,
  low,
  total,
}: {
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}) {
  const values = { critical, high, medium, low, total };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {riskItems.map((item) => (
        <div
          key={item.key}
          className={cn(
            "rounded-xl border border-cc-border border-t-2 bg-cc-surface px-4 py-4",
            item.borderClass
          )}
        >
          <p className={cn("text-2xl font-semibold", item.valueClass)}>
            {values[item.key]}
          </p>
          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
            {item.label}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ReportSection({
  icon,
  title,
  description,
  children,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border-t border-cc-border pt-7", className)}>
      <div className="mb-4 flex items-start gap-3">
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cc-border bg-cc-surface-raised text-cc-muted">
            {icon}
          </span>
        )}
        <div>
          <h3 className="text-sm font-semibold text-cc-text">{title}</h3>
          {description && (
            <p className="mt-1 text-xs leading-5 text-cc-subtle">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}
