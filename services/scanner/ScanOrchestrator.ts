/**
 * services/scanner/ScanOrchestrator.ts
 *
 * Server-side ONLY. Orchestrates the DeepSeek security scan execution.
 * Single API call implementation for stability.
 */

import { getScanById, updateScanStatus, failScan } from '@/lib/db/scans'
import { getScanFilesByScanId, type ScanFileRecord } from '@/lib/db/scan-files'
import { deleteScanResultsForScan } from '@/lib/db/scan-results'
import { runSectionScan } from './DeepSeekScanner'
import { parseFindings, deduplicateFindings } from './FindingParser'
import { generateFixPrompt } from './FixPromptGenerator'
import { calculateSecurityScore } from '@/services/scoring/SecurityScorer'
import { sendScanCompleteEmail, sendScanFailedEmail } from '@/services/notifications/ResendMailer'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import type { ScanFinding } from '@/lib/types'
import { buildSectionPrompt } from './prompts/SecurityAuditPrompt'
import { SECTION_DEFINITIONS } from './prompts/sectionPrompts'

interface OrchestratorResult {
  ok: boolean
  error?: string
  findingsCount?: number
  securityScore?: number
}

// Helper to rank files for the single API call
function getFilePriority(path: string): number {
  const p = path.toLowerCase()
  if (p.includes('package.json')) return 100
  if (p.includes('middleware')) return 90
  if (p.includes('app/api') || p.includes('pages/api')) return 80
  if (p.includes('auth')) return 70
  if (p.includes('webhook') || p.includes('payment') || p.includes('stripe') || p.includes('paddle')) return 60
  if (p.includes('database') || p.includes('supabase') || p.includes('db')) return 50
  if (p.includes('next.config') || p.includes('vite.config') || p.includes('.env')) return 40
  return 0
}

export async function runAIScan(
  scanId: string,
  userId: string
): Promise<OrchestratorResult> {
  let userEmail: string | null = null
  let stage = 'start_orchestrator'

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

    stage = 'load_scan_files'
    const allFiles = await getScanFilesByScanId(scanId)

    if (allFiles.length === 0) {
      throw new Error('No files to scan')
    }

    stage = 'delete_old_results'
    const deleteRes = await deleteScanResultsForScan(scanId)
    if (!deleteRes.ok) {
      throw new Error('Failed to prepare database')
    }

    stage = 'prepare_files'
    let sortedFiles = [...allFiles].sort((a, b) => getFilePriority(b.file_path) - getFilePriority(a.file_path))
    
    // Max 20 files
    sortedFiles = sortedFiles.slice(0, 20)

    let totalChars = 0
    const limitedFiles = []
    for (const f of sortedFiles) {
      // Max 3000 chars per file
      let content = f.content.slice(0, 3000)
      if (totalChars + content.length > 60000) {
        // Max 60000 total chars
        content = content.slice(0, 60000 - totalChars)
      }
      limitedFiles.push({ path: f.file_path, content, section: 'general' as const })
      totalChars += content.length
      if (totalChars >= 60000) break
    }

    stage = 'build_prompt'
    const def = SECTION_DEFINITIONS['general']
    const sectionPrompt = buildSectionPrompt(def, limitedFiles)

    stage = 'call_deepseek'
    const apiResult = await runSectionScan('general', sectionPrompt)

    if (!apiResult.ok) {
      throw new Error(apiResult.message || 'DeepSeek API failed')
    }

    stage = 'parse_response'
    const parseResult = parseFindings(apiResult.rawText)
    if (parseResult.parseError && parseResult.findings.length === 0) {
      throw new Error('Failed to parse AI response')
    }

    let uniqueFindings = deduplicateFindings(parseResult.findings).slice(0, 40)

    stage = 'insert_scan_results'
    if (uniqueFindings.length > 0) {
      uniqueFindings = uniqueFindings.map(f => ({
        ...f,
        fix_prompt: f.fix_prompt || generateFixPrompt(f),
        fix_prompt_generated_at: f.fix_prompt_generated_at || new Date().toISOString(),
        fix_prompt_model: f.fix_prompt_model || 'deterministic-template-v1'
      }))

      // PART 5 - Minimal insert shape
      const minimalRows = uniqueFindings.map((r) => {
        const severity = ['critical', 'high', 'medium', 'low'].includes((r.severity || '').toLowerCase()) ? (r.severity || '').toLowerCase() : 'medium'
        const why_it_matters = (r as any).why_it_matters || (
          ['critical', 'high'].includes(severity)
            ? 'This issue can create serious security risk and should be fixed before production use.'
            : 'This issue may expose the application to security risk if left unresolved.'
        )

        return {
          scan_id: scanId,
          user_id: userId,
          severity: severity,
          check_name: r.check_name || 'Security finding',
          category: r.category || 'general',
          description: r.description || 'Security issue detected.',
          why_it_matters,
          file_path: r.file_path || '',
          recommendation: r.recommendation || 'Review and fix this issue using secure coding practices.',
          status: 'open',
          created_at: new Date().toISOString()
        }
      })

      const { error: insertErr } = await admin.from('scan_results').insert(minimalRows)
      if (insertErr) {
        console.error('[insert_scan_results] failed:', insertErr)
        throw new Error('AI findings could not be saved.')
      }
    }

    stage = 'update_scan_summary'
    const scoreResult = uniqueFindings.length > 0 
      ? calculateSecurityScore(uniqueFindings) 
      : { score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, totalFindings: 0 }

    // PART 6 - Mark complete correctly
    stage = 'mark_complete'
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
      throw new Error('Failed to update scan status')
    }

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
      }).catch(() => {})
    }

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
