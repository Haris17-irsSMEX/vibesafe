import React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-cc-surface-raised", className)}
      {...props}
    />
  );
}

export function MetricCardSkeleton() {
  return (
    <div className="rounded-2xl border border-cc-border bg-cc-surface p-5">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <div className="rounded-2xl border border-cc-border bg-cc-surface p-7 xl:col-span-5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-7 h-14 w-32" />
          <Skeleton className="mt-5 h-4 w-52" />
          <Skeleton className="mt-3 h-4 w-full max-w-sm" />
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-cc-border pt-5">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-7">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-cc-border bg-cc-surface p-6 lg:col-span-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-2 h-3 w-48" />
          <Skeleton className="mt-8 h-52 w-full rounded-xl" />
        </div>
        <div className="rounded-2xl border border-cc-border bg-cc-surface p-6 lg:col-span-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-3 w-44" />
          <Skeleton className="mx-auto mt-8 h-36 w-36 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function RepoListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="space-y-4 rounded-2xl border border-cc-border bg-cc-surface p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40 max-w-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}
