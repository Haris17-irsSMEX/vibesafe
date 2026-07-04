"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";
import { usePathname } from "next/navigation";

const routeDetails = [
  { match: (path: string) => path === "/dashboard", title: "Dashboard", detail: "Security overview" },
  { match: (path: string) => path.startsWith("/dashboard/connect"), title: "Connect GitHub", detail: "Repository access" },
  { match: (path: string) => path.startsWith("/scan/"), title: "Scan terminal", detail: "Security analysis" },
  { match: (path: string) => path.startsWith("/results/"), title: "Scan results", detail: "Findings and reports" },
  { match: (path: string) => path === "/results", title: "Results", detail: "Completed scans" },
  { match: (path: string) => path.startsWith("/settings"), title: "Settings", detail: "Account and billing" },
  { match: (path: string) => path.startsWith("/admin"), title: "Admin", detail: "Internal operations" },
];

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const currentRoute = routeDetails.find((route) => route.match(pathname)) ?? {
    title: "CtrlCode",
    detail: "Security workspace",
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobileMenuOpen]);

  return (
    <div className="flex min-h-screen bg-cc-bg">
      {/* Desktop Sidebar */}
      <Sidebar className="fixed inset-y-0 left-0 z-50 hidden w-[260px] lg:flex" />

      {/* Mobile Sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div id="mobile-navigation" className="relative flex w-[min(84vw,280px)] flex-col border-r border-cc-border bg-cc-bg-secondary shadow-2xl">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute right-3 top-5 z-50 flex h-8 w-8 items-center justify-center rounded-lg text-cc-muted outline-none transition-colors hover:bg-cc-surface-hover hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20"
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close sidebar</span>
            </button>
            <Sidebar className="w-full flex-1 border-r-0" onNavigate={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 w-full flex-col lg:pl-[260px]">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-[72px] items-center justify-between gap-4 border-b border-cc-border bg-cc-bg/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button 
              type="button" 
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-navigation"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-cc-muted outline-none transition-colors hover:bg-cc-surface-hover hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20 lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open sidebar</span>
            </button>
            <div className="lg:hidden">
              <BrandLogo compact />
            </div>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-sm font-semibold text-cc-text">{currentRoute.title}</p>
              <p className="truncate text-xs text-cc-subtle">{currentRoute.detail}</p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link 
              href="/dashboard/connect"
              className={cn(
                "flex h-9 items-center gap-2 rounded-lg bg-cc-text px-3.5 text-sm font-medium text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-cc-bg"
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New scan</span>
            </Link>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
