"use client";

import Link from "next/link";
import { LayoutDashboard, Link2, ShieldCheck, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function Sidebar({ className = "" }: { className?: string }) {
  const router = useRouter();
  const supabase = createClient();

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
    <aside className={`flex flex-col border-r border-slate-200 bg-slate-50 ${className}`}>
      <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-6">
        <span className="text-xl font-semibold tracking-tight text-slate-900">VibeSafe</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              href={link.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-900"
            >
              <Icon className="h-4 w-4" />
              {link.name}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-200">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Log Out
        </button>
      </div>
    </aside>
  );
}
