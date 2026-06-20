import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/50 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-90">
            <ShieldCheck className="h-7 w-7 text-indigo-600" />
            <span className="text-xl font-bold tracking-tight text-slate-900">VibeSafe</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Home
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </Link>
            <Link href="/contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Login
            </Link>
            <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition-colors hover:bg-slate-800 shadow-sm">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-1 lg:col-span-2">
              <Link href="/" className="flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-indigo-600" />
                <span className="text-lg font-bold tracking-tight text-slate-900">VibeSafe</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm text-slate-500 leading-relaxed">
                AI security scanner for vibe-coded SaaS apps. Scan for common risks and get security guidance before you ship.
              </p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Product</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li><Link href="/" className="hover:text-indigo-600 transition-colors">Home</Link></li>
                <li><Link href="/pricing" className="hover:text-indigo-600 transition-colors">Pricing</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Company</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li><Link href="/contact" className="hover:text-indigo-600 transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-900">Legal</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600">
                <li><Link href="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link></li>
                <li><Link href="/refund" className="hover:text-indigo-600 transition-colors">Refund Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-100 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">
              &copy; {new Date().getFullYear()} irsSMEX. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
