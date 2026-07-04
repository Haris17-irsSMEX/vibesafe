import type { UserPlan } from '@/lib/db/users'

type PlanLimit = {
  count: number
  windowLabel: string
}

export const FILE_FETCH_LIMITS: Record<UserPlan, PlanLimit> = {
  free: { count: 5, windowLabel: 'hour' },
  starter: { count: 20, windowLabel: 'hour' },
  builder: { count: 50, windowLabel: 'hour' },
}

export const AI_SCAN_LIMITS: Record<UserPlan, PlanLimit> = {
  free: { count: 2, windowLabel: 'day' },
  starter: { count: 20, windowLabel: 'day' },
  builder: { count: 100, windowLabel: 'day' },
}

export function getAiScanAllowanceLabel(plan: UserPlan): string {
  const limit = AI_SCAN_LIMITS[plan]
  return `${limit.count} AI reviews / ${limit.windowLabel}`
}
