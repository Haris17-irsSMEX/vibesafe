'use client'

import React from 'react'
import { AlertTriangle, AlertCircle, Info, ShieldAlert } from 'lucide-react'

export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface SeverityBadgeProps {
  severity: SeverityLevel
  className?: string
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  const config = {
    CRITICAL: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: <ShieldAlert className="h-3 w-3 mr-1" />,
    },
    HIGH: {
      color: 'bg-orange-100 text-orange-800 border-orange-200',
      icon: <AlertOctagon className="h-3 w-3 mr-1" />, // Wait, AlertOctagon is not imported. Let's use AlertTriangle for high.
    },
    MEDIUM: {
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: <AlertTriangle className="h-3 w-3 mr-1" />,
    },
    LOW: {
      color: 'bg-slate-100 text-slate-800 border-slate-200',
      icon: <Info className="h-3 w-3 mr-1" />,
    },
  }

  // Fallback if somehow severity is malformed
  const safeConfig = config[severity] || config.LOW

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${safeConfig.color} ${className}`}
    >
      {safeConfig.icon}
      {severity}
    </span>
  )
}

function AlertOctagon(props: React.SVGProps<SVGSVGElement>) {
  return <AlertCircle {...props} />
}
