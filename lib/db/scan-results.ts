/**
 * lib/db/scan-results.ts
 *
 * Server-side ONLY. Database helpers for the scan_results table.
 * All writes use the service role client to bypass RLS.
 *
 * SECURITY: Free users NEVER receive premium fields (description, why_it_matters,
 * vulnerable_code, fix_code, fix_prompt). These are stripped server-side before
 * the data is serialized and passed to any client component.
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { ScanFinding } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

/** Full finding record — only used for paid users server-side. */
export interface ScanResultRecord {
  id: string
  scan_id: string
  user_id: string
  check_name: string
  severity: string
  category: string
  file_path: string
  line_number: number | null
  cwe_id: string | null
  description: string
  recommendation: string
  evidence_snippet: string | null
  confidence: 'high' | 'medium' | 'low' | null
  fix_prompt: string | null
  fix_prompt_generated_at: string | null
  fix_prompt_model: string | null
  status: 'open' | 'resolved' | 'ignored'
  created_at: string
}

/**
 * Gated finding record for free users.
 * Premium fields are ABSENT — they are never fetched or passed to client.
 */
export interface FreeScanResultRecord {
  id: string
  scan_id: string
  check_name: string
  severity: string
  category: string
  file_path: string
  line_number: number | null
  cwe_id: string | null
  status: 'open' | 'resolved' | 'ignored'
  created_at: string
}

/** Union type safe for passing to client components */
export type GatedScanResultRecord = ScanResultRecord | FreeScanResultRecord

/** Type guard: check if a result record has premium fields */
export function isPaidResult(r: GatedScanResultRecord): r is ScanResultRecord {
  return 'description' in r
}

// ─── Admin client ────────────────────────────────────────────────────────────

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Delete existing results ──────────────────────────────────────────────────

/**
 * Delete all scan_results for a given scan.
 * Used to ensure idempotent scan execution.
 */
export async function deleteScanResultsForScan(
  scanId: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()

  const { error } = await admin
    .from('scan_results')
    .delete()
    .eq('scan_id', scanId)

  if (error) {
    console.error('[deleteScanResultsForScan] DB error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

// ─── Create results ───────────────────────────────────────────────────────────

/**
 * Insert validated findings into the scan_results table.
 * Uses batch insert.
 * userId is required to ensure RLS policies can enforce ownership.
 */
export async function createScanResults(
  scanId: string,
  userId: string,
  findings: ScanFinding[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (findings.length === 0) {
    return { ok: true, count: 0 }
  }

  const admin = getAdminClient()

  const rows = findings.map((f) => ({
    scan_id: scanId,
    user_id: userId,
    check_name: f.check_name,
    severity: f.severity,
    category: f.category,
    file_path: f.file_path,
    line_number: f.line_number ?? null,
    cwe_id: f.cwe_id ?? null,
    description: f.description,
    why_it_matters: f.recommendation, // map recommendation to why_it_matters
    vulnerable_code: f.evidence_snippet ?? null, // map evidence_snippet to vulnerable_code
    fix_code: f.confidence ?? null, // map confidence to fix_code (reusing column)
    fix_prompt: f.fix_prompt ?? null,
    fix_prompt_generated_at: f.fix_prompt_generated_at ?? null,
    fix_prompt_model: f.fix_prompt_model ?? null,
    status: 'open',
  }))

  const { error } = await admin
    .from('scan_results')
    .insert(rows)

  if (error) {
    console.error('[createScanResults] DB insert error:', error.message)
    return { ok: false, error: 'Failed to store scan findings.' }
  }

  return { ok: true, count: findings.length }
}

// ─── Get results (paid — full data) ──────────────────────────────────────────

/**
 * Get all findings for a specific scan — FULL data for paid users.
 * Returns empty array if none found or on error.
 * Only call this after verifying the user has a paid plan.
 */
export async function getScanResultsForScan(
  scanId: string
): Promise<ScanResultRecord[]> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scan_results')
    .select('*')
    .eq('scan_id', scanId)
    .order('severity', { ascending: true })

  if (error) {
    console.error('[getScanResultsForScan] DB error:', error.message)
    return []
  }

  // map db columns to new record types
  return data.map((row) => ({
    ...row,
    recommendation: row.why_it_matters,
    evidence_snippet: row.vulnerable_code,
    confidence: row.fix_code as 'high' | 'medium' | 'low' | null,
  })) as ScanResultRecord[]
}

/**
 * Get a specific finding by ID — FULL data for paid users.
 * Ensures the user owns the record.
 * Only call this after verifying the user has a paid plan.
 */
export async function getScanResultById(
  resultId: string,
  userId: string
): Promise<ScanResultRecord | null> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scan_results')
    .select('*')
    .eq('id', resultId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[getScanResultById] DB error:', error.message)
    return null
  }

  return {
    ...data,
    recommendation: data.why_it_matters,
    evidence_snippet: data.vulnerable_code,
    confidence: data.fix_code as 'high' | 'medium' | 'low' | null,
  } as ScanResultRecord | null
}

// ─── Get results (free — gated data) ─────────────────────────────────────────

/** Free-tier column selection — excludes all premium fields at the DB query level */
const FREE_COLUMNS = [
  'id',
  'scan_id',
  'check_name',
  'severity',
  'category',
  'file_path',
  'line_number',
  'cwe_id',
  'status',
  'created_at',
].join(', ')

/**
 * Get all findings for a specific scan — GATED data for free users.
 * Premium fields (description, why_it_matters, vulnerable_code, fix_code,
 * fix_prompt) are NEVER selected from the database — they do not exist
 * anywhere in the response, not even in intermediate server memory.
 */
export async function getScanResultsForScanFree(
  scanId: string
): Promise<FreeScanResultRecord[]> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scan_results')
    .select(FREE_COLUMNS)
    .eq('scan_id', scanId)
    .order('severity', { ascending: true })

  if (error) {
    console.error('[getScanResultsForScanFree] DB error:', error.message)
    return []
  }

  return ((data ?? []) as unknown) as FreeScanResultRecord[]
}

/**
 * Get a specific finding by ID — GATED data for free users.
 * Premium fields are NEVER selected from the database.
 * Ensures the user owns the record.
 */
export async function getScanResultByIdFree(
  resultId: string,
  userId: string
): Promise<FreeScanResultRecord | null> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scan_results')
    .select(FREE_COLUMNS)
    .eq('id', resultId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.error('[getScanResultByIdFree] DB error:', error.message)
    return null
  }

  return (data as unknown) as FreeScanResultRecord | null
}

