"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Link2, ShieldCheck, Settings, LogOut, ShieldAlert, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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
    <aside className={cn("flex flex-col border-r border-white/5 bg-[#0e0e11]", className)}>
      <div className="flex h-16 shrink-0 items-center px-6">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center h-8 w-8 rounded-lg bg-primary/20 border border-primary/30 group-hover:bg-primary/30 transition-colors">
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">VibeSafe</span>
        </Link>
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
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-zinc-400 hover:bg-white/5 hover:text-white border border-transparent"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-zinc-500")} />
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

      <div className="p-4 border-t border-white/5">
        {/* Simple usage widget */}
        <div className="mb-4 rounded-lg bg-[#121214] border border-white/5 p-3">
          <div className="flex items-center gap-2 mb-2 text-white">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Pro Plan</span>
          </div>
          <div className="w-full bg-black rounded-full h-1.5 mb-1.5 overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full w-1/3" />
          </div>
          <div className="text-[10px] text-zinc-500 flex justify-between">
            <span>34 / 100 scans</span>
            <Link href="/settings" className="hover:text-primary">Manage</Link>
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
