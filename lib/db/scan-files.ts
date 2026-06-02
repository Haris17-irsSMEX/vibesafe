/**
 * lib/db/scan-files.ts
 *
 * Server-side ONLY. Database helpers for the scan_files table.
 * All writes use the service role client to bypass RLS.
 */

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { RoutedFile } from '@/services/scanner/FileRouter'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScanFileRecord {
  id: string
  scan_id: string
  section: string
  file_path: string
  content: string
  created_at: string
}

// ─── Admin client ────────────────────────────────────────────────────────────

function getAdminClient() {
  return createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Delete existing scan files ──────────────────────────────────────────────

/**
 * Delete all scan_files for a given scan.
 * Called before inserting new files to ensure idempotent re-runs.
 */
export async function deleteScanFilesForScan(
  scanId: string
): Promise<{ ok: boolean; error?: string }> {
  const admin = getAdminClient()

  const { error } = await admin
    .from('scan_files')
    .delete()
    .eq('scan_id', scanId)

  if (error) {
    console.error('[deleteScanFilesForScan] DB error:', error.message)
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

// ─── Create scan files ───────────────────────────────────────────────────────

/**
 * Insert routed files into scan_files table.
 * Uses batch insert for efficiency.
 */
export async function createScanFiles(
  scanId: string,
  files: RoutedFile[]
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (files.length === 0) {
    return { ok: true, count: 0 }
  }

  const admin = getAdminClient()

  const rows = files.map((f) => ({
    scan_id: scanId,
    section: f.section,
    file_path: f.path,
    content: f.content,
  }))

  const { error } = await admin
    .from('scan_files')
    .insert(rows)

  if (error) {
    console.error('[createScanFiles] DB insert error:', error.message)
    return { ok: false, error: 'Failed to store scan files.' }
  }

  return { ok: true, count: files.length }
}

// ─── Get scan files by scan ID ───────────────────────────────────────────────

/**
 * Load all scan_files for a given scan.
 * Returns section, file_path, and content.
 */
export async function getScanFilesByScanId(
  scanId: string
): Promise<ScanFileRecord[]> {
  const admin = getAdminClient()

  const { data, error } = await admin
    .from('scan_files')
    .select('id, scan_id, section, file_path, content, created_at')
    .eq('scan_id', scanId)
    .order('section', { ascending: true })

  if (error) {
    console.error('[getScanFilesByScanId] DB error:', error.message)
    return []
  }

  return (data ?? []) as ScanFileRecord[]
}

// ─── Count scan files ────────────────────────────────────────────────────────

/**
 * Return the count of scan_files for a given scan.
 * Used by isScanReadyForAI to confirm files are present.
 */
export async function countScanFilesForScan(scanId: string): Promise<number> {
  const admin = getAdminClient()

  const { count, error } = await admin
    .from('scan_files')
    .select('*', { count: 'exact', head: true })
    .eq('scan_id', scanId)

  if (error) {
    console.error('[countScanFilesForScan] DB error:', error.message)
    return 0
  }

  return count ?? 0
}
