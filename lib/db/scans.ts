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

/** Report generation is intentionally independent from the scan lifecycle. */
export type ReportStatus = 'not_generated' | 'generating' | 'generated' | 'failed'

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
  // Security Officer Report fields (nullable — populated after scan completes)
  executive_summary?: string | null
  security_verdict?: string | null
  production_readiness?: string | null
  top_risks?: unknown[] | null
  positive_findings?: string[] | null
  remediation_plan?: unknown[] | null
  business_impact?: string | null
  technical_summary?: string | null
  estimated_fix_effort?: string | null
  report_generated_at?: string | null
  report_status?: ReportStatus | null
  report_error?: string | null
  analysis_warnings?: string[] | null
  // Strict audit fields (nullable — populated after Phase 8G audit)
  audit_checklist?: unknown[] | null
  security_posture?: string | null
  quick_wins?: string[] | null
  what_is_done_right?: string[] | null
  priority_plan?: string[] | null
  audit_prompt_version?: string | null
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

/** Server-only admin lookup. Callers must verify admin authorization first. */
export async function getScanByIdForAdmin(scanId: string): Promise<ScanRecord | null> {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('scans')
    .select('*')
    .eq('id', scanId)
    .maybeSingle()

  if (error) {
    console.error('[getScanByIdForAdmin] DB error:', error.message)
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
  const isSuccessfulTerminalStatus = toStatus === 'complete' || toStatus === 'completed'

  // A successful terminal transition is authoritative. This prevents stale
  // watchdog/API errors from surviving after the orchestrator finishes.
  const completionFields = isSuccessfulTerminalStatus
    ? {
        completed_at: extra?.completed_at ?? new Date().toISOString(),
        error_message: null,
        error_stage: null,
      }
    : {}

  const { error } = await admin
    .from('scans')
    .update({ status: toStatus, ...extra, ...completionFields })
    .eq('id', scanId)

  if (error) {
    console.error('[updateScanStatus] DB error:', error.message)
    return { ok: false, error: error.message }
  }

  console.info('[scan status transition]', { scanId, toStatus })

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

// ─── Save security report ────────────────────────────────────────────────────

/**
 * Persist the generated security officer report fields onto a scan row.
 * Called after scan_results are saved and summary is updated.
 * Never called before scan is marked complete.
 */
export async function updateScanReport(
  scanId: string,
  report: {
    executive_summary: string
    security_verdict: string
    production_readiness: string
    top_risks: unknown[]
    positive_findings: string[]
    remediation_plan: unknown[]
    business_impact: string
    technical_summary: string
    estimated_fix_effort: string
  }
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()

  const { error } = await admin
    .from('scans')
    .update({
      executive_summary:    report.executive_summary,
      security_verdict:     report.security_verdict,
      production_readiness: report.production_readiness,
      top_risks:            report.top_risks,
      positive_findings:    report.positive_findings,
      remediation_plan:     report.remediation_plan,
      business_impact:      report.business_impact,
      technical_summary:    report.technical_summary,
      estimated_fix_effort: report.estimated_fix_effort,
      report_generated_at:  new Date().toISOString(),
      report_status:        'generated',
      report_error:         null,
    })
    .eq('id', scanId)

  if (error) {
    console.error('[updateScanReport] DB error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/**
 * Reset generated report fields after a fresh scan and persist non-sensitive
 * analysis limitations. Findings and scan lifecycle data remain untouched.
 */
export async function resetScanReport(
  scanId: string,
  analysisWarnings: string[] = []
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()
  const { error } = await admin
    .from('scans')
    .update({
      executive_summary: null,
      security_verdict: null,
      production_readiness: null,
      top_risks: null,
      positive_findings: null,
      remediation_plan: null,
      business_impact: null,
      technical_summary: null,
      estimated_fix_effort: null,
      report_generated_at: null,
      report_status: 'not_generated',
      report_error: null,
      analysis_warnings: analysisWarnings,
    })
    .eq('id', scanId)

  if (error) {
    console.error('[resetScanReport] DB error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

/** Update report-only progress without changing the completed scan lifecycle. */
export async function updateScanReportStatus(
  scanId: string,
  status: ReportStatus,
  reportError: string | null = null
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()
  const { error } = await admin
    .from('scans')
    .update({ report_status: status, report_error: reportError?.slice(0, 500) ?? null })
    .eq('id', scanId)

  if (error) {
    console.error('[updateScanReportStatus] DB error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

// ─── Save audit checklist data ───────────────────────────────────────────────

/**
 * Persist the strict audit checklist and report fields onto a scan row.
 * Called after the security report is generated.
 * Never fails the scan — caller wraps in try/catch.
 */
export async function updateScanAuditData(
  scanId: string,
  data: {
    audit_checklist: unknown[]
    security_posture: string
    quick_wins: string[]
    what_is_done_right: string[]
    priority_plan: string[]
    audit_prompt_version: string
  }
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()

  const { error } = await admin
    .from('scans')
    .update({
      audit_checklist:      data.audit_checklist,
      security_posture:     data.security_posture,
      quick_wins:           data.quick_wins,
      what_is_done_right:   data.what_is_done_right,
      priority_plan:        data.priority_plan,
      audit_prompt_version: data.audit_prompt_version,
    })
    .eq('id', scanId)

  if (error) {
    console.error('[updateScanAuditData] DB error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}
