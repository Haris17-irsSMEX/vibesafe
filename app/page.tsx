import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { ShieldCheck, Search, Lock, Cpu, CheckCircle2, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 pt-24 pb-32 text-center lg:pt-36 lg:pb-40">
        {/* Abstract security grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-6 z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold tracking-wide uppercase mb-8 border border-indigo-500/20">
            <span className="flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            VibeSafe Security AI
          </div>
          
          <h1 className="mx-auto max-w-4xl text-5xl font-extrabold tracking-tight text-white md:text-7xl leading-[1.1]">
            AI security scanner for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">vibe-coded apps</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300 md:text-xl leading-relaxed">
            Connect your GitHub repo, scan for hidden security risks, and get clear fix guidance before you ship.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-indigo-500 px-8 text-base font-semibold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-400 hover:scale-105"
            >
              Start Free Scan
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center rounded-xl border border-slate-700 bg-slate-800/50 backdrop-blur-sm px-8 text-base font-semibold text-slate-300 transition-all hover:bg-slate-800 hover:text-white"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Trust & Security Note Strip */}
      <div className="border-y border-slate-200 bg-slate-50 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-4 px-6 text-sm font-medium text-slate-600">
          <span className="flex items-center gap-2"><Search className="h-4 w-4 text-indigo-500" /> Reads code for scanning</span>
          <span className="flex items-center gap-2"><Lock className="h-4 w-4 text-indigo-500" /> Never writes to repositories</span>
          <span className="flex items-center gap-2"><Cpu className="h-4 w-4 text-indigo-500" /> Tokens stay server-side</span>
          <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-indigo-500" /> Private scan results</span>
        </div>
      </div>

      {/* Problem Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
            AI-built apps ship fast. <br className="hidden sm:block" />
            <span className="text-slate-500">But security gaps hide in plain sight.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-lg text-slate-600 leading-relaxed">
            When you build rapidly with AI, it&apos;s easy to overlook critical security boundaries. 
            VibeSafe helps detect hidden risks in auth, database rules, secrets, dependencies, 
            rate limits, CORS, file uploads, and payment/webhook logic.
          </p>
        </div>
      </section>

      {/* How It Works & Demo Mockup */}
      <section className="py-24 bg-slate-50 border-t border-slate-100">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Steps */}
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-8">How it works</h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 font-bold text-lg">1</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Connect GitHub</h3>
                    <p className="mt-2 text-slate-600">Authorize VibeSafe to securely read your target repository.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 font-bold text-lg">2</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Run AI security scan</h3>
                    <p className="mt-2 text-slate-600">Our AI engine scans for common risks and categorizes vulnerabilities by severity.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 font-bold text-lg">3</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Review findings</h3>
                    <p className="mt-2 text-slate-600">Navigate a clean dashboard highlighting critical issues and exact file paths.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 font-bold text-lg">4</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Upgrade for full fix prompts</h3>
                    <p className="mt-2 text-slate-600">Unlock detailed explanations, vulnerable code snippets, and AI-ready fix prompts.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Static Demo Mockup */}
            <div className="relative rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
              <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-400"></div>
                  <div className="h-3 w-3 rounded-full bg-green-400"></div>
                </div>
                <div className="ml-4 flex h-6 w-full max-w-sm items-center rounded-md bg-white px-3 text-xs text-slate-400 border border-slate-200">vibesafe.irssmex.com/results/scan-123</div>
              </div>
              <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Scan Results</h4>
                    <p className="text-sm text-slate-500">my-vibe-coded-app</p>
                  </div>
                  <div className="flex items-center justify-center h-12 w-12 rounded-full border-4 border-red-100">
                    <span className="text-lg font-bold text-red-600">2</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">CRITICAL</span>
                      <span className="text-sm font-semibold text-slate-900">Hardcoded Supabase Service Key</span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono">lib/db/admin.ts</p>
                  </div>
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-800">HIGH</span>
                      <span className="text-sm font-semibold text-slate-900">Missing Row Level Security</span>
                    </div>
                    <p className="text-xs text-slate-600 font-mono">supabase/migrations/002_profiles.sql</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* What VibeSafe Checks */}
      <section className="py-24 bg-white">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold text-slate-900 mb-12">What VibeSafe checks</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
            {[
              "Secrets & environment variables",
              "Authentication & sessions",
              "Database security & RLS",
              "Payments & webhooks",
              "Dependency vulnerabilities",
              "Rate limiting gaps",
              "CORS misconfigurations",
              "File upload security"
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-24 bg-slate-900 text-center">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-3xl font-bold text-white mb-6">Simple pricing for secure shipping</h2>
          <p className="text-slate-400 mb-12 max-w-xl mx-auto">
            Scan your codebase for free. Upgrade to unlock full explanations and AI-ready fix prompts.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-left">
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <h3 className="text-xl font-bold text-white">Free</h3>
              <p className="mt-2 text-sm text-slate-400">Basic security scanning.</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Security score & counts</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Finding names & file paths</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-indigo-500 bg-indigo-900/20 p-6 relative">
              <div className="absolute top-0 right-6 -translate-y-1/2 rounded-full bg-indigo-500 px-3 py-0.5 text-xs font-bold text-white uppercase tracking-wide">Popular</div>
              <h3 className="text-xl font-bold text-white">Starter</h3>
              <p className="mt-2 text-sm text-slate-400">Full analysis for solo devs.</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Everything in Free</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Full explanations & fixes</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Copy-paste fix prompts</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <h3 className="text-xl font-bold text-white">Builder</h3>
              <p className="mt-2 text-sm text-slate-400">For teams scaling fast.</p>
              <ul className="mt-6 space-y-3 text-sm text-slate-300">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Everything in Starter</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Priority scanning</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-400" /> Higher limits</li>
              </ul>
            </div>
          </div>
          <div className="mt-12">
            <Link
              href="/pricing"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-slate-900 transition-all hover:bg-slate-100"
            >
              See Detailed Pricing
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
