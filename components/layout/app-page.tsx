import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppPageContainerProps = {
  children: ReactNode;
  className?: string;
  size?: "default" | "narrow" | "wide";
};

const containerSizes = {
  narrow: "max-w-4xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
};

export function AppPageContainer({
  children,
  className,
  size = "default",
}: AppPageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full animate-fade-in",
        containerSizes[size],
        className
      )}
    >
      {children}
    </div>
  );
}

type AppPageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
};

export function AppPageHeader({
  title,
  description,
  eyebrow,
  badge,
  action,
  icon,
  className,
}: AppPageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="min-w-0">
        {(eyebrow || badge) && (
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {eyebrow && (
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-cc-subtle">
                {eyebrow}
              </span>
            )}
            {badge}
          </div>
        )}
        <div className="flex min-w-0 items-center gap-3">
          {icon && (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cc-border bg-cc-surface text-cc-muted">
              {icon}
            </span>
          )}
          <h1 className="min-w-0 text-2xl font-semibold tracking-[-0.025em] text-cc-text sm:text-3xl">
            {title}
          </h1>
        </div>
        {description && (
          <div className="mt-2 max-w-2xl text-sm leading-6 text-cc-muted">
            {description}
          </div>
        )}
      </div>
      {action && <div className="flex shrink-0 items-center gap-3">{action}</div>}
    </header>
  );
}

type AppSectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function AppSectionHeader({
  title,
  description,
  action,
  className,
}: AppSectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div>
        <h2 className="text-sm font-semibold text-cc-text">{title}</h2>
        {description && (
          <p className="mt-1 text-xs leading-5 text-cc-subtle">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
