import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/auth/admin";
import { getPlanLabel } from "@/lib/plan-label";
import {
  getPlanEntitlements,
  type EntitlementPlan,
  type PlanEntitlements,
} from "@/lib/plan-limits";
import { getUserProfile, type UserPlan } from "@/lib/db/users";

export type UsageKind = "security_scan" | "system_test";

export type DailyUsageWindow = {
  startAt: string;
  resetAt: string;
  label: "UTC day";
};

export type UsageLimitState = {
  allowed: boolean;
  plan: UserPlan;
  effectivePlan: EntitlementPlan;
  planLabel: string;
  isAdmin: boolean;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
  resetWindowLabel: string;
  upgradeUrl: string;
  reason: "ok" | "limit_reached";
  message: string;
};

export type AccountUsageSummary = {
  plan: UserPlan;
  effectivePlan: EntitlementPlan;
  planLabel: string;
  isAdmin: boolean;
  limits: PlanEntitlements;
  window: DailyUsageWindow;
  securityScans: {
    used: number;
    limit: number;
    remaining: number;
    allowed: boolean;
  };
  systemTests: {
    used: number;
    limit: number;
    remaining: number;
    allowed: boolean;
  };
};

function getUtcDayWindow(now = new Date()): DailyUsageWindow {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const reset = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { startAt: start.toISOString(), resetAt: reset.toISOString(), label: "UTC day" };
}

function clampRemaining(limit: number, used: number): number {
  return Math.max(0, limit - used);
}

function upgradeMessage(kind: UsageKind, plan: UserPlan): string {
  if (kind === "system_test") {
    if (plan === "free") return "Daily system test limit reached. Upgrade to Starter for 20 AI Security Scans/day and 10 System Tests/day.";
    if (plan === "starter") return "You've reached today's Starter limit. Upgrade to Builder for higher scan and test limits.";
    return "You've reached today's plan limit. Please try again tomorrow or contact support.";
  }
  if (plan === "free") return "You've used today's free scans. Upgrade to Starter for 20 AI Security Scans/day and 10 System Tests/day.";
  if (plan === "starter") return "You've reached today's Starter limit. Upgrade to Builder for higher scan and test limits.";
  return "You've reached today's plan limit. Please try again tomorrow or contact support.";
}

function upgradeUrl(plan: UserPlan): string {
  if (plan === "starter") return "/checkout?plan=builder";
  if (plan === "builder" || plan === "pro") return "/contact";
  return "/pricing";
}

async function countRowsToday(table: "scans" | "system_test_runs", userId: string, window: DailyUsageWindow): Promise<number> {
  const admin = createSupabaseAdminClient();
  const { count, error } = await admin
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", window.startAt)
    .lt("created_at", window.resetAt);

  if (error) {
    console.error("[usage-limits] daily count failed", { table, userId, code: error.code, message: error.message });
    return 0;
  }

  return count ?? 0;
}

export async function getAccountUsageSummary(userId: string, email: string | null | undefined): Promise<AccountUsageSummary> {
  const [profile, window] = await Promise.all([
    getUserProfile(userId),
    Promise.resolve(getUtcDayWindow()),
  ]);
  const plan = profile?.plan ?? "free";
  const isAdmin = isAdminEmail(email);
  const effectivePlan: EntitlementPlan = isAdmin ? "admin" : plan;
  const limits = getPlanEntitlements(effectivePlan);
  const [securityScanCount, systemTestCount] = await Promise.all([
    countRowsToday("scans", userId, window),
    countRowsToday("system_test_runs", userId, window),
  ]);

  return {
    plan,
    effectivePlan,
    planLabel: isAdmin ? "Admin" : getPlanLabel(plan),
    isAdmin,
    limits,
    window,
    securityScans: {
      used: securityScanCount,
      limit: limits.securityScansPerDay,
      remaining: clampRemaining(limits.securityScansPerDay, securityScanCount),
      allowed: securityScanCount < limits.securityScansPerDay,
    },
    systemTests: {
      used: systemTestCount,
      limit: limits.systemTestsPerDay,
      remaining: clampRemaining(limits.systemTestsPerDay, systemTestCount),
      allowed: systemTestCount < limits.systemTestsPerDay,
    },
  };
}

export function getUsageLimitState(summary: AccountUsageSummary, kind: UsageKind): UsageLimitState {
  const usage = kind === "security_scan" ? summary.securityScans : summary.systemTests;
  const allowed = summary.isAdmin || usage.allowed;
  return {
    allowed,
    plan: summary.plan,
    effectivePlan: summary.effectivePlan,
    planLabel: summary.planLabel,
    isAdmin: summary.isAdmin,
    used: usage.used,
    limit: usage.limit,
    remaining: summary.isAdmin ? usage.limit : usage.remaining,
    resetAt: summary.window.resetAt,
    resetWindowLabel: summary.window.label,
    upgradeUrl: upgradeUrl(summary.plan),
    reason: allowed ? "ok" : "limit_reached",
    message: allowed ? "Usage available." : upgradeMessage(kind, summary.plan),
  };
}

export async function checkDailyUsageLimit(userId: string, email: string | null | undefined, kind: UsageKind): Promise<UsageLimitState> {
  const summary = await getAccountUsageSummary(userId, email);
  return getUsageLimitState(summary, kind);
}
