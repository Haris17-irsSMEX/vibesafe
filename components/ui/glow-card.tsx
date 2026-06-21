import React from "react";
import { cn } from "@/lib/utils";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: string;
}

export function GlowCard({
  children,
  className,
  glowColor = "rgba(124, 58, 237, 0.15)", // Default violet glow
  ...props
}: GlowCardProps) {
  return (
    <div
      className={cn(
        "relative group rounded-xl bg-card border border-white/5 transition-all duration-300 hover:border-white/10",
        className
      )}
      {...props}
    >
      <div
        className="absolute inset-0 rounded-xl opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none"
        style={{
          boxShadow: `0 0 20px 0 ${glowColor}, inset 0 0 20px 0 ${glowColor}`,
        }}
      />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export function GlassPanel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass-panel rounded-2xl p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
