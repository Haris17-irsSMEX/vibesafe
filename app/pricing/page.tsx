import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { CheckCircle2, X } from "lucide-react";

export default function PricingPage() {
  return (
    <PublicLayout>
      <section className="py-24 bg-slate-50 min-h-screen">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              Simple pricing for secure shipping
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
              Scan your codebase for free. Upgrade to unlock full explanations and AI-ready fix prompts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col">
              <h3 className="text-2xl font-bold text-slate-900">Free</h3>
              <p className="mt-2 text-sm text-slate-500 min-h-[40px]">Get started with basic security scanning.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900">$0</span>
                <span className="text-slate-500"> / forever</span>
              </div>
              <Link
                href="/login"
                className="w-full inline-flex h-12 items-center justify-center rounded-xl bg-slate-100 px-6 text-base font-semibold text-slate-900 transition-all hover:bg-slate-200 mb-8"
              >
                Start Free
              </Link>
              <ul className="space-y-4 text-sm text-slate-600 flex-1">
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Security score</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Severity counts</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Finding names, categories & file paths</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Limited scans</li>
                <li className="flex items-start gap-3 opacity-50"><X className="h-5 w-5 shrink-0 text-slate-400" /> Locked premium fixes</li>
              </ul>
            </div>

            {/* Starter */}
            <div className="rounded-2xl border-2 border-indigo-500 bg-white p-8 shadow-xl flex flex-col relative scale-105 z-10">
              <div className="absolute top-0 right-8 -translate-y-1/2 rounded-full bg-indigo-500 px-3 py-1 text-xs font-bold text-white uppercase tracking-wide">Most Popular</div>
              <h3 className="text-2xl font-bold text-slate-900">Starter</h3>
              <p className="mt-2 text-sm text-slate-500 min-h-[40px]">Full analysis for solo developers and small projects.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900">$29</span>
                <span className="text-slate-500"> / month</span>
              </div>
              <Link
                href="/checkout?plan=starter"
                className="w-full inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-6 text-base font-semibold text-white transition-all hover:bg-indigo-700 shadow-md shadow-indigo-200 mb-8"
              >
                Upgrade to Starter
              </Link>
              <ul className="space-y-4 text-sm text-slate-600 flex-1">
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Everything in Free</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Full finding explanations</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Why it matters</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Suggested fixes & vulnerable code snippets</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Copy-paste fix prompts</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Higher scan limits</li>
              </ul>
            </div>

            {/* Builder */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm flex flex-col">
              <h3 className="text-2xl font-bold text-slate-900">Builder</h3>
              <p className="mt-2 text-sm text-slate-500 min-h-[40px]">For teams shipping fast and securely at scale.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900">$99</span>
                <span className="text-slate-500"> / month</span>
              </div>
              <Link
                href="/checkout?plan=builder"
                className="w-full inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-white px-6 text-base font-semibold text-slate-900 transition-all hover:bg-slate-50 mb-8"
              >
                Upgrade to Builder
              </Link>
              <ul className="space-y-4 text-sm text-slate-600 flex-1">
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Everything in Starter</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Highest scan limits</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> More serious project usage</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Priority scan capacity</li>
                <li className="flex items-start gap-3"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" /> Team-ready workflow</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
