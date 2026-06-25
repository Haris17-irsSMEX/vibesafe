import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import { generateFixPrompt } from '@/services/scanner/FixPromptGenerator'
import { extractCodeEvidence } from '@/services/scanner/CodeEvidenceExtractor'
import type { ScanFinding } from '@/lib/types'
import { getScanFilesByScanId } from '@/lib/db/scan-files'

export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Find all scan_results where fix_prompt is null
    const { data: findingsToUpdate, error: fetchError } = await admin
      .from('scan_results')
      .select('*')
      .is('fix_prompt', null)

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch findings', details: fetchError.message }, { status: 500 })
    }

    if (!findingsToUpdate || findingsToUpdate.length === 0) {
      return NextResponse.json({ count: 0, message: 'No findings to backfill' })
    }

    let updatedCount = 0

    // Group findings by scan_id to minimize scan_files lookups
    const findingsByScan = findingsToUpdate.reduce((acc, finding) => {
      if (!acc[finding.scan_id]) acc[finding.scan_id] = []
      acc[finding.scan_id].push(finding)
      return acc
    }, {} as Record<string, typeof findingsToUpdate>)

    for (const scanId of Object.keys(findingsByScan)) {
      const scanFindings = findingsByScan[scanId]
      const scanFiles = await getScanFilesByScanId(scanId)

      for (const rawFinding of scanFindings) {
        // Build a minimal ScanFinding object for the generator/extractor
        const findingPayload: ScanFinding = {
          check_name: rawFinding.check_name,
          severity: (rawFinding.severity || 'MEDIUM').toUpperCase() as ScanFinding['severity'],
          category: rawFinding.category,
          description: rawFinding.description,
          recommendation: rawFinding.recommendation,
          file_path: rawFinding.file_path,
          line_number: rawFinding.line_number ?? undefined,
          vulnerable_code: rawFinding.vulnerable_code ?? undefined,
          evidence_snippet: rawFinding.evidence_snippet ?? undefined,
          why_it_matters: rawFinding.why_it_matters ?? undefined,
        }

        let line_number = findingPayload.line_number ?? null
        let vulnerable_code = findingPayload.vulnerable_code ?? null

        // If missing line/code, try to extract it from scanFiles
        if (line_number === null || vulnerable_code === null) {
          const evidence = extractCodeEvidence(findingPayload, scanFiles.map(f => ({ path: f.file_path, content: f.content })))
          if (line_number === null) line_number = evidence.line_number
          if (vulnerable_code === null) vulnerable_code = evidence.vulnerable_code
          
          findingPayload.line_number = line_number ?? undefined
          findingPayload.vulnerable_code = vulnerable_code ?? undefined
        }

        const fix_prompt = generateFixPrompt(findingPayload)

        const { error: updateErr } = await admin
          .from('scan_results')
          .update({
            fix_prompt,
            fix_prompt_generated_at: new Date().toISOString(),
            fix_prompt_model: 'deterministic-template-v1',
            line_number: line_number,
            vulnerable_code: vulnerable_code
          })
          .eq('id', rawFinding.id)

        if (updateErr) {
          console.error(`[Backfill] Failed to update finding ${rawFinding.id}:`, updateErr.message)
        } else {
          updatedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      count: updatedCount,
      message: `Successfully backfilled ${updatedCount} findings.`
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Backfill Route Error]:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
