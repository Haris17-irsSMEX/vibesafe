import { BarChart3, CheckCircle, Clock } from 'lucide-react'
import type { UserPlan } from '@/lib/db/users'

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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-slate-900">Scan Usage</h2>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-slate-900">{totalScans}</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              Total Scans
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-emerald-600">{completedScans}</p>
            <p className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              Completed
            </p>
          </div>
        </div>

        {/* Usage bar */}
        {limit !== null ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500">
                {totalScans} / {limit} scans used
              </p>
              <p
                className={`text-xs font-medium ${
                  nearLimit ? 'text-amber-600' : 'text-slate-500'
                }`}
              >
                {usagePct}%
              </p>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  nearLimit ? 'bg-amber-500' : 'bg-indigo-500'
                }`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            {nearLimit && (
              <p className="mt-2 text-xs text-amber-600">
                You&apos;re approaching your scan limit. Consider upgrading for more scans.
              </p>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-violet-50 border border-violet-100 px-4 py-3">
            <CheckCircle className="h-4 w-4 text-violet-500 shrink-0" />
            <p className="text-sm text-violet-700 font-medium">Unlimited scans on Builder plan</p>
          </div>
        )}
      </div>
    </div>
  )
}
