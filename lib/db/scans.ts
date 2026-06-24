/**
 * lib/db/scans.ts
 *
 * Server-side ONLY. Database helpers for the scans table.
 * All writes use the service role client to bypass RLS.
 * user_id is ALWAYS derived from the authenticated session — never from client input.
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Valid scan statuses.
 * 'complete' is the canonical terminal success state.
 * 'completed' is kept for backward compatibility.
 */
export type ScanStatus =
  | 'pending'
  | 'fetching'
  | 'scanning'
  | 'complete'
  | 'completed'
  | 'failed'

/**
 * Valid status transitions — enforced before any DB write.
 */
const VALID_TRANSITIONS: Record<ScanStatus, ScanStatus[]> = {
  pending:   ['fetching'],
  fetching:  ['scanning', 'failed'],
  scanning:  ['complete', 'completed', 'failed', 'pending'], // pending allows reset
  complete:  [],
  completed: [],
  failed:    ['fetching', 'pending'], // fetching = retry, pending = manual reset
}

export interface CreateScanInput {
  userId: string
  repoFullName: string
  repoName: string
  repoUrl: string
  defaultBranch: string
}

export interface ScanRecord {
  id: string
  user_id: string
  repo_full_name: string
  repo_name: string
  repo_url: string
  default_branch: string
  status: ScanStatus
  error_message: string | null
  started_at: string
  completed_at: string | null
  security_score: number | null
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  total_findings: number
  created_at: string
  error_stage?: string | null
  scan_engine?: string | null
}

// ─── Admin client (service role — bypasses RLS) ─────────────────────────────

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Create scan ─────────────────────────────────────────────────────────────

export async function createScanForRepo(
  input: CreateScanInput
): Promise<{ ok: true; scanId: string } | { ok: false; error: string }> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scans')
    .insert({
      user_id: input.userId,
      repo_full_name: input.repoFullName,
      repo_name: input.repoName,
      repo_url: input.repoUrl,
      default_branch: input.defaultBranch,
      status: 'pending',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('[createScanForRepo] DB insert error:', error.message)
    return { ok: false, error: 'Failed to create scan record.' }
  }

  return { ok: true, scanId: data.id }
}

// ─── Get scan by ID (with ownership check) ──────────────────────────────────

export async function getScanById(
  scanId: string,
  userId: string
): Promise<ScanRecord | null> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[getScanById] DB error:', error.message)
    return null
  }

  return data as ScanRecord | null
}

// ─── Update scan status ─────────────────────────────────────────────────────

export async function updateScanStatus(
  scanId: string,
  toStatus: ScanStatus,
  extra?: {
    error_message?: string | null
    completed_at?: string | null
    security_score?: number | null
    critical_count?: number
    high_count?: number
    medium_count?: number
    low_count?: number
    total_findings?: number
    error_stage?: string | null
    scan_engine?: string | null
  }
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()

  const { error } = await admin
    .from('scans')
    .update({ status: toStatus, ...extra })
    .eq('id', scanId)

  if (error) {
    console.error('[updateScanStatus] DB error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

// ─── Fail a scan with a safe error message ──────────────────────────────────

/**
 * Mark a scan as failed and store a safe user-facing error message.
 * Never accepts raw stack traces or tokens.
 */
export async function failScan(
  scanId: string,
  safeMessage: string,
  errorStage?: string
): Promise<void> {
  await updateScanStatus(scanId, 'failed', {
    error_message: safeMessage.slice(0, 500), // hard cap
    error_stage: errorStage ?? null
  })
}

// ─── Reset a scan to pending ─────────────────────────────────────────────────

/**
 * Reset a scan's status from 'scanning' or 'failed' → 'pending'.
 * Used to allow a fresh file-fetch attempt.
 * Validates the transition before writing.
 */
export async function resetScanToPending(
  scanId: string,
  currentStatus: ScanStatus
): Promise<{ ok: boolean; error?: string }> {
  const allowed = VALID_TRANSITIONS[currentStatus] ?? []
  if (!allowed.includes('pending')) {
    return {
      ok: false,
      error: `Cannot reset scan from status '${currentStatus}'.`,
    }
  }

  return updateScanStatus(scanId, 'pending', { error_message: null, error_stage: null })
}

// ─── Transition guard (exported for route use) ──────────────────────────────

/**
 * Returns true if transitioning from → to is valid.
 */
export function isValidTransition(from: ScanStatus, to: ScanStatus): boolean {
  return (VALID_TRANSITIONS[from] ?? []).includes(to)
}

// ─── Scan readiness check ────────────────────────────────────────────────────

/**
 * Returns true only if:
 *   - scan.status === 'scanning'
 *   - scan_files count > 0
 *
 * Does NOT run AI. Used as a pre-flight check before Phase 2C.
 */
export async function isScanReadyForAI(
  scanId: string,
  userId: string
): Promise<boolean> {
  const scan = await getScanById(scanId, userId)

  if (!scan || !(scan.status === 'scanning' || scan.status === 'failed')) {
    return false
  }

  const admin = getAdminClient()
  const { count, error } = await admin
    .from('scan_files')
    .select('*', { count: 'exact', head: true })
    .eq('scan_id', scanId)

  if (error || count === null || count === 0) {
    return false
  }

  return true
}

// ─── Get recent scans ──────────────────────────────────────────────────────────

/**
 * Get recent scans for a user.
 */
export async function getRecentScansForUser(
  userId: string,
  limit: number = 5
): Promise<ScanRecord[]> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getRecentScansForUser] DB error:', error.message)
    return []
  }

  return (data ?? []) as ScanRecord[]
}

/**
 * Get all completed scans for a user.
 */
export async function getCompletedScansForUser(
  userId: string,
  limit: number = 20
): Promise<ScanRecord[]> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scans')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['complete', 'completed'])
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getCompletedScansForUser] DB error:', error.message)
    return []
  }

  return (data ?? []) as ScanRecord[]
}
