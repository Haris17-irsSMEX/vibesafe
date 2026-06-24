/**
 * app/api/admin/backfill-fix-prompts/route.ts
 *
 * ADMIN-ONLY API route to backfill fix prompts for existing findings.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { generateFixPrompt } from '@/services/scanner/FixPromptGenerator'
import type { ScanFinding, Severity } from '@/lib/types'

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase env vars for admin client')
  }
  return createSupabaseAdmin(supabaseUrl, supabaseKey)
}

export async function POST() {
  try {
    // 1. Verify authenticated session
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Verify admin email — server-side only
    if (!isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const admin = getAdminClient()

    // 3. Fetch findings without fix prompts
    const { data: findings, error: fetchError } = await admin
      .from('scan_results')
      .select('*')
      .is('fix_prompt', null)
      .limit(100)

    if (fetchError) {
      console.error('[backfill-fix-prompts] Fetch error:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch findings' }, { status: 500 })
    }

    if (!findings || findings.length === 0) {
      return NextResponse.json({ ok: true, message: 'No findings to backfill', updatedCount: 0 })
    }

    // 4. Generate prompts and update
    let updatedCount = 0
    for (const finding of findings) {
      const scanFinding: ScanFinding = {
        check_name: finding.check_name,
        severity: finding.severity as Severity,
        category: finding.category,
        file_path: finding.file_path,
        description: finding.description,
        why_it_matters: finding.why_it_matters,
        line_number: finding.line_number ?? undefined,
        cwe_id: finding.cwe_id ?? undefined,
        vulnerable_code: finding.vulnerable_code ?? undefined,
        fix_code: finding.fix_code ?? undefined,
        effort_minutes: finding.effort_minutes ?? undefined,
      }

      const prompt = generateFixPrompt(scanFinding)

      const { error: updateError } = await admin
        .from('scan_results')
        .update({
          fix_prompt: prompt,
          fix_prompt_generated_at: new Date().toISOString(),
          fix_prompt_model: 'deterministic-template-v1',
        })
        .eq('id', finding.id)

      if (updateError) {
        console.error(`[backfill-fix-prompts] Update error for ${finding.id}:`, updateError)
      } else {
        updatedCount++
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Backfilled ${updatedCount} findings`,
      updatedCount,
      totalRemaining: findings.length > updatedCount ? findings.length - updatedCount : 0
    })
  } catch (err) {
    console.error('[backfill-fix-prompts] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
