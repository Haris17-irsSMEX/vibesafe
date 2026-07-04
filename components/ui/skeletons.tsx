import React from "react";
import { cn } from "@/lib/utils";
import { GlowCard } from "./glow-card";

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
    <GlowCard className="p-6">
      <div className="flex items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>
      <div className="space-y-3 pt-4">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    </GlowCard>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
        <MetricCardSkeleton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <GlowCard className="col-span-4 p-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </GlowCard>
        <GlowCard className="col-span-3 p-6">
          <Skeleton className="h-[300px] w-full rounded-xl" />
        </GlowCard>
      </div>
    </div>
  );
}

export function RepoListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <GlowCard key={i} className="p-6 space-y-4">
          <div className="flex justify-between items-start">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <div className="pt-4 flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </GlowCard>
      ))}
    </div>
  );
}
