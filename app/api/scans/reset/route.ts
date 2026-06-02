/**
 * POST /api/scans/reset
 *
 * Resets a scan from 'scanning' or 'failed' back to 'pending'.
 * This allows the user to re-trigger file fetching on a scan that
 * has already reached 'scanning' (e.g. to refresh with latest files).
 *
 * - Verifies authenticated user
 * - Verifies scan ownership (user_id from session only)
 * - Enforces valid transition before writing
 * - Clears scan_files for the scan
 * - Clears error_message
 * - Does NOT touch completed/complete scans
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getScanById, resetScanToPending } from '@/lib/db/scans'
import { deleteScanFilesForScan } from '@/lib/db/scan-files'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  // 1. Verify Supabase session
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

  // 2. Parse + validate body
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

  // 3. Load scan + verify ownership (user_id from session only)
  const scan = await getScanById(scanId, user.id)

  if (!scan) {
    return NextResponse.json(
      { success: false, error: 'Scan not found.' },
      { status: 404 }
    )
  }

  // 4. Enforce valid transition (scanning|failed → pending)
  const resetResult = await resetScanToPending(scanId, scan.status)

  if (!resetResult.ok) {
    return NextResponse.json(
      {
        success: false,
        error: resetResult.error ?? `Cannot reset a scan with status '${scan.status}'.`,
      },
      { status: 409 }
    )
  }

  // 5. Clear existing scan_files so re-fetch starts clean
  await deleteScanFilesForScan(scanId)

  return NextResponse.json({ success: true })
}
