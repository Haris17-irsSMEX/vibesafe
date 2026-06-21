import { BarChart3, CheckCircle, Clock } from 'lucide-react'
import type { UserPlan } from '@/lib/db/users'
import { GlowCard } from '@/components/ui/glow-card'
import { cn } from '@/lib/utils'

interface UsageCardProps {
  totalScans: number
  completedScans: number
  plan: UserPlan
}

// Scan limits by plan (placeholder — actual enforcement is future work)
const PLAN_SCAN_LIMITS: Record<UserPlan, number | null> = {
  free: 10,
  starter: 50,
  builder: null, // unlimited
}

export function UsageCard({ totalScans, completedScans, plan }: UsageCardProps) {
  const limit = PLAN_SCAN_LIMITS[plan]
  const usagePct = limit ? Math.min(100, Math.round((totalScans / limit) * 100)) : 0
  const nearLimit = limit ? usagePct >= 80 : false

  return (
    <GlowCard className="p-0 overflow-hidden bg-card/50">
      <div className="border-b border-white/5 bg-white/5 px-6 py-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Scan Usage</h2>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-black/40 border border-white/5 px-5 py-4 text-center shadow-inner">
            <p className="text-3xl font-black text-foreground">{totalScans}</p>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-1.5">
              <Clock className="h-3 w-3" />
              Total Scans
            </p>
          </div>
          <div className="rounded-xl bg-black/40 border border-emerald-500/20 px-5 py-4 text-center shadow-inner shadow-emerald-500/5">
            <p className="text-3xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">{completedScans}</p>
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mt-2 flex items-center justify-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              Completed
            </p>
          </div>
        </div>

        {/* Usage bar */}
        {limit !== null ? (
          <div className="bg-white/5 border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                <span className="text-white">{totalScans}</span> / {limit} scans used
              </p>
              <p
                className={cn(
                  "text-[11px] font-bold uppercase tracking-widest",
                  nearLimit ? 'text-amber-500' : 'text-primary'
                )}
              >
                {usagePct}%
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-black/50 shadow-inner">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500 relative",
                  nearLimit ? 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'bg-primary shadow-[0_0_10px_rgba(124,58,237,0.5)]'
                )}
                style={{ width: `${usagePct}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full" />
              </div>
            </div>
            {nearLimit && (
              <p className="mt-4 text-xs font-medium text-amber-500 flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                Approaching scan limit. Upgrade for more capacity.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl bg-violet-500/10 border border-violet-500/20 px-5 py-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20">
              <CheckCircle className="h-4 w-4 text-violet-400" />
            </div>
            <p className="text-sm text-violet-300 font-medium">Unlimited scans unlocked on Builder plan.</p>
          </div>
        )}
      </div>
    </GlowCard>
  )
}
