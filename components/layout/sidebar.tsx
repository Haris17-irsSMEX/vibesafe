"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Link2, ShieldCheck, Settings, LogOut, ShieldAlert, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/brand/brand-logo";

import { useEffect, useState } from "react";

export function Sidebar({
  className = "",
}: {
  className?: string;
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

  const links = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Connect Repo", href: "/dashboard/connect", icon: Link2 },
    { name: "Results", href: "/results", icon: ShieldCheck },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className={cn("flex flex-col border-r border-cc-border bg-cc-bg-secondary", className)}>
      <div className="flex h-16 shrink-0 items-center px-6">
        <BrandLogo />
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mb-4 text-xs font-semibold uppercase tracking-wider text-zinc-500 px-2">Overview</div>
        <nav className="flex flex-col gap-1 mb-8">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/dashboard');
            
            return (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive 
                    ? "border border-cc-border-strong bg-cc-surface-raised text-cc-text"
                    : "border border-transparent text-cc-muted hover:bg-cc-surface-hover hover:text-cc-text"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-cc-text" : "text-cc-subtle")} />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Admin nav — only visible to admin users */}
        {isAdmin && (
          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-violet-500/70 px-2">Admin</div>
            <nav className="flex flex-col gap-1">
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === '/admin'
                    ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                    : "text-violet-400/70 hover:bg-violet-500/10 hover:text-violet-400 border border-transparent"
                )}
              >
                <Shield className={cn("h-4 w-4", pathname === '/admin' ? "text-violet-400" : "text-violet-500/60")} />
                Admin Panel
              </Link>
            </nav>
          </div>
        )}
      </div>

      <div className="border-t border-cc-border p-4">
        <div className="mb-4 rounded-lg border border-cc-border bg-cc-surface p-3">
          <div className="mb-1 flex items-center gap-2 text-cc-text">
            <ShieldAlert className="h-4 w-4 text-cc-muted" />
            <span className="text-xs font-semibold">Current plan</span>
          </div>
          <div className="flex justify-between text-[10px] text-cc-subtle">
            <span>View usage and billing</span>
            <Link href="/settings" className="text-cc-muted hover:text-cc-text">Manage</Link>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 text-zinc-500" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
