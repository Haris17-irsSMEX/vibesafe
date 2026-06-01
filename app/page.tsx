import Link from "next/link";
import { ShieldCheck, Zap, Lock, Code2 } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-slate-50 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-indigo-50 to-slate-50 border-b border-indigo-100/50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-indigo-500/10 blur-3xl rounded-full opacity-50 pointer-events-none" />
      
      {/* Navbar */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-8 h-8 text-indigo-600" />
          <span className="text-xl font-bold text-slate-900 tracking-tight">VibeSafe</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Sign In
          </Link>
          <Link href="/login" className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-all shadow-sm hover:shadow-md">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-24 pb-32 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold tracking-wide uppercase mb-8 border border-indigo-200">
          <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
          VibeSafe 1.0 is Live
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 max-w-4xl mx-auto leading-tight">
          Keep your ship safe <br className="hidden md:block"/> 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">without killing the vibe.</span>
        </h1>
        
        <p className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          The first AI security scanner built exclusively for vibe-coded SaaS apps. 
          Identify vulnerabilities instantly, fix them automatically, and ship with confidence.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/login"
            className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full bg-indigo-600 px-8 text-base font-semibold text-white transition-all hover:bg-indigo-700 hover:scale-105 shadow-lg shadow-indigo-600/20"
          >
            Start Scanning Free
          </Link>
          <Link
            href="#features"
            className="w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full border border-slate-200 bg-white/50 backdrop-blur-sm px-8 text-base font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900"
          >
            View Features
          </Link>
        </div>

        {/* Feature Grid */}
        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Lightning Fast</h3>
            <p className="text-slate-600 leading-relaxed">Scans your entire repository in seconds. Real-time feedback directly in your PRs so you never slow down.</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-6">
              <Code2 className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">AI-Powered Fixes</h3>
            <p className="text-slate-600 leading-relaxed">Don't just find bugs—fix them. Our AI generates production-ready patches for every vulnerability it finds.</p>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-3">Zero Config</h3>
            <p className="text-slate-600 leading-relaxed">Connect your GitHub account and you're done. No complex rulesets or massive YAML files to maintain.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
