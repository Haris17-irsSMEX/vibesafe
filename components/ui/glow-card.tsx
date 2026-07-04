import React from "react";
import { cn } from "@/lib/utils";

interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: string;
}

export function GlowCard({
  children,
  className,
  glowColor = "rgba(255, 255, 255, 0.06)",
  ...props
}: GlowCardProps) {
  return (
    <div
      className={cn(
        "relative group rounded-xl bg-cc-surface border border-cc-border transition-all duration-300 hover:border-cc-border-strong hover:bg-cc-surface-raised",
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
