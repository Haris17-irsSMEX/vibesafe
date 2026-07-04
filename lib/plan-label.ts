const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  builder: "Builder",
  pro: "Legacy Pro",
};

export function getPlanLabel(plan: string | null | undefined): string {
  if (!plan) return "Current plan";
  return PLAN_LABELS[plan.toLowerCase()] ?? "Current plan";
}
