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

  const safeNumber = (val: unknown) => {
    const num = Number(val)
    return !isNaN(num) && Number.isInteger(num) ? num : null
  }

  const safeString = (val: unknown) => {
    return typeof val === 'string' ? val : String(val || '')
  }

  const validSeverities = ['critical', 'high', 'medium', 'low']
  const mapSeverity = (sev: unknown) => {
    const s = safeString(sev).toLowerCase()
    return validSeverities.includes(s) ? s : 'medium'
  }

  const mapCategory = (cat: unknown) => {
    const c = safeString(cat).toLowerCase()
    return c ? c : 'general'
  }

  const rows = findings.map((f) => {
    const obj = {
      scan_id: scanId,
      user_id: userId,
      check_name: safeString(f.check_name),
      severity: mapSeverity(f.severity),
      category: mapCategory(f.category),
      file_path: safeString(f.file_path),
      line_number: safeNumber(f.line_number),
      cwe_id: f.cwe_id ? safeString(f.cwe_id) : null,
      owasp: f.owasp ? safeString(f.owasp) : null,
      description: safeString(f.description),
      recommendation: safeString(f.recommendation),
      evidence_snippet: f.evidence_snippet ? safeString(f.evidence_snippet).substring(0, 500) : null,
      confidence: f.confidence ? safeString(f.confidence).toLowerCase() : 'medium',
      fix_prompt: f.fix_prompt ? safeString(f.fix_prompt) : null,
      fix_prompt_generated_at: f.fix_prompt ? new Date().toISOString() : null,
      fix_prompt_model: f.fix_prompt ? 'deterministic-template-v1' : null,
      status: 'open',
      created_at: new Date().toISOString(),
    }
    
    // Remove undefined values explicitly
    Object.keys(obj).forEach(key => obj[key as keyof typeof obj] === undefined && delete obj[key as keyof typeof obj])
    return obj
  })

  const { error } = await admin
    .from('scan_results')
    .insert(rows)

  if (error) {
    console.error('[createScanResults] Full insert failed:', {
      scanId,
      findingsCount: findings.length,
      firstFindingKeys: Object.keys(findings[0] || {}),
      mappedRowKeys: Object.keys(rows[0] || {}),
      errorCode: error.code,
      errorMessage: error.message,
      errorDetails: error.details,
      errorHint: error.hint
    })

    // Fallback: retry with minimal columns
    console.warn(`[createScanResults] Retrying with minimal insert strategy...`)
    const minimalRows = rows.map((r) => ({
      scan_id: r.scan_id,
      user_id: r.user_id,
      severity: r.severity,
      check_name: r.check_name,
      category: r.category,
      description: r.description,
      file_path: r.file_path,
      recommendation: r.recommendation,
      status: r.status,
    }))

    const { error: minimalError } = await admin
      .from('scan_results')
      .insert(minimalRows)

    if (minimalError) {
      console.error('[createScanResults] Minimal insert also failed:', {
        errorCode: minimalError.code,
        errorMessage: minimalError.message
      })
      return { ok: false, error: 'AI findings could not be saved. Please retry.' }
    }
    
    console.warn(`[createScanResults] Full scan_results insert failed, minimal insert succeeded.`)
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

  return data as ScanResultRecord[]
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

  return data as ScanResultRecord | null
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

