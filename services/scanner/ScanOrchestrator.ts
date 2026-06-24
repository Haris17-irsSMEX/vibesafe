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
import { runSinglePassCall } from './DeepSeekScanner'
import { parseFindings, deduplicateFindings } from './FindingParser'
import { generateFixPrompt } from './FixPromptGenerator'
import { calculateSecurityScore } from '@/services/scoring/SecurityScorer'
import { sendScanCompleteEmail, sendScanFailedEmail } from '@/services/notifications/ResendMailer'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { ScanFinding } from '@/lib/types'
import { SINGLE_PASS_SYSTEM_PROMPT } from './prompts/SecurityAuditPrompt'

interface OrchestratorResult {
  ok: boolean
  error?: string
  findingsCount?: number
  securityScore?: number
}

function selectSafeFiles(allFiles: ScanFileRecord[]) {
  const priorities = [
    /package\.json$/,
    /middleware\.(ts|js)$/,
    /next\.config\./,
    /app\/api\//,
    /pages\/api\//,
    /auth/i,
    /payment/i,
    /webhook/i,
    /upload/i,
    /supabase/i,
    /prisma/i,
    /\.sql$/,
    /config/i,
    /\.env/,
    /server/i,
  ]

  let selected: ScanFileRecord[] = []
  
  const remainingFiles = [...allFiles]
  for (const regex of priorities) {
    if (selected.length >= 25) break
    const matches = remainingFiles.filter(f => regex.test(f.file_path))
    for (const match of matches) {
      if (selected.length >= 25) break
      if (!selected.includes(match)) {
        selected.push(match)
      }
    }
  }

  // fill up to 25 if space available
  if (selected.length < 25) {
     const unselected = remainingFiles.filter(f => !selected.includes(f))
     selected.push(...unselected.slice(0, 25 - selected.length))
  }

  let finalFiles = []
  let totalChars = 0
  for (const f of selected) {
    let content = f.content.slice(0, 4000)
    if (totalChars + content.length > 80000) {
      content = content.slice(0, 80000 - totalChars)
    }
    finalFiles.push({ file_path: f.file_path, content })
    totalChars += content.length
    if (totalChars >= 80000) break
  }
  return finalFiles
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
    console.log(`[run-ai] start`)
    const scan = await getScanById(scanId, userId)
    if (!scan) {
      return { ok: false, error: 'Scan not found or unauthorized' }
    }
    if (scan.status !== 'scanning') {
      return { ok: false, error: `Scan is not ready for AI (status: ${scan.status})` }
    }

    const allFiles = await getScanFilesByScanId(scanId)
    console.log(`[run-ai] files loaded`)

    if (allFiles.length === 0) {
      await failScan(scanId, 'No repository files found to scan.', 'file_load')
      return { ok: false, error: 'No files to scan' }
    }

    const deleteRes = await deleteScanResultsForScan(scanId)
    if (!deleteRes.ok) {
      await failScan(scanId, 'Failed to prepare database for new scan results.', 'db_prep')
      return { ok: false, error: 'DB prep failed' }
    }

    const selectedFiles = selectSafeFiles(allFiles)
    console.log(`[run-ai] selected files`)

    const userPrompt = `Files to analyze:\n` + selectedFiles.map(f => `--- FILE: ${f.file_path} ---\n${f.content}\n`).join('\n')

    console.log(`[run-ai] deepseek call start`)
    const apiResult = await runSinglePassCall(SINGLE_PASS_SYSTEM_PROMPT, userPrompt, 35000)
    
    if (!apiResult.ok) {
      if (apiResult.reason === 'timeout') {
         await failScan(scanId, 'AI provider timed out. Please retry.', 'deepseek_call')
      } else {
         await failScan(scanId, 'AI provider failed. Please retry.', 'deepseek_call')
      }
      return { ok: false, error: 'AI provider failed' }
    }
    console.log(`[run-ai] deepseek response received`)

    const parseResult = parseFindings(apiResult.rawText)
    
    if (parseResult.parseError) {
      await failScan(scanId, 'AI response could not be converted into scan results.', 'parse_response')
      return { ok: false, error: 'Parse failed' }
    }
    
    let allFindings = parseResult.findings
    console.log(`[run-ai] findings parsed`)

    let uniqueFindings = deduplicateFindings(allFindings)

    uniqueFindings = uniqueFindings.map(f => {
      try {
        return {
          ...f,
          fix_prompt: generateFixPrompt(f),
          fix_prompt_generated_at: new Date().toISOString(),
          fix_prompt_model: 'deterministic-template-v1'
        }
      } catch (err) {
        return f
      }
    })

    if (uniqueFindings.length > 0) {
      const persistRes = await createScanResults(scanId, userId, uniqueFindings)
      if (!persistRes.ok) {
        await failScan(scanId, 'AI findings could not be saved. Please retry.', 'insert_scan_results')
        return { ok: false, error: 'AI findings could not be saved. Please retry.' }
      }
    }
    console.log(`[run-ai] findings inserted`)

    const scoreResult = calculateSecurityScore(uniqueFindings)

    const updateRes = await updateScanStatus(scanId, 'complete', {
      completed_at: new Date().toISOString(),
      security_score: scoreResult.score,
      critical_count: scoreResult.criticalCount,
      high_count: scoreResult.highCount,
      medium_count: scoreResult.mediumCount,
      low_count: scoreResult.lowCount,
      total_findings: scoreResult.totalFindings,
      error_message: null, 
      error_stage: null
    })

    if (!updateRes.ok) {
      return { ok: false, error: 'Failed to update scan status' }
    }
    console.log(`[run-ai] summary updated`)

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

    console.log(`[run-ai] complete`)
    return { 
      ok: true, 
      findingsCount: uniqueFindings.length,
      securityScore: scoreResult.score
    }
  } catch (err) {
    const failMsg = 'An unexpected error occurred during AI analysis. Please try again.'
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
