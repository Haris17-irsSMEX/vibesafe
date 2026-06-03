/**
 * services/scanner/ScanOrchestrator.ts
 *
 * Server-side ONLY. Orchestrates the DeepSeek security scan execution.
 * Wires together file grouping, prompt building, API execution,
 * finding parsing, scoring, and database persistence.
 */

import { getScanById, updateScanStatus, failScan } from '@/lib/db/scans'
import { getScanFilesByScanId } from '@/lib/db/scan-files'
import { deleteScanResultsForScan, createScanResults } from '@/lib/db/scan-results'
import { PRIMARY_SCAN_SECTIONS, ALL_SECTIONS } from './prompts/sectionPrompts'
import { buildSectionPrompt } from './prompts/buildSectionPrompt'
import { runSectionScan } from './DeepSeekScanner'
import { parseFindings, deduplicateFindings } from './FindingParser'
import { calculateSecurityScore } from '@/services/scoring/SecurityScorer'
import { sendScanCompleteEmail, sendScanFailedEmail } from '@/services/notifications/ResendMailer'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { ScanFinding } from '@/lib/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CONCURRENT_SECTIONS = 1 // Process sequentially to respect rate limits

// ─── Internal Types ──────────────────────────────────────────────────────────

interface OrchestratorResult {
  ok: boolean
  error?: string
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export async function runAIScan(
  scanId: string,
  userId: string
): Promise<OrchestratorResult> {
  // Resolve user email once — needed for notifications
  let userEmail: string | null = null
  try {
    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await admin.auth.admin.getUserById(userId)
    userEmail = data?.user?.email ?? null
  } catch (err) {
    console.warn('[ScanOrchestrator] Could not resolve user email for notifications:', err instanceof Error ? err.message : err)
  }

  try {
    // 1. Verify scan state
    const scan = await getScanById(scanId, userId)
    if (!scan) {
      return { ok: false, error: 'Scan not found or unauthorized' }
    }
    if (scan.status !== 'scanning') {
      return { ok: false, error: `Scan is not ready for AI (status: ${scan.status})` }
    }

    // 2. Fetch and group files
    const allFiles = await getScanFilesByScanId(scanId)
    if (allFiles.length === 0) {
      await failScan(scanId, 'No repository files found to scan.')
      return { ok: false, error: 'No files to scan' }
    }

    // Determine sections present in the scan_files
    const presentSections = new Set(allFiles.map((f) => f.section))

    // Determine sections to scan (PRIMARY_SCAN_SECTIONS + any fallback sections present like payments/general)
    const sectionsToScan = ALL_SECTIONS.filter(
      (s) => PRIMARY_SCAN_SECTIONS.includes(s) || presentSections.has(s)
    )

    // 3. Purge existing results for idempotency
    const deleteRes = await deleteScanResultsForScan(scanId)
    if (!deleteRes.ok) {
      await failScan(scanId, 'Failed to prepare database for new scan results.')
      return { ok: false, error: 'DB prep failed' }
    }

    // 4. Execute scan per section
    let allFindings: ScanFinding[] = []
    let totalSkippedCount = 0
    let attemptedSectionsCount = 0
    let insufficientBalanceCount = 0

    for (const section of sectionsToScan) {
      // Skip if no files for this section
      if (!presentSections.has(section)) {
        continue
      }

      const prompt = buildSectionPrompt(section, allFiles)
      
      // If prompt builder returned null (e.g. files empty after truncation), skip
      if (!prompt) {
        continue
      }

      console.log(`[ScanOrchestrator] Scanning section: ${section}`)

      attemptedSectionsCount++

      // Call DeepSeek
      const apiResult = await runSectionScan(section, prompt)

      if (!apiResult.ok) {
        if (apiResult.reason === 'insufficient_balance') {
          insufficientBalanceCount++
        }
        // Log internally, but continue to next section
        console.warn(`[ScanOrchestrator] Section '${section}' failed: ${apiResult.message}`)
        continue
      }

      // Parse findings safely
      const parseResult = parseFindings(apiResult.rawText)
      
      if (parseResult.parseError) {
        console.warn(`[ScanOrchestrator] Parse error for section '${section}': ${parseResult.parseErrorMessage}`)
      } else {
        allFindings.push(...parseResult.findings)
      }
      
      totalSkippedCount += parseResult.skippedCount
    }

    // 4b. Check if ALL sections failed due to billing error
    if (attemptedSectionsCount > 0 && insufficientBalanceCount === attemptedSectionsCount) {
      const msg = 'DeepSeek API balance is insufficient. Add credits and try again.'
      await failScan(scanId, msg)
      // Send failure email (non-blocking)
      if (userEmail) {
        await sendScanFailedEmail({
          userEmail,
          repoFullName: scan.repo_full_name,
          scanId,
          safeReason: msg,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://vibesafe.io'}/dashboard`,
        })
      }
      return { ok: false, error: msg }
    }

    // 5. Post-process findings
    const uniqueFindings = deduplicateFindings(allFindings)

    // 6. Persist findings
    if (uniqueFindings.length > 0) {
      const persistRes = await createScanResults(scanId, userId, uniqueFindings)
      if (!persistRes.ok) {
        await failScan(scanId, 'Failed to save scan findings to database.')
        return { ok: false, error: 'Persist failed' }
      }
    }

    // 7. Calculate final score
    const scoreResult = calculateSecurityScore(uniqueFindings)

    // 8. Update scan record to complete
    const updateRes = await updateScanStatus(scanId, 'complete', {
      completed_at: new Date().toISOString(),
      security_score: scoreResult.score,
      critical_count: scoreResult.criticalCount,
      high_count: scoreResult.highCount,
      medium_count: scoreResult.mediumCount,
      low_count: scoreResult.lowCount,
      total_findings: scoreResult.totalFindings,
      error_message: null, // Clear any previous errors
    })

    if (!updateRes.ok) {
      console.error(`[ScanOrchestrator] Failed to finalize scan status for ${scanId}`)
      return { ok: false, error: 'Failed to update scan status' }
    }

    console.log(`[ScanOrchestrator] Scan ${scanId} completed. Score: ${scoreResult.score}, Findings: ${uniqueFindings.length}`)
    
    if (totalSkippedCount > 0) {
       console.warn(`[ScanOrchestrator] Skipped ${totalSkippedCount} malformed findings during parse.`)
    }

    // 9. Send scan complete email (non-blocking — never fails the scan)
    if (userEmail) {
      await sendScanCompleteEmail({
        userEmail,
        repoFullName: scan.repo_full_name,
        scanId,
        securityScore: scoreResult.score,
        totalFindings: scoreResult.totalFindings,
        criticalCount: scoreResult.criticalCount,
        highCount: scoreResult.highCount,
        mediumCount: scoreResult.mediumCount,
        lowCount: scoreResult.lowCount,
        resultsUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://vibesafe.io'}/results/${scanId}`,
      })
    }

    return { ok: true }
  } catch (err) {
    const safeError = err instanceof Error ? err.message : 'Unknown error during scan execution.'
    console.error(`[ScanOrchestrator] Catastrophic failure for ${scanId}:`, safeError)
    
    // Attempt to fail the scan safely
    const failMsg = 'An unexpected error occurred during AI analysis. Please try again.'
    await failScan(scanId, failMsg)

    // Send failure email (non-blocking — catches its own errors)
    if (userEmail) {
      // Fetch the scan record to get repo_full_name — use a fresh lookup since scan var may be out of scope
      try {
        const admin = createSupabaseAdmin(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        const { data: scanData } = await admin.from('scans').select('repo_full_name').eq('id', scanId).maybeSingle()
        await sendScanFailedEmail({
          userEmail,
          repoFullName: (scanData as { repo_full_name?: string } | null)?.repo_full_name ?? 'your repository',
          scanId,
          safeReason: failMsg,
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://vibesafe.io'}/dashboard`,
        })
      } catch {
        // Silently ignore email-related errors — scan failure is already recorded
      }
    }

    return { ok: false, error: 'Catastrophic failure' }
  }
}
