"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GitFork,
  FileSearch,
  Settings,
  LogOut,
  CreditCard,
  Shield,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";

import { useEffect, useState } from "react";

export function Sidebar({
  className = "",
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch('/api/admin/check')
      .then(r => r.json())
      .then(data => setIsAdmin(data.isAdmin))
      .catch(console.error)
  }, []);

  const mainLinks = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, exact: true },
    { name: "Connect GitHub", href: "/dashboard/connect", icon: GitFork },
    { name: "Results", href: "/results", icon: FileSearch },
    { name: "System Testing", href: "/system-testing", icon: Activity },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isRouteActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className={cn("flex flex-col border-r border-cc-border bg-cc-bg-secondary", className)}>
      <div className="flex h-[72px] shrink-0 items-center border-b border-cc-border px-5">
        <BrandLogo />
      </div>
      
      <div className="flex-1 overflow-y-auto px-3 py-5">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-cc-subtle">
          Workspace
        </div>
        <nav aria-label="Main navigation" className="mb-7 flex flex-col gap-1">
          {mainLinks.map((link) => {
            const Icon = link.icon;
            const isActive = isRouteActive(link.href, link.exact);
            
            return (
              <Link
                key={link.name}
                href={link.href}
                onClick={onNavigate}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group relative flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:border-cc-border-strong focus-visible:ring-2 focus-visible:ring-white/20",
                  isActive 
                    ? "border-cc-border-strong bg-cc-surface-raised text-cc-text"
                    : "border-transparent text-cc-muted hover:bg-cc-surface-hover hover:text-cc-text"
                )}
              >
                {isActive && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-cc-text" />
                )}
                <Icon className={cn("h-4 w-4", isActive ? "text-cc-text" : "text-cc-subtle")} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Admin nav — only visible to admin users */}
        {isAdmin && (
          <div className="mb-4">
            <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-cc-subtle">Administration</div>
            <nav aria-label="Admin navigation" className="flex flex-col gap-1">
              <Link
                href="/admin"
                onClick={onNavigate}
                aria-current={pathname === "/admin" ? "page" : undefined}
                className={cn(
                  "relative flex min-h-10 items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet-400/30",
                  pathname === '/admin'
                    ? "border-violet-500/20 bg-violet-500/10 text-violet-300"
                    : "border-transparent text-cc-muted hover:bg-cc-surface-hover hover:text-violet-300"
                )}
              >
                {pathname === "/admin" && (
                  <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-violet-400" />
                )}
                <Shield className={cn("h-4 w-4", pathname === '/admin' ? "text-violet-400" : "text-cc-subtle")} />
                Admin Panel
              </Link>
            </nav>
          </div>
        )}
      </div>

      <div className="border-t border-cc-border p-3">
        <Link
          href="/settings"
          onClick={onNavigate}
          className="mb-1 flex min-h-11 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-cc-muted outline-none transition-colors hover:border-cc-border hover:bg-cc-surface hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cc-border bg-cc-surface-raised">
            <CreditCard className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-medium text-cc-text">Plan &amp; billing</span>
            <span className="block truncate text-[11px] text-cc-subtle">View current plan</span>
          </span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-cc-muted outline-none transition-colors hover:bg-cc-surface-hover hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <LogOut className="h-4 w-4 text-cc-subtle" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
