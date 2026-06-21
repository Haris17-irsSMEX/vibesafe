import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { GlowCard } from "@/components/ui/glow-card";
import { CheckCircle2, XCircle } from "lucide-react";

export default function PricingPage() {
  return (
    <PublicLayout>
      <div className="py-24 bg-background">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Simple pricing for secure shipping
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Scan your codebase for free. Upgrade to unlock full explanations, unlimited scans, and AI-ready fix prompts.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            
            {/* Free Plan */}
            <GlowCard className="p-8">
              <h3 className="text-2xl font-bold text-foreground">Free</h3>
              <p className="mt-4 text-sm text-muted-foreground min-h-[40px]">
                For hobby projects and personal use.
              </p>
              <div className="my-8">
                <span className="text-5xl font-extrabold text-foreground">$0</span>
                <span className="text-base font-medium text-muted-foreground"> / month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>1 connected repository</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>50 scans per month</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Basic issue detection (names & paths)</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Community support</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground/50">
                  <XCircle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                  <span>No detailed explanations</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground/50">
                  <XCircle className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                  <span>No AI-ready fix prompts</span>
                </li>
              </ul>
              <Link
                href="/login"
                className="mt-auto block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-semibold text-foreground hover:bg-white/5 transition-colors"
              >
                Get Started
              </Link>
            </GlowCard>

            {/* Starter Plan */}
            <GlowCard className="p-8 border-primary/30 relative" glowColor="rgba(124,58,237,0.3)">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">Most popular</div>
              <h3 className="text-2xl font-bold text-foreground">Starter</h3>
              <p className="mt-4 text-sm text-muted-foreground min-h-[40px]">
                For indie builders and small teams.
              </p>
              <div className="my-8">
                <span className="text-5xl font-extrabold text-foreground">$9</span>
                <span className="text-base font-medium text-muted-foreground"> / month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>10 connected repositories</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Unlimited scans</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Advanced issue detection</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground font-medium">Full AI explanations</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground font-medium">Copy-paste fix prompts</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Email support</span>
                </li>
              </ul>
              <Link
                href="/checkout?plan=starter"
                className="mt-auto block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-primary-foreground hover:bg-primary-hover shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] transition-all"
              >
                Start Free Trial
              </Link>
            </GlowCard>

            {/* Builder Plan */}
            <GlowCard className="p-8">
              <h3 className="text-2xl font-bold text-foreground">Builder</h3>
              <p className="mt-4 text-sm text-muted-foreground min-h-[40px]">
                For growing teams and production apps.
              </p>
              <div className="my-8">
                <span className="text-5xl font-extrabold text-foreground">$29</span>
                <span className="text-base font-medium text-muted-foreground"> / month</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground font-medium">Unlimited repositories</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Unlimited scans</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Everything in Starter</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Priority scanning speed</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Team collaboration</span>
                </li>
                <li className="flex gap-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link
                href="/checkout?plan=builder"
                className="mt-auto block w-full rounded-xl border border-white/10 py-3 text-center text-sm font-semibold text-foreground hover:bg-white/5 transition-colors"
              >
                Start Free Trial
              </Link>
            </GlowCard>

          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
