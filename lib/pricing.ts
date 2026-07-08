import { getAiScanAllowanceLabel } from "@/lib/plan-limits";

export type PricingPlanId = "free" | "starter" | "builder";
export type PurchasablePlanId = Exclude<PricingPlanId, "free">;

export type PricingPlan = {
  id: PricingPlanId;
  label: string;
  shortDescription: string;
  displayPriceMonthly: string;
  displayPriceSuffix: string;
  displayPriceFull: string;
  scanAllowanceLabel: string;
  repoAllowanceLabel: string | null;
  highlighted: boolean;
  ctaLabel: string;
  ctaHref: string;
  features: readonly string[];
  limitations: readonly string[];
};

/**
 * UI display metadata only.
 *
 * The paid display prices preserve the existing billing-adjacent checkout copy.
 * Actual charges remain controlled by Paddle price IDs in the server checkout route
 * and must be verified in Paddle before a pricing launch.
 */
export const PRICING_PLANS: readonly PricingPlan[] = [
  {
    id: "free",
    label: "Free",
    shortDescription: "Start with basic repository reviews and security posture.",
    displayPriceMonthly: "$0",
    displayPriceSuffix: "USD/month",
    displayPriceFull: "$0 USD/month",
    scanAllowanceLabel: getAiScanAllowanceLabel("free"),
    repoAllowanceLabel: null,
    highlighted: false,
    ctaLabel: "Start review",
    ctaHref: "/login",
    features: [
      "Security score and severity counts",
      "Finding names, categories, and file paths",
      "Scan history for reviewed repositories",
      "Basic production-readiness visibility",
    ],
    limitations: [
      "Detailed evidence and remediation guidance require a paid plan",
      "AI-ready fix prompts require a paid plan",
    ],
  },
  {
    id: "starter",
    label: "Starter",
    shortDescription: "Unlock full finding context and practical remediation guidance.",
    displayPriceMonthly: "$29",
    displayPriceSuffix: "USD/month",
    displayPriceFull: "$29 USD/month",
    scanAllowanceLabel: getAiScanAllowanceLabel("starter"),
    repoAllowanceLabel: null,
    highlighted: true,
    ctaLabel: "Choose Starter",
    ctaHref: "/checkout?plan=starter",
    features: [
      "Security score and severity counts",
      "Full finding descriptions and impact context",
      "Vulnerable code evidence when available",
      "Detailed remediation guidance",
      "Copy-ready fix prompts for Cursor and Codex",
      "Security Officer Report and production-readiness review",
    ],
    limitations: [],
  },
  {
    id: "builder",
    label: "Builder",
    shortDescription: "Increase review capacity for repeated production-readiness cycles.",
    displayPriceMonthly: "$79",
    displayPriceSuffix: "USD/month",
    displayPriceFull: "$79 USD/month",
    scanAllowanceLabel: getAiScanAllowanceLabel("builder"),
    repoAllowanceLabel: null,
    highlighted: false,
    ctaLabel: "Choose Builder",
    ctaHref: "/checkout?plan=builder",
    features: [
      "Security score and severity counts",
      "Full finding descriptions and impact context",
      "Vulnerable code evidence when available",
      "Detailed remediation guidance",
      "Copy-ready fix prompts for Cursor and Codex",
      "Security Officer Report and production-readiness review",
      "Higher daily AI review allowance",
      "Built for repeated fix-and-rescan workflows",
    ],
    limitations: [],
  },
] as const;

export const PRICING_PLAN_BY_ID: Readonly<Record<PricingPlanId, PricingPlan>> =
  Object.fromEntries(PRICING_PLANS.map((plan) => [plan.id, plan])) as Record<
    PricingPlanId,
    PricingPlan
  >;

export function isPurchasablePlan(value: unknown): value is PurchasablePlanId {
  return value === "starter" || value === "builder";
}

export function getPricingPlan(plan: PricingPlanId): PricingPlan {
  return PRICING_PLAN_BY_ID[plan];
}
