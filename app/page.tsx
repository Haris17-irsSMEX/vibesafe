import Link from "next/link";
import { PublicLayout } from "@/components/layout/public-layout";
import { GlowCard, GlassPanel } from "@/components/ui/glow-card";
import { Sparkline, DonutChart } from "@/components/ui/chart";
import {
  ShieldCheck,
  Search,
  Key,
  ShieldAlert,
  AlertTriangle,
  FileCode2,
  Lock,

  Zap,
  Activity,
  CheckCircle2,
  TerminalSquare
} from "lucide-react";
import { cn } from "@/lib/utils";
import { shortDescription } from "@/lib/brand";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

export default function Home() {
  return (
    <PublicLayout>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-32 text-center lg:pt-36 lg:pb-40">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(124,58,237,0.15),rgba(255,255,255,0))]" />
        
        <div className="relative mx-auto max-w-7xl px-6 z-10 flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-8 border border-primary/20 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            AI Security Officer for GitHub repos
          </div>
          
          <h1 className="mx-auto max-w-5xl text-5xl font-extrabold tracking-tight text-foreground md:text-7xl lg:text-[5rem] leading-[1.1] text-balance">
            Review your code <span className="text-gradient">before attackers do.</span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed text-balance">
            {shortDescription}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className={cn(
                "inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl px-8 text-base font-semibold text-primary-foreground transition-all",
                "bg-primary hover:bg-primary-hover shadow-[0_0_30px_-5px_rgba(124,58,237,0.5)] hover:shadow-[0_0_40px_-5px_rgba(124,58,237,0.7)]"
              )}
            >
              Start scanning for free
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm px-8 text-base font-semibold text-foreground transition-all hover:bg-white/10"
            >
              <Zap className="h-4 w-4" />
              See how it works
            </Link>
          </div>
          
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground font-medium">
            <span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Read-only access</span>
            <span className="flex items-center gap-2"><TerminalSquare className="h-4 w-4" /> No code modified</span>
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Private results</span>
          </div>
        </div>
      </section>

      {/* Product Mockup Hero */}
      <section className="relative mx-auto max-w-6xl px-6 -mt-12 mb-32 z-20">
        <div className="glow-border rounded-2xl bg-black">
          <div className="rounded-2xl border border-white/10 bg-[#09090b] shadow-2xl overflow-hidden flex flex-col">
            {/* Browser Header */}
            <div className="h-12 border-b border-white/5 bg-[#121214] flex items-center px-4 gap-4">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="h-6 w-96 rounded-md bg-[#1e1e21] border border-white/5 flex items-center justify-center text-[11px] text-zinc-500 font-medium">
                  <Lock className="w-3 h-3 mr-1" />
                  CtrlCode security workspace
                </div>
              </div>
              <div className="w-16" /> {/* Spacer */}
            </div>
            
            {/* Dashboard Mockup Content */}
            <div className="flex h-[600px] bg-[#09090b]">
              {/* Sidebar */}
              <div className="w-64 border-r border-white/5 bg-[#0e0e11] p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 px-2 py-3 mb-4">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  <span className="font-bold text-sm">CtrlCode</span>
                </div>
                <div className="px-3 py-2 text-sm text-white bg-white/5 rounded-md flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Overview
                </div>
                <div className="px-3 py-2 text-sm text-zinc-500 flex items-center gap-2">
                  <GithubIcon className="w-4 h-4" /> Repositories
                </div>
                <div className="px-3 py-2 text-sm text-zinc-500 flex items-center gap-2">
                  <Search className="w-4 h-4" /> Scans
                </div>
                <div className="mt-auto px-3 py-2 flex items-center gap-2 border-t border-white/5 pt-4">
                  <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs text-white">A</div>
                  <span className="text-sm text-zinc-400">Alex Chen</span>
                </div>
              </div>
              
              {/* Main Content */}
              <div className="flex-1 p-8 overflow-hidden">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Good morning, Alex 👋</h2>
                    <p className="text-sm text-zinc-400 mt-1">Here&apos;s your security overview.</p>
                  </div>
                  <div className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium">New scan</div>
                </div>
                
                {/* Metric Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-xl bg-[#121214] border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1">Security score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">87</span>
                      <span className="text-xs text-zinc-500">/ 100</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-green-500/10 text-green-400 ml-auto">Good</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#121214] border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1">High severity</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-red-400">7</span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 ml-auto">Needs attention</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#121214] border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1">Repositories</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">12</span>
                      <span className="text-xs text-zinc-500 ml-auto">Scanned</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-[#121214] border border-white/5">
                    <p className="text-xs text-zinc-500 mb-1">Total findings</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">142</span>
                      <span className="text-xs text-zinc-500 ml-auto">Across all repos</span>
                    </div>
                  </div>
                </div>
                
                {/* Charts Area */}
                <div className="grid grid-cols-3 gap-6 mb-6">
                  <div className="col-span-2 p-6 rounded-xl bg-[#121214] border border-white/5">
                    <p className="text-sm font-medium text-white mb-6">Findings over time</p>
                    <div className="h-40 w-full relative">
                      <Sparkline data={[20, 35, 25, 45, 30, 60, 40]} color="#7c3aed" height={160} width={600} />
                    </div>
                  </div>
                  <div className="col-span-1 p-6 rounded-xl bg-[#121214] border border-white/5 flex flex-col items-center justify-center relative">
                    <p className="text-sm font-medium text-white mb-6 w-full text-left absolute top-6 left-6">By severity</p>
                    <div className="relative w-32 h-32 mt-4">
                      <DonutChart 
                        data={[
                          { label: 'Critical', value: 7, color: '#ef4444' },
                          { label: 'High', value: 23, color: '#f97316' },
                          { label: 'Medium', value: 48, color: '#eab308' },
                          { label: 'Low', value: 64, color: '#3b82f6' }
                        ]} 
                        size={128} 
                        strokeWidth={16} 
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white">142</span>
                        <span className="text-[10px] text-zinc-500">Total</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Recent Scans row */}
                <div className="p-4 rounded-xl bg-[#121214] border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GithubIcon className="w-5 h-5 text-zinc-400" />
                    <div>
                      <p className="text-sm text-white font-medium">acme/web-app</p>
                      <p className="text-xs text-zinc-500">Code Scan</p>
                    </div>
                  </div>
                  <div className="text-sm text-zinc-400">2m ago</div>
                  <div className="text-sm font-medium text-green-400">87 / 100</div>
                  <div className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded text-xs text-white cursor-pointer">View</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem Section */}
      <section className="py-24 relative">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16">
            <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">The Problem</h2>
            <h3 className="text-3xl md:text-5xl font-bold text-foreground text-balance">
              Modern teams ship fast.<br/>
              <span className="text-muted-foreground">Attackers move faster.</span>
            </h3>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              AI helps teams build faster, but speed can hide security and production-readiness risks. CtrlCode helps surface them before release.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Key, title: "Exposed secrets", desc: "Hard-coded API keys, tokens, and credentials leak into repos.", color: "text-red-400", bg: "bg-red-400/10" },
              { icon: Lock, title: "Weak auth flows", desc: "Broken or missing auth checks open the door to account takeover.", color: "text-orange-400", bg: "bg-orange-400/10" },
              { icon: AlertTriangle, title: "Risky dependencies", desc: "Vulnerable packages and outdated libraries introduce risk.", color: "text-amber-400", bg: "bg-amber-400/10" },
              { icon: FileCode2, title: "Unsafe file handling", desc: "File uploads and paths can lead to data leaks or remote attacks.", color: "text-emerald-400", bg: "bg-emerald-400/10" },
            ].map((feature, idx) => (
              <GlowCard key={idx} className="p-6">
                <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center mb-4", feature.bg)}>
                  <feature.icon className={cn("h-6 w-6", feature.color)} />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 border-t border-white/5 bg-black relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_50%,rgba(124,58,237,0.05),rgba(255,255,255,0))]" />
        <div className="mx-auto max-w-7xl px-6 relative z-10 text-center">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">How CtrlCode Works</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-16">Secure your code in four simple steps.</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-6 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/10 via-primary/40 to-primary/10 z-0" />
            
            {[
              { num: "1", icon: GithubIcon, title: "Connect GitHub", desc: "Link your repository in seconds with read-only access." },
              { num: "2", icon: Search, title: "Scan repository", desc: "Our AI analyzes your code, configs, dependencies, and infra." },
              { num: "3", icon: ShieldAlert, title: "Review findings", desc: "Get clear, actionable insights with severity and context." },
              { num: "4", icon: TerminalSquare, title: "Fix issues faster", desc: "Integrate AI-provided fixes into your workflow and ship." }
            ].map((step, idx) => (
              <div key={idx} className="relative z-10 flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary font-bold mb-6 shadow-[0_0_15px_rgba(124,58,237,0.3)]">
                  {step.num}
                </div>
                <step.icon className="h-6 w-6 text-muted-foreground mb-4" />
                <h4 className="text-lg font-semibold text-foreground mb-2">{step.title}</h4>
                <p className="text-sm text-muted-foreground max-w-[200px] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Results Showcase Section */}
      <section className="py-24 border-t border-white/5 relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Rich Results</h2>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Actionable insights that help you ship securely.</h3>
              <p className="text-lg text-muted-foreground mb-8">
                CtrlCode identifies risks and helps you act on them. See where an issue appears and get an AI-ready remediation prompt.
              </p>
              <ul className="space-y-4">
                {[
                  "Accurate AI-powered detection",
                  "Clear impact and remediation",
                  "Prioritized by risk and reach",
                  "Continuous scans & alerts"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-foreground font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <Link href="/login" className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-all">
                  Start scanning for free
                </Link>
              </div>
            </div>
            
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-accent/20 blur-2xl rounded-full opacity-50" />
              <GlassPanel className="relative p-0 overflow-hidden border-white/10">
                <div className="p-6 border-b border-white/5">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 font-bold border border-red-500/20">CRITICAL</span>
                    <h4 className="text-white font-semibold">Hardcoded API key</h4>
                  </div>
                  <p className="text-sm text-zinc-400">API key detected in source code. This can lead to unauthorized access to third-party services and data leaks.</p>
                </div>
                <div className="p-6 bg-black/50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-zinc-500 font-mono">src/config/env.ts:14</span>
                    <span className="text-[10px] px-2 py-1 bg-white/5 rounded text-zinc-400 border border-white/10">View file</span>
                  </div>
                  <div className="rounded-md bg-[#0d0d0f] border border-white/5 p-4 font-mono text-xs overflow-x-auto">
                    <div className="text-zinc-500">12  <span className="text-pink-400">export const</span> config = {'{'}</div>
                    <div className="text-zinc-500">13    apiKey: <span className="text-green-400">&quot;sk_live_519b...&quot;</span>,</div>
                    <div className="text-zinc-500">14    region: <span className="text-green-400">&quot;us-east-1&quot;</span>,</div>
                    <div className="text-zinc-500">15  {'}'}</div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <h5 className="text-xs font-semibold text-white mb-2">Recommendation</h5>
                    <p className="text-sm text-zinc-400">Remove the API key from code and use environment variables instead.</p>
                    <div className="mt-3 flex items-center justify-between p-3 rounded border border-primary/20 bg-primary/5">
                      <code className="text-xs text-primary-foreground">process.env.API_KEY</code>
                      <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                        <TerminalSquare className="w-3 h-3 text-primary-foreground" />
                      </div>
                    </div>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-24 border-t border-white/5 bg-black">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-xs font-bold text-primary uppercase tracking-widest mb-3">Plans for every builder</h2>
          <h3 className="text-3xl md:text-5xl font-bold text-foreground mb-6">Simple pricing, serious protection.</h3>
          <p className="text-muted-foreground mb-16 max-w-xl mx-auto text-lg">
            Scan your codebase for free. Upgrade to unlock full explanations, unlimited scans, and AI-ready fix prompts.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
            <GlowCard className="p-8" glowColor="rgba(255,255,255,0.05)">
              <h3 className="text-xl font-bold text-foreground">Free</h3>
              <p className="mt-2 text-sm text-muted-foreground min-h-[40px]">For hobby projects and personal use.</p>
              <div className="my-6">
                <span className="text-4xl font-bold text-foreground">$0</span><span className="text-muted-foreground"> / month</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-muted-foreground">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> 1 repository</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> 50 scans / month</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> Basic issue detection</li>
              </ul>
              <Link href="/login" className="block w-full py-2.5 px-4 text-center rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium text-foreground">
                Get started
              </Link>
            </GlowCard>
            
            <GlowCard className="p-8 border-primary/30 relative" glowColor="rgba(124,58,237,0.3)">
              <div className="absolute top-0 right-8 -translate-y-1/2 bg-primary px-3 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider">Most popular</div>
              <h3 className="text-xl font-bold text-foreground">Starter</h3>
              <p className="mt-2 text-sm text-muted-foreground min-h-[40px]">For indie builders and small teams.</p>
              <div className="my-6">
                <span className="text-4xl font-bold text-foreground">$9</span><span className="text-muted-foreground"> / month</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-muted-foreground">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> 10 repositories</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited scans</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> Advanced issue detection</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> Fix recommendations</li>
              </ul>
              <Link href="/checkout?plan=starter" className="block w-full py-2.5 px-4 text-center rounded-lg bg-primary hover:bg-primary-hover transition-colors text-sm font-medium text-white shadow-lg shadow-primary/25">
                Start free trial
              </Link>
            </GlowCard>
            
            <GlowCard className="p-8" glowColor="rgba(255,255,255,0.05)">
              <h3 className="text-xl font-bold text-foreground">Builder</h3>
              <p className="mt-2 text-sm text-muted-foreground min-h-[40px]">For growing teams and production apps.</p>
              <div className="my-6">
                <span className="text-4xl font-bold text-foreground">$29</span><span className="text-muted-foreground"> / month</span>
              </div>
              <ul className="space-y-4 mb-8 text-sm text-muted-foreground">
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> Unlimited repositories</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> Priority scanning speed</li>
                <li className="flex items-center gap-3"><CheckCircle2 className="h-4 w-4 text-primary" /> Team collaboration</li>
              </ul>
              <Link href="/checkout?plan=builder" className="block w-full py-2.5 px-4 text-center rounded-lg border border-white/10 hover:bg-white/5 transition-colors text-sm font-medium text-foreground">
                Start free trial
              </Link>
            </GlowCard>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
