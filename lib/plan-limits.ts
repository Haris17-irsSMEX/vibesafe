import type { UserPlan } from '@/lib/db/users'

type PlanLimit = {
  count: number
  windowLabel: string
}

export type EntitlementPlan = UserPlan | 'admin'

export type PlanEntitlements = {
  securityScansPerDay: number
  systemTestsPerDay: number
  securityReportsEnabled: boolean
  guidedWorkflowTestingEnabled: boolean
  maxSystemTestPages: number
  maxWorkflowSteps: number
}

export const FILE_FETCH_LIMITS: Record<UserPlan, PlanLimit> = {
  free: { count: 5, windowLabel: 'hour' },
  starter: { count: 20, windowLabel: 'hour' },
  builder: { count: 50, windowLabel: 'hour' },
  pro: { count: 50, windowLabel: 'hour' },
}

export const AI_SCAN_LIMITS: Record<UserPlan, PlanLimit> = {
  free: { count: 2, windowLabel: 'day' },
  starter: { count: 20, windowLabel: 'day' },
  builder: { count: 100, windowLabel: 'day' },
  pro: { count: 100, windowLabel: 'day' },
}

export const SYSTEM_TEST_PRODUCT_LIMITS: Record<UserPlan, PlanLimit> = {
  free: { count: 1, windowLabel: 'day' },
  starter: { count: 10, windowLabel: 'day' },
  builder: { count: 50, windowLabel: 'day' },
  pro: { count: 50, windowLabel: 'day' },
}

export const PLAN_ENTITLEMENTS: Record<EntitlementPlan, PlanEntitlements> = {
  free: {
    securityScansPerDay: 2,
    systemTestsPerDay: 1,
    securityReportsEnabled: true,
    guidedWorkflowTestingEnabled: false,
    maxSystemTestPages: 10,
    maxWorkflowSteps: 0,
  },
  starter: {
    securityScansPerDay: 20,
    systemTestsPerDay: 10,
    securityReportsEnabled: true,
    guidedWorkflowTestingEnabled: true,
    maxSystemTestPages: 10,
    maxWorkflowSteps: 12,
  },
  builder: {
    securityScansPerDay: 100,
    systemTestsPerDay: 50,
    securityReportsEnabled: true,
    guidedWorkflowTestingEnabled: true,
    maxSystemTestPages: 10,
    maxWorkflowSteps: 12,
  },
  pro: {
    securityScansPerDay: 100,
    systemTestsPerDay: 50,
    securityReportsEnabled: true,
    guidedWorkflowTestingEnabled: true,
    maxSystemTestPages: 10,
    maxWorkflowSteps: 12,
  },
  admin: {
    securityScansPerDay: 10_000,
    systemTestsPerDay: 10_000,
    securityReportsEnabled: true,
    guidedWorkflowTestingEnabled: true,
    maxSystemTestPages: 10,
    maxWorkflowSteps: 12,
  },
}

export function getAiScanAllowanceLabel(plan: UserPlan): string {
  const limit = AI_SCAN_LIMITS[plan]
  return `${limit.count} AI reviews / ${limit.windowLabel}`
}

export function getSystemTestAllowanceLabel(plan: UserPlan): string {
  const limit = SYSTEM_TEST_PRODUCT_LIMITS[plan]
  return `${limit.count} system test${limit.count === 1 ? '' : 's'} / ${limit.windowLabel}`
}

export function getPlanEntitlements(plan: EntitlementPlan): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan]
}
