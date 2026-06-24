/**
 * services/scanner/ScanOrchestrator.ts
 *
 * Server-side ONLY. Orchestrates the DeepSeek security scan execution.
 * Wires together file grouping, prompt building, API execution,
 * finding parsing, scoring, and database persistence.
 */

import { getScanById, updateScanStatus, failScan } from '@/lib/db/scans'
import { getScanFilesByScanId, type ScanFileRecord } from '@/lib/db/scan-files'
import { deleteScanResultsForScan, createScanResults } from '@/lib/db/scan-results'
import { runSectionScan } from './DeepSeekScanner'
import { parseFindings, deduplicateFindings } from './FindingParser'
import { generateFixPrompt } from './FixPromptGenerator'
import { calculateSecurityScore } from '@/services/scoring/SecurityScorer'
import { sendScanCompleteEmail, sendScanFailedEmail } from '@/services/notifications/ResendMailer'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { ScanFinding } from '@/lib/types'
import { buildSectionPrompt } from './prompts/SecurityAuditPrompt'
import { SECTION_DEFINITIONS, PRIMARY_SCAN_SECTIONS } from './prompts/sectionPrompts'
import { routeFiles } from './FileRouter'

interface OrchestratorResult {
  ok: boolean
  error?: string
  findingsCount?: number
  securityScore?: number
}

export async function runAIScan(
  scanId: string,
  userId: string
): Promise<OrchestratorResult> {
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
    const scan = await getScanById(scanId, userId)
    if (!scan) {
      return { ok: false, error: 'Scan not found or unauthorized' }
    }
    if (scan.status !== 'scanning') {
      return { ok: false, error: `Scan is not ready for AI (status: ${scan.status})` }
    }

    const allFiles = await getScanFilesByScanId(scanId)
    console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: load_scan_files | files count: ${allFiles.length}`)

    if (allFiles.length === 0) {
      await failScan(scanId, 'No repository files found to scan.', 'file_load')
      return { ok: false, error: 'No files to scan' }
    }

    console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: delete_old_results`)
    const deleteRes = await deleteScanResultsForScan(scanId)
    if (!deleteRes.ok) {
      await failScan(scanId, 'Failed to prepare database for new scan results.', 'db_prep')
      return { ok: false, error: 'DB prep failed' }
    }

    // Route files into sections
    const routedFiles = routeFiles(allFiles.map(f => ({ path: f.file_path, content: f.content })))
    const filesBySection: Record<string, typeof routedFiles> = {}
    
    for (const f of routedFiles) {
      if (!filesBySection[f.section]) filesBySection[f.section] = []
      filesBySection[f.section].push(f)
    }

    // Filter to only sections that have files, prioritizing primary sections
    const activeSections = PRIMARY_SCAN_SECTIONS.filter(sec => filesBySection[sec] && filesBySection[sec].length > 0)
    
    // Add payments and general if they have files
    if (filesBySection['payments']?.length > 0) activeSections.push('payments')
    if (filesBySection['general']?.length > 0) activeSections.push('general')

    let allFindings: ScanFinding[] = []
    let allFailed = true
    let successfulEmptySections = 0

    // Run scans using Promise.allSettled
    const scanPromises = activeSections.map(async (sectionId) => {
      try {
        const files = filesBySection[sectionId]
        const def = SECTION_DEFINITIONS[sectionId]
        
        let totalChars = 0
        const limitedFiles = []
        for (const f of files) {
          let content = f.content.slice(0, 4000)
          if (totalChars + content.length > 80000) {
            content = content.slice(0, 80000 - totalChars)
          }
          limitedFiles.push({ path: f.path, content, section: f.section })
          totalChars += content.length
          if (totalChars >= 80000) break
        }

        console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: build_sections | section: ${sectionId}`)
        const sectionPrompt = buildSectionPrompt(def, limitedFiles)
        
        console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: deepseek_section_start | section: ${sectionId}`)
        const apiResult = await runSectionScan(sectionId, sectionPrompt)
        console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: deepseek_section_response | section: ${sectionId} | response length: ${apiResult.ok ? apiResult.rawText.length : 0}`)

        if (!apiResult.ok) {
          return { sectionId, findings: [], ok: false, length: 0 }
        }

        console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: parse_section_response | section: ${sectionId}`)
        const parseResult = parseFindings(apiResult.rawText)
        console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: parse_section_response_done | section: ${sectionId} | parsed findings count: ${parseResult.findings.length}`)
        if (parseResult.parseError) {
          return { sectionId, findings: [], ok: false, length: apiResult.rawText.length }
        }

        return { 
          sectionId, 
          findings: parseResult.findings, 
          ok: true, 
          length: apiResult.rawText.length 
        }
      } catch (err) {
        return { sectionId, findings: [], ok: false, length: 0 }
      }
    })

    const results = await Promise.allSettled(scanPromises)
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const r = result.value
        if (r.ok) {
          allFailed = false
          if (r.findings.length === 0) {
            successfulEmptySections++
          } else {
            allFindings.push(...r.findings)
          }
        }
      }
    }

    console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: aggregate_findings | valid findings count: ${allFindings.length}`)

    if (allFailed && activeSections.length > 0) {
      await failScan(scanId, 'AI scan could not produce valid results. Please retry.', 'aggregate_findings')
      return { ok: false, error: 'AI scan could not produce valid results. Please retry.' }
    }

    // Deduplicate and limit to 40
    let uniqueFindings = deduplicateFindings(allFindings)
    uniqueFindings = uniqueFindings.slice(0, 40)
    
    console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: generate_fix_prompts`)

    uniqueFindings = uniqueFindings.map(f => {
      try {
        return {
          ...f,
          fix_prompt: f.fix_prompt || generateFixPrompt(f),
          fix_prompt_generated_at: f.fix_prompt_generated_at || new Date().toISOString(),
          fix_prompt_model: f.fix_prompt_model || 'deterministic-template-v1'
        }
      } catch (err) {
        return f
      }
    })

    if (uniqueFindings.length > 0) {
      console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: insert_scan_results`)
      const persistRes = await createScanResults(scanId, userId, uniqueFindings)
      if (!persistRes.ok) {
        await failScan(scanId, 'AI findings could not be saved. Please retry.', 'insert_scan_results')
        return { ok: false, error: 'AI findings could not be saved. Please retry.' }
      }
    }

    const scoreResult = calculateSecurityScore(uniqueFindings)
    
    console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: update_scan_summary`)

    const updateRes = await updateScanStatus(scanId, 'complete', {
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
      return { ok: false, error: 'Failed to update scan status' }
    }

    console.log(`[ScanOrchestrator] scanId: ${scanId} | stage: mark_complete`)

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

    return { 
      ok: true, 
      findingsCount: uniqueFindings.length,
      securityScore: scoreResult.score
    }
  } catch (err) {
    const failMsg = 'An unexpected error occurred during AI analysis. Please retry.'
    await failScan(scanId, failMsg, 'unknown')

    if (userEmail) {
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
      } catch {}
    }

    return { ok: false, error: 'Catastrophic failure' }
  }
}
