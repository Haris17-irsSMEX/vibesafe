import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

export function SurfaceCard({ children, className }: SurfaceCardProps) {
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

type StatMetricCardProps = {
  label: string;
  value: ReactNode;
  detail: string;
  icon: ReactNode;
  tone?: "neutral" | "critical" | "high" | "safe";
};

const toneClasses = {
  neutral: "border-cc-border bg-cc-surface-raised text-cc-muted",
  critical: "border-red-500/15 bg-red-500/10 text-red-400",
  high: "border-orange-500/15 bg-orange-500/10 text-orange-400",
  safe: "border-emerald-500/15 bg-emerald-500/10 text-emerald-400",
};

export function StatMetricCard({
  label,
  value,
  detail,
  icon,
  tone = "neutral",
}: StatMetricCardProps) {
  return (
    <SurfaceCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.13em] text-cc-subtle">
            {label}
          </p>
          <div className="mt-3 truncate text-2xl font-semibold tracking-[-0.03em] text-cc-text">
            {value}
          </div>
          <p className="mt-1 text-xs leading-5 text-cc-muted">{detail}</p>
        </div>
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
            toneClasses[tone]
          )}
        >
          {icon}
        </span>
      </div>
    </SurfaceCard>
  );
}

type DashboardEmptyStateProps = {
  connected: boolean;
};

export function DashboardEmptyState({ connected }: DashboardEmptyStateProps) {
  return (
    <SurfaceCard className="flex flex-col items-center px-6 py-14 text-center sm:py-16">
      <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cc-border-strong bg-cc-surface-raised text-cc-muted">
        <ShieldCheck className="h-5 w-5" />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-cc-text">No scans yet</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-cc-muted">
        Connect GitHub and run your first CtrlCode review.
      </p>
      <Link
        href="/dashboard/connect"
        className="mt-6 inline-flex min-h-10 items-center gap-2 rounded-lg bg-cc-text px-4 py-2 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
      >
        {connected ? "Choose a repository" : "Connect GitHub"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </SurfaceCard>
  );
}

export function StatusPill({
  status,
}: {
  status: "pending" | "fetching" | "scanning" | "complete" | "completed" | "failed";
}) {
  const success = status === "complete" || status === "completed";
  const label = success
    ? "Completed"
    : status.charAt(0).toUpperCase() + status.slice(1);
  const classes = success
    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
    : status === "failed"
      ? "border-red-500/20 bg-red-500/10 text-red-400"
      : "border-blue-500/20 bg-blue-500/10 text-blue-400";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em]",
        classes
      )}
    >
      {label}
    </span>
  );
}
