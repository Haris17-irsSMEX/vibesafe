/**
 * lib/db/scan-results.ts
 *
 * Server-side ONLY. Database helpers for the scan_results table.
 * All writes use the service role client to bypass RLS.
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { ScanFinding } from '@/lib/types'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  why_it_matters: string
  vulnerable_code: string | null
  fix_code: string | null
  fix_prompt: string | null
  effort_minutes: number | null
  status: 'open' | 'resolved' | 'ignored'
  created_at: string
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
    why_it_matters: f.why_it_matters,
    vulnerable_code: f.vulnerable_code ?? null,
    fix_code: f.fix_code ?? null,
    fix_prompt: null, // Left null for now, can be populated in future phases
    effort_minutes: f.effort_minutes ?? null,
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

// ─── Get results ──────────────────────────────────────────────────────────────

/**
 * Get all findings for a specific scan.
 * Returns empty array if none found or on error.
 */
export async function getScanResultsForScan(
  scanId: string
): Promise<ScanResultRecord[]> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scan_results')
    .select('*')
    .eq('scan_id', scanId)
    .order('severity', { ascending: true }) // Not perfect sorting for text severity, but a default
    // We'll likely sort this in the UI based on severity weight

  if (error) {
    console.error('[getScanResultsForScan] DB error:', error.message)
    return []
  }

  return (data ?? []) as ScanResultRecord[]
}
