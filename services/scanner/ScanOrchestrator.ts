/**
 * services/scanner/ScanOrchestrator.ts
 *
 * Server-side ONLY. Orchestrates the DeepSeek security scan execution.
 * Executes bounded, security-focused provider passes and merges them into one audit.
 */

import { getScanById, updateScanStatus, failScan, resetScanReport, updateScanAuditData } from '@/lib/db/scans'
import { getScanFilesByScanId } from '@/lib/db/scan-files'
import { createScanResults, deleteScanResultsForScan } from '@/lib/db/scan-results'
import { AI_PROVIDER_MODEL, runSectionScan, type ProviderFailureReason } from './DeepSeekScanner'
import { parseFullAuditResponse } from './FindingParser'
import { generateFixPrompt } from './FixPromptGenerator'
import { extractCodeEvidence } from './CodeEvidenceExtractor'
import { calculateAuditAwareScore } from '@/services/scoring/SecurityScorer'
import { sendScanCompleteEmail, sendScanFailedEmail } from '@/services/notifications/ResendMailer'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { AuditChecklistItem, AuditReport, FullParseResult, ScanFinding } from '@/lib/types'
import { buildSectionPrompt, SECURITY_AUDIT_PROMPT_VERSION, SINGLE_PASS_SYSTEM_PROMPT } from './prompts/SecurityAuditPrompt'
import { SECTION_DEFINITIONS } from './prompts/sectionPrompts'
import { buildProjectContext, formatProjectContext } from './ProjectContext'
import { formatPrecheckCandidates, runDeterministicPrechecks } from './DeterministicPrechecks'
import { verifyAndDeduplicateFindings } from './FindingVerification'
import { AI_MAX_CONCURRENT_ZONE_SCANS, compactAiPayload, planAiSecurityScan, type PreparedAiPayload } from './ScanPayload'

const AI_SCAN_PROVIDER_TIMEOUT_MS = readLimit('AI_SCAN_PROVIDER_TIMEOUT_MS', 45_000)

function readLimit(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

interface OrchestratorResult {
  ok: boolean
  error?: string
  findingsCount?: number
  securityScore?: number
}

function providerError(reason: ProviderFailureReason): Error {
  return new Error(`AI_PROVIDER_${reason}`)
}

type ZoneOutcome =
  | { ok: true; payload: PreparedAiPayload; result: FullParseResult; durationMs: number; attempts: number; responseChars: number }
  | { ok: false; payload: PreparedAiPayload; reason: ProviderFailureReason | 'invalid_json'; durationMs: number; attempts?: number }

function priorityWeight(priority: PreparedAiPayload['priority']): number {
  return { critical: 0, high: 1, normal: 2, low: 3 }[priority]
}

function mergeChecklist<T extends { id: string; section: string; check: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = `${item.id}:${item.section}:${item.check}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function mergeAuditReports(reports: AuditReport[]): AuditReport | null {
  if (!reports.length) return null
  const postureRank = { strong: 0, acceptable: 1, needs_work: 2, critical: 3 }
  const mostConservative = [...reports].sort((a, b) => postureRank[b.security_posture] - postureRank[a.security_posture])[0]
  const unique = (values: string[], limit: number) => Array.from(new Set(values.filter(Boolean))).slice(0, limit)
  return {
    security_posture: mostConservative.security_posture,
    executive_summary: mostConservative.executive_summary,
    quick_wins: unique(reports.flatMap((report) => report.quick_wins), 5),
    what_is_done_right: unique(reports.flatMap((report) => report.what_is_done_right), 5),
    priority_plan: unique(reports.flatMap((report) => report.priority_plan), 8),
  }
}

export async function runAIScan(
  scanId: string,
  userId: string
): Promise<OrchestratorResult> {
  let userEmail: string | null = null
  let stage = 'start_orchestrator'
  const scanStartedAt = Date.now()
  let stageStartedAt = scanStartedAt
  const markStage = (nextStage: string) => {
    console.info('[ScanOrchestrator] stage timing', {
      scanId,
      stage,
      durationMs: Date.now() - stageStartedAt,
    })
    stage = nextStage
    stageStartedAt = Date.now()
  }

  try {
    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // Try to get email for notifications
    try {
      const { data } = await admin.auth.admin.getUserById(userId)
      userEmail = data?.user?.email ?? null
    } catch (e) {
      console.warn('Failed to get user email')
    }

    const scan = await getScanById(scanId, userId)
    if (!scan) return { ok: false, error: 'Scan not found' }

    markStage('load_scan_files')
    const allFiles = await getScanFilesByScanId(scanId)

    if (allFiles.length === 0) {
      throw new Error('No files to scan')
    }

    markStage('delete_old_results')
    const deleteRes = await deleteScanResultsForScan(scanId)
    if (!deleteRes.ok) {
      throw new Error('Failed to prepare database')
    }

    markStage('project_understanding')
    const projectContext = buildProjectContext(allFiles.map((file) => ({ path: file.file_path, content: file.content })))
    markStage('deterministic_prechecks')
    const precheckCandidates = runDeterministicPrechecks(allFiles.map((file) => ({ path: file.file_path, content: file.content })))

    markStage('prepare_files')
    const scanPlan = planAiSecurityScan(allFiles, precheckCandidates.map((candidate) => candidate.file_path).filter(Boolean) as string[])
    if (!scanPlan.payloads.length) throw new Error('AI_PROVIDER_payload_too_large')

    console.info('[ScanOrchestrator] scan plan selected', {
      scanId,
      repoFullName: scan.repo_full_name,
      plan: scanPlan.size,
      filesCollected: allFiles.length,
      eligibleFiles: scanPlan.eligibleFiles,
      totalSourceChars: scanPlan.totalSourceChars,
      highRiskFiles: scanPlan.highRiskFiles,
      detectedZones: scanPlan.detectedZones,
      zonesSelected: scanPlan.selectedZones,
      aiCallsPlanned: scanPlan.payloads.length,
      maxConcurrentCalls: AI_MAX_CONCURRENT_ZONE_SCANS,
    })
    for (const skipped of scanPlan.skippedZones) {
      console.info('[ScanOrchestrator] zone skipped', { scanId, zone: skipped.zone, reason: skipped.reason })
    }

    const mergedFindings: ScanFinding[] = []
    const mergedChecklist: AuditChecklistItem[] = []
    const auditReports: AuditReport[] = []
    const incompleteZones: string[] = []
    let completedZoneCount = 0

    const executePayload = async (initialPayload: PreparedAiPayload, chunkIndex: number): Promise<ZoneOutcome> => {
      const chunkStartedAt = Date.now()
      let activePayload = initialPayload
      const buildPrompt = (payload: PreparedAiPayload) => {
        const pathsInChunk = new Set(payload.files.map((file) => file.path))
        const chunkCandidates = precheckCandidates.filter((candidate) => candidate.file_path && pathsInChunk.has(candidate.file_path))
        return buildSectionPrompt(SECTION_DEFINITIONS.general, payload.files, {
          projectContext: formatProjectContext(projectContext),
          precheckCandidates: formatPrecheckCandidates(chunkCandidates),
          scanStage: `${payload.zone} pass ${chunkIndex + 1} of ${scanPlan.payloads.length}`,
        })
      }

      let sectionPrompt = buildPrompt(activePayload)
      const diagnostics = {
        scanId, repoFullName: scan.repo_full_name, selectedFiles: activePayload.files.length,
        skippedFiles: activePayload.skippedFiles, truncatedFiles: activePayload.truncatedFiles,
        sourceChars: activePayload.sourceChars, promptChars: sectionPrompt.length, timeoutMs: AI_SCAN_PROVIDER_TIMEOUT_MS,
      }
      let apiResult = await runSectionScan(activePayload.zone, sectionPrompt, SINGLE_PASS_SYSTEM_PROMPT, diagnostics)
      if (!apiResult.ok && apiResult.reason === 'payload_too_large') {
        activePayload = compactAiPayload(activePayload)
        sectionPrompt = buildPrompt(activePayload)
        diagnostics.selectedFiles = activePayload.files.length
        diagnostics.skippedFiles = activePayload.skippedFiles
        diagnostics.truncatedFiles = activePayload.truncatedFiles
        diagnostics.sourceChars = activePayload.sourceChars
        diagnostics.promptChars = sectionPrompt.length
        apiResult = await runSectionScan(`${activePayload.zone}_compact`, sectionPrompt, SINGLE_PASS_SYSTEM_PROMPT, diagnostics)
      }
      if (!apiResult.ok) {
        return { ok: false, payload: activePayload, reason: apiResult.reason, durationMs: Date.now() - chunkStartedAt, attempts: apiResult.attempts }
      }

      let chunkResult = parseFullAuditResponse(apiResult.rawText)
      if (chunkResult.parseError) {
        const repairResult = await runSectionScan(
          `${activePayload.zone}_json_repair`, sectionPrompt,
          `${SINGLE_PASS_SYSTEM_PROMPT}\nThe prior response could not be parsed. Return one compact, valid JSON object only. Do not omit required top-level keys.`,
          { scanId, repoFullName: scan.repo_full_name, selectedFiles: activePayload.files.length, skippedFiles: activePayload.skippedFiles, truncatedFiles: activePayload.truncatedFiles, sourceChars: activePayload.sourceChars, promptChars: sectionPrompt.length, timeoutMs: AI_SCAN_PROVIDER_TIMEOUT_MS }
        )
        if (!repairResult.ok) return { ok: false, payload: activePayload, reason: repairResult.reason, durationMs: Date.now() - chunkStartedAt, attempts: repairResult.attempts }
        chunkResult = parseFullAuditResponse(repairResult.rawText)
        if (chunkResult.parseError) return { ok: false, payload: activePayload, reason: 'invalid_json', durationMs: Date.now() - chunkStartedAt, attempts: repairResult.attempts }
        return { ok: true, payload: activePayload, result: chunkResult, durationMs: Date.now() - chunkStartedAt, attempts: repairResult.attempts, responseChars: repairResult.rawText.length }
      }
      return { ok: true, payload: activePayload, result: chunkResult, durationMs: Date.now() - chunkStartedAt, attempts: apiResult.attempts, responseChars: apiResult.rawText.length }
    }

    markStage('analyze_security_zones')
    const plannedPayloads = [...scanPlan.payloads].sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))
    let nextPayloadIndex = 0
    while (nextPayloadIndex < plannedPayloads.length) {
      const batch: Array<{ payload: PreparedAiPayload; index: number }> = []
      while (batch.length < AI_MAX_CONCURRENT_ZONE_SCANS && nextPayloadIndex < plannedPayloads.length) {
        const payload = plannedPayloads[nextPayloadIndex]
        nextPayloadIndex++
        batch.push({ payload, index: nextPayloadIndex - 1 })
      }
      if (!batch.length) continue

      console.info('[ScanOrchestrator] AI batch started', { scanId, zones: batch.map(({ payload }) => payload.zone), concurrentCalls: batch.length })
      const outcomes = await Promise.all(batch.map(({ payload, index }) => executePayload(payload, index)))
      for (const outcome of outcomes) {
        if (!outcome.ok) {
          console.warn('[ScanOrchestrator] provider chunk failed', {
            scanId, repoFullName: scan.repo_full_name, model: AI_PROVIDER_MODEL, zone: outcome.payload.zone,
            reason: outcome.reason, attempts: outcome.attempts, durationMs: outcome.durationMs,
            selectedFiles: outcome.payload.files.length, skippedFiles: outcome.payload.skippedFiles,
            truncatedFiles: outcome.payload.truncatedFiles, sourceChars: outcome.payload.sourceChars,
          })
          incompleteZones.push(`${outcome.payload.zone}: ${outcome.reason}`)
          continue
        }
        console.info('[ScanOrchestrator] security pass completed', {
          scanId, model: AI_PROVIDER_MODEL, promptVersion: SECURITY_AUDIT_PROMPT_VERSION,
          zone: outcome.payload.zone, selectedFiles: outcome.payload.files.length,
          skippedFiles: outcome.payload.skippedFiles, truncatedFiles: outcome.payload.truncatedFiles,
          sourceChars: outcome.payload.sourceChars, responseChars: outcome.responseChars,
          findingsParsed: outcome.result.findings.length, providerAttempts: outcome.attempts, durationMs: outcome.durationMs,
        })
        mergedFindings.push(...outcome.result.findings)
        mergedChecklist.push(...outcome.result.checklist)
        if (outcome.result.report) auditReports.push(outcome.result.report)
        completedZoneCount++
      }
    }

    if (completedZoneCount === 0) {
      const permanentFailure = incompleteZones.find((entry) => /: (auth|invalid_request|insufficient_balance)$/.test(entry))
      if (permanentFailure) throw providerError(permanentFailure.split(': ')[1] as ProviderFailureReason)
      throw new Error('AI_PROVIDER_unsupported_structured_response')
    }
    if (incompleteZones.length > 0) {
      console.warn('[ScanOrchestrator] partial security analysis completed', {
        scanId,
        completedZoneCount,
        incompleteZoneCount: incompleteZones.length,
        incompleteZones,
      })
    }

    const parseResult = {
      findings: mergedFindings,
      checklist: mergeChecklist(mergedChecklist),
      report: mergeAuditReports(auditReports),
      skippedCount: 0,
      parseError: false,
    }
    const evidenceFiles = allFiles.map((file) => ({ path: file.file_path, content: file.content }))

    markStage('verify_findings')
    const verification = verifyAndDeduplicateFindings(parseResult.findings, evidenceFiles)
    let uniqueFindings = verification.findings.slice(0, 40)

    console.log(
      `[ScanOrchestrator] Evidence verification: candidates=${precheckCandidates.length}, kept=${uniqueFindings.length}, removed=${verification.removed}, downgraded=${verification.downgraded}`
    )

    markStage('generate_fix_prompts')
    if (uniqueFindings.length > 0) {
      uniqueFindings = uniqueFindings.map(f => {
        let line_number = f.line_number ?? null
        let vulnerable_code = f.vulnerable_code ?? null
        
        if (line_number === null || vulnerable_code === null) {
          const evidence = extractCodeEvidence(f, evidenceFiles)
          if (line_number === null) line_number = evidence.line_number
          if (vulnerable_code === null) vulnerable_code = evidence.vulnerable_code
        }
        
        f.line_number = line_number ?? undefined
        f.vulnerable_code = vulnerable_code ?? undefined

        return {
          ...f,
          // Normalize every prompt after evidence verification so it carries the
          // same constraints, verification context, and validation commands.
          fix_prompt: generateFixPrompt(f),
          fix_prompt_generated_at: new Date().toISOString(),
          fix_prompt_model: 'evidence-template-v2'
        }
      })

      markStage('save_findings')
      const insertResult = await createScanResults(scanId, userId, uniqueFindings)
      if (!insertResult.ok) throw new Error(insertResult.error)
    }

    markStage('update_scan_summary')
    const scoreResult = (uniqueFindings.length > 0 || parseResult.checklist.length > 0 || parseResult.report)
      ? calculateAuditAwareScore(uniqueFindings, parseResult.checklist, parseResult.report) 
      : { score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, totalFindings: 0 }

    // A report is deliberately deferred. A completed scan exposes verified
    // findings immediately, even if a later report request fails.
    const analysisWarnings = [
      ...(incompleteZones.length > 0
        ? ['Partial coverage: some planned security analysis passes did not complete. Existing findings are shown, but remaining areas are not marked clean.']
        : []),
    ]
    markStage('reset_report')
    const resetReportResult = await resetScanReport(scanId, analysisWarnings)
    if (!resetReportResult.ok) throw new Error('Failed to reset report state')

    // Mark complete correctly and clear any stale scan errors.
    markStage('mark_complete')
    const updateRes = await updateScanStatus(scanId, 'completed', {
      completed_at: new Date().toISOString(),
      security_score: scoreResult.score,
      critical_count: scoreResult.criticalCount,
      high_count: scoreResult.highCount,
      medium_count: scoreResult.mediumCount,
      low_count: scoreResult.lowCount,
      total_findings: scoreResult.totalFindings,
      error_message: null, 
      error_stage: null,
      scan_engine: 'deepseek'
    })

    if (!updateRes.ok) {
      throw new Error('Failed to update scan status')
    }

    console.info('[ScanOrchestrator] completion update persisted', { scanId, status: 'completed' })

    if (userEmail && incompleteZones.length === 0) {
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
      }).catch(() => {})
    } else if (userEmail) {
      console.info('[ScanOrchestrator] completion email withheld for partial coverage', { scanId, incompleteZoneCount: incompleteZones.length })
    }

    // Save audit metadata from the security passes. This is not the full
    // Security Officer Report; that is generated on demand from saved data.
    markStage('save_audit_data')
    try {
      if (parseResult.checklist.length > 0 || parseResult.report) {
        await updateScanAuditData(scanId, {
          audit_checklist: parseResult.checklist,
          // Core detection no longer asks the provider for report posture.
          // Keep the audit metadata neutral; final readiness is calculated
          // later from the saved, verified findings.
          security_posture: parseResult.report?.security_posture || 'acceptable',
          quick_wins: parseResult.report?.quick_wins || [],
          what_is_done_right: parseResult.report?.what_is_done_right || [],
          priority_plan: parseResult.report?.priority_plan || [],
          audit_prompt_version: SECURITY_AUDIT_PROMPT_VERSION
        })
      }
    } catch (auditErr) {
       console.warn(
        `[ScanOrchestrator] Audit data save failed for scan ${scanId} (non-fatal):`,
        auditErr instanceof Error ? auditErr.message : 'Unknown error'
      )
    }

    console.info('[ScanOrchestrator] core scan timing', {
      scanId,
      durationMs: Date.now() - scanStartedAt,
      findingsCount: uniqueFindings.length,
      reportDeferred: true,
    })

    return {
      ok: true, 
      findingsCount: uniqueFindings.length,
      securityScore: scoreResult.score
    }
  } catch (err) {
    const safeError = err instanceof Error ? err.message : 'Unknown error during scan execution.'
    console.error(`[ScanOrchestrator] failure for ${scanId} at stage ${stage}:`, safeError)
    
    // Send email on failure
    if (userEmail) {
      try {
        const admin = createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
        const { data: scanData } = await admin.from('scans').select('repo_full_name').eq('id', scanId).maybeSingle()
        await sendScanFailedEmail({
          userEmail,
          repoFullName: (scanData as { repo_full_name?: string } | null)?.repo_full_name ?? 'your repository',
          scanId,
          safeReason: 'AI scan encountered an error',
          dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://vibesafe.io'}/dashboard`,
        }).catch(() => {})
      } catch {}
    }
    
    throw err // Let route.ts catch it
  }
}
