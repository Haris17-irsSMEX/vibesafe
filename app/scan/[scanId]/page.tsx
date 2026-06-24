/**
 * /scan/[scanId]
 *
 * Scan progress/status page.
 * Server component: loads real scan by ID, verifies ownership.
 * Passes error_message and file count to client — never passes GitHub token.
 */

import { ServerDashboardLayout } from '@/components/layout/server-dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import { redirect, notFound } from 'next/navigation'
import { getScanById, isScanReadyForAI } from '@/lib/db/scans'
import { countScanFilesForScan } from '@/lib/db/scan-files'
import { ScanStatusClient } from './ScanStatusClient'

export default async function ScanPage({
  params,
}: {
  params: { scanId: string }
}) {
  // Server-side auth guard
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Validate scanId format (UUID)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(params.scanId)) {
    notFound()
  }

  // Load scan — ownership enforced by passing user.id
  const scan = await getScanById(params.scanId, user.id)

  if (!scan) {
    notFound()
  }

  // Load file count and readiness (server-side — no token involved)
  const [fileCount, readyForAI] = await Promise.all([
    countScanFilesForScan(params.scanId),
    isScanReadyForAI(params.scanId, user.id),
  ])

  const isAdmin = isAdminEmail(user.email)

  return (
    <ServerDashboardLayout>
      <ScanStatusClient
        scanId={scan.id}
        repoName={scan.repo_name}
        repoFullName={scan.repo_full_name}
        repoUrl={scan.repo_url}
        defaultBranch={scan.default_branch}
        status={scan.status}
        errorMessage={scan.error_message}
        startedAt={scan.started_at}
        completedAt={scan.completed_at}
        securityScore={scan.security_score}
        criticalCount={scan.critical_count}
        highCount={scan.high_count}
        mediumCount={scan.medium_count}
        lowCount={scan.low_count}
        totalFindings={scan.total_findings}
        fileCount={fileCount}
        readyForAI={readyForAI}
        isAdmin={isAdmin}
      />
    </ServerDashboardLayout>
  )
}
