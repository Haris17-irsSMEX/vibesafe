/**
 * POST /api/scans/fetch-files
 *
 * Fetches security-relevant files from GitHub for a scan.
 *
 * Flow:
 *   1. Verify Supabase session
 *   2. Validate scanId (UUID)
 *   3. Load scan + verify ownership (user_id from session only)
 *   4. Enforce valid transition: pending|failed → fetching
 *   5. Verify GitHub connection
 *   6. Decrypt token server-side only (never returned or logged)
 *   7. Update status → 'fetching'
 *   8. Fetch relevant files from GitHub API
 *   9. Route files to security sections
 *  10. Delete old scan_files (idempotent)
 *  11. Insert new scan_files
 *  12. Update status → 'scanning'
 *
 * On any failure: failScan() updates status='failed' + stores safe error_message.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { decryptToken } from '@/lib/security/encryption'
import {
  getScanById,
  updateScanStatus,
  failScan,
  isValidTransition,
} from '@/lib/db/scans'
import { deleteScanFilesForScan, createScanFiles } from '@/lib/db/scan-files'
import { fetchRelevantRepositoryFiles } from '@/services/github/RepoFetcher'
import { routeFiles } from '@/services/scanner/FileRouter'
import { rateLimitFileFetch } from '@/lib/rate-limit'

// UUID validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Map GitHub fetch error reasons to safe user messages
const FETCH_ERROR_MESSAGES: Record<string, string> = {
  invalid_token: 'GitHub token expired or revoked. Please reconnect GitHub.',
  rate_limited: 'GitHub API rate limit reached. Please wait a few minutes and retry.',
  not_found: 'Repository not found or access was denied.',
  network_error: 'Unable to reach GitHub. Please check your connection and retry.',
  unknown: 'Failed to fetch repository files.',
}

export async function POST(request: NextRequest) {
  // ── 1. Verify Supabase session ─────────────────────────────────────────────
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'You must be signed in.' },
      { status: 401 }
    )
  }

  // ── 1.5. Rate Limit ────────────────────────────────────────────────────────
  const rateLimitResult = await rateLimitFileFetch(user.id)
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { success: false, error: 'Too many file fetch attempts. Try again later.' },
      { status: 429 }
    )
  }

  // ── 2. Parse + validate body ───────────────────────────────────────────────
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  const rawScanId = (body as Record<string, unknown>)?.scanId
  if (typeof rawScanId !== 'string' || !UUID_REGEX.test(rawScanId)) {
    return NextResponse.json(
      { success: false, error: 'Invalid scan ID.' },
      { status: 400 }
    )
  }

  const scanId = rawScanId

  // ── 3. Load scan + verify ownership ───────────────────────────────────────
  //   user_id is from session — never from client body
  const scan = await getScanById(scanId, user.id)

  if (!scan) {
    return NextResponse.json(
      { success: false, error: 'Scan not found.' },
      { status: 404 }
    )
  }

  // ── 4. Enforce valid transition (pending|failed → fetching) ───────────────
  if (!isValidTransition(scan.status, 'fetching')) {
    const message =
      scan.status === 'fetching'
        ? 'File fetch is already in progress.'
        : scan.status === 'scanning' || scan.status === 'complete' || scan.status === 'completed'
        ? 'Files have already been collected for this scan.'
        : `Cannot fetch files for a scan in status '${scan.status}'.`

    return NextResponse.json(
      { success: false, error: message },
      { status: 409 }
    )
  }

  // ── 5. Verify GitHub connection + get encrypted token ─────────────────────
  const adminClient = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: connection, error: connError } = await adminClient
    .from('connected_repos')
    .select('github_token')
    .eq('user_id', user.id)
    .maybeSingle()

  if (connError || !connection) {
    return NextResponse.json(
      { success: false, error: 'GitHub connection missing. Please reconnect GitHub.' },
      { status: 403 }
    )
  }

  // ── 6. Decrypt token server-side only ─────────────────────────────────────
  let plainToken: string
  try {
    plainToken = await decryptToken(connection.github_token)
  } catch {
    // Decryption failure = token corrupted or key rotated
    await failScan(scanId, 'GitHub token could not be decrypted. Please reconnect GitHub.')
    return NextResponse.json(
      { success: false, error: 'GitHub token expired. Please reconnect GitHub.' },
      { status: 403 }
    )
  }

  // ── 7. Update status → 'fetching' ─────────────────────────────────────────
  await updateScanStatus(scanId, 'fetching', { error_message: null })

  // ── 8–12. Fetch, route, store, update ─────────────────────────────────────
  try {
    const fetchResult = await fetchRelevantRepositoryFiles(
      plainToken,
      scan.repo_full_name,
      scan.default_branch
    )
    // plainToken goes out of scope here — never returned or logged

    if (!fetchResult.ok) {
      const safeMsg = FETCH_ERROR_MESSAGES[fetchResult.reason] ?? 'Failed to fetch repository files.'
      await failScan(scanId, safeMsg)
      return NextResponse.json(
        { success: false, error: safeMsg },
        { status: 502 }
      )
    }

    if (fetchResult.files.length === 0) {
      const safeMsg = 'No security-relevant files found in this repository.'
      await failScan(scanId, safeMsg)
      return NextResponse.json(
        { success: false, error: safeMsg },
        { status: 422 }
      )
    }

    // Route files to security sections
    const routedFiles = routeFiles(fetchResult.files)

    // Delete old scan_files before inserting (idempotent re-run)
    const deleteResult = await deleteScanFilesForScan(scanId)
    if (!deleteResult.ok) {
      await failScan(scanId, 'Failed to clear previous scan data.')
      return NextResponse.json(
        { success: false, error: 'Failed to prepare scan. Please retry.' },
        { status: 500 }
      )
    }

    // Store routed files
    const storeResult = await createScanFiles(scanId, routedFiles)
    if (!storeResult.ok) {
      await failScan(scanId, 'Failed to store scan files in database.')
      return NextResponse.json(
        { success: false, error: 'Failed to store scan files.' },
        { status: 500 }
      )
    }

    // Update status → 'scanning' (files collected, ready for AI)
    await updateScanStatus(scanId, 'scanning', { error_message: null })

    return NextResponse.json({
      success: true,
      filesStored: storeResult.count,
    })
  } catch (err) {
    // Catch-all — never expose raw error to client
    const safeMsg = 'An unexpected error occurred during file fetching.'
    console.error('[fetch-files] Unexpected error:', err instanceof Error ? err.message : 'Unknown')
    await failScan(scanId, safeMsg)
    return NextResponse.json(
      { success: false, error: safeMsg },
      { status: 500 }
    )
  }
}
