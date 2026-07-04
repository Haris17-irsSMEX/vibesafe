import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { PublicLayout } from "@/components/layout/public-layout";
import { createClient } from "@/lib/supabase/server";
import { getPricingPlan, isPurchasablePlan } from "@/lib/pricing";
import { CheckoutClient } from "./CheckoutClient";

function CheckoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-[72vh] overflow-hidden bg-cc-bg px-5 py-16 sm:px-6 sm:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.065),transparent_65%)]"
      />
      <div className="relative mx-auto max-w-xl">{children}</div>
    </div>
  );
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const requestedPlan = searchParams.plan;

  if (!isPurchasablePlan(requestedPlan)) {
    return (
      <PublicLayout>
        <CheckoutShell>
          <div className="rounded-2xl border border-cc-border-strong bg-cc-surface p-7 text-center sm:p-10">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cc-border bg-cc-surface-raised text-cc-muted">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-cc-text">
              Select a valid plan
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-cc-muted">
              Choose Starter or Builder from the pricing page to continue.
            </p>
            <Link
              href="/pricing"
              className="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-cc-text px-6 text-sm font-semibold text-cc-bg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              View pricing
            </Link>
          </div>
        </CheckoutShell>
      </PublicLayout>
    );
  }

  const selectedPlan = getPricingPlan(requestedPlan);
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return (
      <PublicLayout>
        <CheckoutShell>
          <div className="overflow-hidden rounded-2xl border border-cc-border-strong bg-cc-surface">
            <div className="border-b border-cc-border p-7 text-center sm:p-9">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cc-border bg-cc-surface-raised text-cc-muted">
                <Lock className="h-5 w-5" />
              </span>
              <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-cc-text">
                Sign in to continue
              </h1>
              <p className="mt-3 text-sm leading-6 text-cc-muted">
                A CtrlCode account is required before starting secure Paddle checkout.
              </p>
            </div>
            <div className="bg-cc-secondary p-6 sm:p-7">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle">
                    Selected plan
                  </p>
                  <p className="mt-2 text-lg font-semibold text-cc-text">
                    {selectedPlan.label}
                  </p>
                  <p className="mt-1 text-xs text-cc-muted">
                    {selectedPlan.scanAllowanceLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-semibold tracking-[-0.04em] text-cc-text">
                    {selectedPlan.displayPriceMonthly}
                  </p>
                  <p className="text-xs text-cc-subtle">
                    {selectedPlan.displayPriceSuffix}
                  </p>
                </div>
              </div>
              <Link
                href="/login"
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-cc-text px-6 text-sm font-semibold text-cc-bg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Sign in
              </Link>
            </div>
          </div>
        </CheckoutShell>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <CheckoutShell>
        <Link
          href="/settings"
          className="mb-7 inline-flex items-center gap-2 text-sm font-medium text-cc-muted transition-colors hover:text-cc-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cc-subtle">
            Secure upgrade
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-cc-text">
            Complete your CtrlCode upgrade
          </h1>
          <p className="mt-3 text-sm leading-6 text-cc-muted">
            Confirm the {selectedPlan.label} plan before continuing to Paddle.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cc-border-strong bg-cc-surface shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
          <div className="flex items-start justify-between gap-5 border-b border-cc-border bg-cc-secondary p-6 sm:p-7">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle">
                Selected plan
              </p>
              <h2 className="mt-2 text-xl font-semibold text-cc-text">
                {selectedPlan.label}
              </h2>
              <p className="mt-1 text-xs text-cc-muted">
                {selectedPlan.scanAllowanceLabel}
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-semibold tracking-[-0.05em] text-cc-text">
                {selectedPlan.displayPriceMonthly}
              </span>
              <p className="mt-1 text-xs text-cc-subtle">
                {selectedPlan.displayPriceSuffix}
              </p>
            </div>
          </div>

          <div className="p-6 sm:p-7">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle">
              Included
            </p>
            <ul className="mt-5 space-y-3">
              {selectedPlan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-cc-muted">
                  <Check className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex items-start gap-3 rounded-xl border border-cc-border bg-cc-secondary p-4">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-cc-muted" />
              <p className="text-xs leading-5 text-cc-muted">
                Payments are securely processed by Paddle, our merchant of record. By
                continuing, you agree to our{" "}
                <Link href="/terms" className="text-cc-text underline-offset-4 hover:underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-cc-text underline-offset-4 hover:underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>

            <CheckoutClient plan={requestedPlan} />
          </div>
        </div>
      </CheckoutShell>
    </PublicLayout>
  );
}
