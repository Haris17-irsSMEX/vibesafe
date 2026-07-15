import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getScanById,
  getScanByIdForAdmin,
  updateScanReport,
  updateScanReportStatus,
} from '@/lib/db/scans'
import { getScanResultsForScan } from '@/lib/db/scan-results'
import { countScanFilesForScan } from '@/lib/db/scan-files'
import { isAdminEmail } from '@/lib/auth/admin'
import { generateSavedFindingsReport } from '@/services/scanner/SavedFindingsReportGenerator'
import { getAccountUsageSummary } from '@/lib/usage-limits'

export const maxDuration = 180

interface RouteContext {
  params: { scanId: string }
}

function isCompleted(status: string): boolean {
  return status === 'complete' || status === 'completed'
}

/**
 * Generates only a report summary from persisted results. It never fetches
 * GitHub files, re-runs security analysis, or writes to scan_results.
 */
export async function POST(_request: Request, { params }: RouteContext) {
  const scanId = params.scanId
  const startedAt = Date.now()
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'You must be signed in.' }, { status: 401 })
  }

  const isAdmin = isAdminEmail(user.email)
  let scan = await getScanById(scanId, user.id)
  if (!scan && isAdmin) scan = await getScanByIdForAdmin(scanId)
  if (!scan) {
    return NextResponse.json({ success: false, error: 'Scan not found.' }, { status: 404 })
  }
  if (!isCompleted(scan.status)) {
    return NextResponse.json({ success: false, error: 'Complete the AI Security Scan before generating a report.' }, { status: 409 })
  }
  const usage = await getAccountUsageSummary(user.id, user.email)
  if (!usage.limits.securityReportsEnabled) {
    return NextResponse.json(
      {
        success: false,
        error: 'Security Officer Report generation is not available on your current plan.',
        reason: 'upgrade_required',
        plan: usage.plan,
        upgradeUrl: '/pricing',
      },
      { status: 403 }
    )
  }

  const effectiveStatus = scan.report_status ?? (scan.executive_summary ? 'generated' : 'not_generated')
  if (effectiveStatus === 'generating') {
    return NextResponse.json({ success: false, error: 'Security Officer Report generation is already in progress.' }, { status: 409 })
  }
  if (effectiveStatus === 'generated' && scan.executive_summary) {
    return NextResponse.json({ success: true, reportStatus: 'generated', alreadyGenerated: true })
  }

  const statusResult = await updateScanReportStatus(scanId, 'generating')
  if (!statusResult.ok) {
    return NextResponse.json({ success: false, error: 'Could not prepare report generation. Please retry.' }, { status: 500 })
  }

  try {
    const [findings, filesScannedCount] = await Promise.all([
      getScanResultsForScan(scanId),
      countScanFilesForScan(scanId),
    ])
    const generated = await generateSavedFindingsReport({ scan, findings, filesScannedCount })
    if (!generated.ok) {
      await updateScanReportStatus(scanId, 'failed', generated.error)
      return NextResponse.json({ success: false, error: generated.error }, { status: 502 })
    }

    const saveResult = await updateScanReport(scanId, generated.report)
    if (!saveResult.ok) {
      await updateScanReportStatus(scanId, 'failed', 'Could not save the Security Officer Report. Please retry.')
      return NextResponse.json({ success: false, error: 'Could not save the Security Officer Report. Please retry.' }, { status: 500 })
    }

    console.info('[POST /api/scans/[scanId]/generate-report] completed', {
      scanId,
      durationMs: Date.now() - startedAt,
      findingsCount: findings.length,
    })
    return NextResponse.json({ success: true, reportStatus: 'generated' })
  } catch (error) {
    console.error('[POST /api/scans/[scanId]/generate-report] failed', {
      scanId,
      safeMessage: error instanceof Error ? error.message.slice(0, 200) : 'Unknown error',
    })
    const safeError = 'Security Officer Report generation failed. Please retry.'
    await updateScanReportStatus(scanId, 'failed', safeError)
    return NextResponse.json({ success: false, error: safeError }, { status: 500 })
  }
}
