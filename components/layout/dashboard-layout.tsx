"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Menu, X, Search, Bell, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { productName } from "@/lib/brand";

export function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-cc-bg">
      {/* Desktop Sidebar */}
      <Sidebar className="fixed inset-y-0 left-0 z-50 hidden w-64 lg:flex" />

      {/* Mobile Sidebar overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative flex w-64 flex-col border-r border-cc-border bg-cc-bg-secondary">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white z-50"
            >
              <X className="h-6 w-6" />
              <span className="sr-only">Close sidebar</span>
            </button>
            <Sidebar className="w-full flex-1" />
          </div>
        </div>
      )}

      <div className="flex w-full flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-white/5 bg-background/80 backdrop-blur-xl px-6">
          <div className="flex items-center gap-4 lg:hidden">
            <button 
              type="button" 
              className="text-zinc-400 hover:text-white"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open sidebar</span>
            </button>
            <span className="text-lg font-semibold text-cc-text">{productName}</span>
          </div>
          
          <div className="hidden lg:flex flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search repositories, scans, findings... (Press ⌘K)" 
              className="w-full rounded-md border border-cc-border bg-cc-bg-secondary py-2 pl-9 pr-4 text-sm text-cc-text placeholder-cc-subtle transition-all focus:border-cc-border-strong focus:outline-none focus:ring-1 focus:ring-white/20"
            />
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button className="relative text-zinc-400 hover:text-white transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-primary border-2 border-background" />
            </button>
            <Link 
              href="/dashboard/connect"
              className={cn(
                "hidden h-9 items-center gap-2 rounded-md px-4 text-sm font-medium transition-all sm:flex",
                "bg-cc-text text-cc-bg hover:bg-white"
              )}
            >
              <Plus className="h-4 w-4" />
              New Scan
            </Link>
          </div>
        </header>
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
