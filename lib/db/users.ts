/**
 * lib/db/users.ts
 *
 * Server-side ONLY. Database helpers for the users table.
 * Handles plan detection for result gating.
 * Uses service role client to bypass RLS for internal reads.
 * Never exposes raw DB errors to clients.
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserPlan = 'free' | 'starter' | 'builder' | 'pro'

export interface UserProfile {
  id: string
  email: string | null
  plan: UserPlan
  paddle_customer_id: string | null
  plan_updated_at: string | null
  created_at: string
}

// ─── Admin client ─────────────────────────────────────────────────────────────

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Get user profile ────────────────────────────────────────────────────────

/**
 * Load the user profile for the given auth user ID.
 * Returns null if the profile row does not exist yet (pre-trigger edge case).
 * On error returns null — never throws.
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('users')
    .select('id, email, plan, paddle_customer_id, plan_updated_at, created_at')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('[getUserProfile] DB error:', error.message)
    return null
  }

  return data as UserProfile | null
}

// ─── Upsert user profile ─────────────────────────────────────────────────────

/**
 * Create or update a user profile row.
 * Safe to call on first login — auto-provisions with free plan.
 */
export async function upsertUserProfile(
  userId: string,
  email: string | null
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()

  const { error } = await admin
    .from('users')
    .upsert(
      { id: userId, email, plan: 'free' },
      { onConflict: 'id', ignoreDuplicates: true }
    )

  if (error) {
    console.error('[upsertUserProfile] DB error:', error.message)
    return { ok: false, error: 'Failed to provision user profile.' }
  }

  return { ok: true }
}

// ─── Update plan ─────────────────────────────────────────────────────────────

/**
 * Update a user's plan after a successful Paddle webhook event.
 * Called ONLY from server-side webhook handlers — never from client.
 */
export async function updateUserPlan(
  userId: string,
  plan: UserPlan,
  paddleCustomerId?: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()

  const { error } = await admin
    .from('users')
    .update({
      plan,
      paddle_customer_id: paddleCustomerId ?? null,
      plan_updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    console.error('[updateUserPlan] DB error:', error.message)
    return { ok: false, error: 'Failed to update user plan.' }
  }

  return { ok: true }
}

// ─── Plan helpers ─────────────────────────────────────────────────────────────

/** Returns true if the given plan has paid access to premium findings */
export function isPaidPlan(plan: UserPlan): boolean {
  return plan === 'starter' || plan === 'builder' || plan === 'pro'
}

// ─── Usage helpers ────────────────────────────────────────────────────────────

/**
 * Count total scans for a user across all statuses.
 * Used on the settings page for usage display.
 * Returns 0 on error — never throws.
 */
export async function getUserScanCount(userId: string): Promise<number> {
  const admin = getAdminClient()

  const { count, error } = await admin
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)

  if (error) {
    console.error('[getUserScanCount] DB error:', error.message)
    return 0
  }

  return count ?? 0
}

/**
 * Count completed scans for a user.
 * Returns 0 on error — never throws.
 */
export async function getUserCompletedScanCount(userId: string): Promise<number> {
  const admin = getAdminClient()

  const { count, error } = await admin
    .from('scans')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ['complete', 'completed'])

  if (error) {
    console.error('[getUserCompletedScanCount] DB error:', error.message)
    return 0
  }

  return count ?? 0
}

// ─── GitHub connection status ─────────────────────────────────────────────────

/**
 * Check if the user has a connected GitHub account.
 * Returns login name if connected, null otherwise.
 * Never returns the token.
 */
export async function getGitHubLoginForUser(
  userId: string
): Promise<{ login: string; connectedAt: string } | null> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('connected_repos')
    .select('github_login, connected_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[getGitHubLoginForUser] DB error:', error.message)
    return null
  }

  if (!data) return null

  return {
    login: data.github_login,
    connectedAt: data.connected_at,
  }
}
