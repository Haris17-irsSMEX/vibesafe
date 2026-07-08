import Link from "next/link";
import {
  ArrowRight,
  Check,
  Minus,
  ShieldCheck,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { PRICING_PLANS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const PRICING_COMPLIANCE_NOTE =
  "All prices are in USD. Paid plans are monthly subscriptions and renew every month until canceled. No trial or introductory pricing is currently offered. Taxes may apply and will be calculated at checkout.";

export default function PricingPage() {
  return (
    <PublicLayout>
      <section className="relative overflow-hidden border-b border-cc-border px-5 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.07),transparent_65%)]"
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cc-border-strong bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-cc-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-cc-text" />
            Clear plans for repository reviews
          </div>
          <h1 className="mt-7 text-balance text-4xl font-semibold tracking-[-0.05em] text-cc-text sm:text-6xl">
            Choose the review capacity that fits.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-cc-muted sm:text-lg">
            Start with security posture and upgrade when you need complete finding
            evidence, remediation guidance, and AI-ready fix prompts.
          </p>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-3">
          {PRICING_PLANS.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                "relative flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-cc-surface",
                plan.highlighted
                  ? "border-cc-border-strong shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
                  : "border-cc-border"
              )}
            >
              {plan.highlighted ? (
                <div className="border-b border-cc-border bg-white/[0.04] px-6 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-cc-muted">
                  Full remediation workflow
                </div>
              ) : null}

              <div className="border-b border-cc-border p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-cc-text">
                      CtrlCode {plan.label}
                    </h2>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-cc-muted">
                      {plan.shortDescription}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cc-border bg-cc-surface-raised text-cc-muted">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                </div>

                <div className="mt-8 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.06em] text-cc-text">
                    {plan.displayPriceMonthly}
                  </span>
                  <span className="mb-1.5 text-sm text-cc-subtle">
                    {plan.displayPriceSuffix}
                  </span>
                </div>
                <p className="mt-3 text-xs text-cc-subtle">
                  Taxes may apply and will be calculated at checkout.
                </p>

                <div className="mt-6 rounded-xl border border-cc-border bg-cc-bg-secondary p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle">
                    Enforced AI review allowance
                  </p>
                  <p className="mt-2 text-sm font-medium text-cc-text">
                    {plan.scanAllowanceLabel}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-7">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle">
                  Included
                </p>
                <ul className="mt-5 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-cc-muted">
                      <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.limitations.map((limitation) => (
                    <li key={limitation} className="flex items-start gap-3 text-sm leading-6 text-cc-subtle">
                      <Minus className="mt-1 h-3.5 w-3.5 shrink-0" />
                      <span>{limitation}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href={plan.ctaHref}
                  className={cn(
                    "mt-8 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
                    plan.highlighted
                      ? "border-cc-text bg-cc-text text-cc-bg hover:bg-white"
                      : "border-cc-border-strong bg-cc-surface-raised text-cc-text hover:bg-cc-surface-hover"
                  )}
                >
                  {plan.ctaLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-auto mt-8 max-w-4xl rounded-xl border border-cc-border bg-cc-secondary px-5 py-4 text-center">
          <p className="text-xs leading-5 text-cc-subtle">
            {PRICING_COMPLIANCE_NOTE} Paid checkout is securely processed by Paddle.
            Review capacity is enforced according to your active plan. CtrlCode does not
            guarantee that a repository is free from security issues.
          </p>
        </div>
      </section>
    </PublicLayout>
  );
}
