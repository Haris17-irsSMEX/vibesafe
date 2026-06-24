/**
 * lib/db/admin-stats.ts
 *
 * SERVER-SIDE ONLY. Admin dashboard data queries.
 * Uses service role client to bypass RLS.
 * Only callable from admin-protected server routes/pages.
 *
 * SECURITY: Never call these functions without first verifying admin access.
 */

import 'server-only'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// ─── Admin Supabase client ────────────────────────────────────────────────────

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminOverviewStats {
  totalUsers: number
  totalScans: number
  totalFindings: number
  paidUsers: number
  failedScans: number
}

export interface AdminUserRow {
  id: string
  email: string | null
  plan: string
  created_at: string
  plan_updated_at: string | null
  scan_count: number
}

export interface AdminScanRow {
  id: string
  repo_full_name: string
  user_email: string | null
  status: string
  security_score: number | null
  created_at: string
  completed_at: string | null
  total_findings: number
}

export interface AdminFindingRow {
  id: string
  scan_id: string
  severity: string
  check_name: string
  file_path: string
  created_at: string
}

// ─── Overview stats ───────────────────────────────────────────────────────────

export async function getAdminOverviewStats(): Promise<AdminOverviewStats> {
  const admin = getAdminClient()

  const [usersRes, scansRes, findingsRes, paidRes, failedRes] =
    await Promise.allSettled([
      admin.from('users').select('*', { count: 'exact', head: true }),
      admin.from('scans').select('*', { count: 'exact', head: true }),
      admin.from('scan_results').select('*', { count: 'exact', head: true }),
      admin
        .from('users')
        .select('*', { count: 'exact', head: true })
        .neq('plan', 'free'),
      admin
        .from('scans')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed'),
    ])

  return {
    totalUsers:
      usersRes.status === 'fulfilled' ? (usersRes.value.count ?? 0) : 0,
    totalScans:
      scansRes.status === 'fulfilled' ? (scansRes.value.count ?? 0) : 0,
    totalFindings:
      findingsRes.status === 'fulfilled' ? (findingsRes.value.count ?? 0) : 0,
    paidUsers:
      paidRes.status === 'fulfilled' ? (paidRes.value.count ?? 0) : 0,
    failedScans:
      failedRes.status === 'fulfilled' ? (failedRes.value.count ?? 0) : 0,
  }
}

// ─── Recent users ─────────────────────────────────────────────────────────────

export async function getAdminRecentUsers(
  limit = 20
): Promise<AdminUserRow[]> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('users')
    .select('id, email, plan, created_at, plan_updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getAdminRecentUsers] DB error:', error.message)
    return []
  }

  // Fetch scan counts in a separate query (no join support needed)
  const rows: AdminUserRow[] = []
  for (const u of data ?? []) {
    const { count } = await admin
      .from('scans')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', u.id)

    rows.push({
      id: u.id,
      email: u.email,
      plan: u.plan,
      created_at: u.created_at,
      plan_updated_at: u.plan_updated_at,
      scan_count: count ?? 0,
    })
  }

  return rows
}

// ─── Recent scans ─────────────────────────────────────────────────────────────

export async function getAdminRecentScans(
  limit = 20
): Promise<AdminScanRow[]> {
  const admin = getAdminClient()

  // Fetch scans
  const { data: scans, error } = await admin
    .from('scans')
    .select(
      'id, repo_full_name, user_id, status, security_score, created_at, completed_at, total_findings'
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getAdminRecentScans] DB error:', error.message)
    return []
  }

  if (!scans?.length) return []

  // Fetch user emails for those user IDs
  const userIds = Array.from(new Set(scans.map((s) => s.user_id)))
  const { data: users } = await admin
    .from('users')
    .select('id, email')
    .in('id', userIds)

  const emailMap: Record<string, string | null> = {}
  for (const u of users ?? []) {
    emailMap[u.id] = u.email
  }

  return scans.map((s) => ({
    id: s.id,
    repo_full_name: s.repo_full_name,
    user_email: emailMap[s.user_id] ?? null,
    status: s.status,
    security_score: s.security_score,
    created_at: s.created_at,
    completed_at: s.completed_at,
    total_findings: s.total_findings ?? 0,
  }))
}

// ─── Recent findings ──────────────────────────────────────────────────────────

export async function getAdminRecentFindings(
  limit = 20
): Promise<AdminFindingRow[]> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scan_results')
    .select('id, scan_id, severity, check_name, file_path, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getAdminRecentFindings] DB error:', error.message)
    return []
  }

  return (data ?? []) as AdminFindingRow[]
}

// ─── Update user plan (admin override) ───────────────────────────────────────

export type AdminAllowedPlan = 'free' | 'starter' | 'builder' | 'pro'

const ALLOWED_PLANS: AdminAllowedPlan[] = ['free', 'starter', 'builder', 'pro']

export function isAllowedPlan(plan: string): plan is AdminAllowedPlan {
  return ALLOWED_PLANS.includes(plan as AdminAllowedPlan)
}

/**
 * Update a user's plan — ADMIN ONLY.
 * Never call this without verifying admin access first.
 */
export async function adminUpdateUserPlan(
  userId: string,
  plan: AdminAllowedPlan
): Promise<{ ok: boolean; error?: string }> {
  if (!isAllowedPlan(plan)) {
    return { ok: false, error: 'Invalid plan value.' }
  }

  const admin = getAdminClient()

  const { error } = await admin
    .from('users')
    .update({
      plan,
      plan_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('[adminUpdateUserPlan] DB error:', error.message)
    return { ok: false, error: 'Failed to update user plan.' }
  }

  return { ok: true }
}

// ─── Backfill stats ──────────────────────────────────────────────────────────

export async function getFindingsMissingFixPromptCount(): Promise<number> {
  const admin = getAdminClient()
  const { count, error } = await admin
    .from('scan_results')
    .select('*', { count: 'exact', head: true })
    .is('fix_prompt', null)

  if (error) {
    console.error('[getFindingsMissingFixPromptCount] DB error:', error.message)
    return 0
  }

  return count ?? 0
}
