'use client'

import React from 'react'
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface SeverityBadgeProps {
  severity: SeverityLevel
  className?: string
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  const config = {
    CRITICAL: {
      color: 'bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_10px_-2px_rgba(239,68,68,0.3)]',
      icon: <ShieldAlert className="h-3 w-3 mr-1.5" />,
    },
    HIGH: {
      color: 'bg-orange-500/10 text-orange-500 border-orange-500/20 shadow-[0_0_10px_-2px_rgba(249,115,22,0.3)]',
      icon: <AlertOctagon className="h-3 w-3 mr-1.5" />,
    },
    MEDIUM: {
      color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 shadow-[0_0_10px_-2px_rgba(234,179,8,0.2)]',
      icon: <AlertTriangle className="h-3 w-3 mr-1.5" />,
    },
    LOW: {
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_-2px_rgba(59,130,246,0.2)]',
      icon: <Info className="h-3 w-3 mr-1.5" />,
    },
  }

  // Fallback if somehow severity is malformed
  const safeConfig = config[severity] || config.LOW

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
        safeConfig.color,
        className
      )}
    >
      {safeConfig.icon}
      {severity}
    </span>
  )
}

function AlertOctagon(props: React.SVGProps<SVGSVGElement>) {
  return <AlertCircle {...props} />
}
