import { NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import { calculateSecurityScore } from '@/services/scoring/SecurityScorer'
import type { ScanFinding } from '@/lib/types'

export async function POST() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const adminClient = createSupabaseAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Fetch all completed scans
  const { data: scans, error: scansError } = await adminClient
    .from('scans')
    .select('id')
    .in('status', ['complete', 'completed'])

  if (scansError) {
    return NextResponse.json({ error: scansError.message }, { status: 500 })
  }

  let updatedCount = 0

  for (const scan of scans) {
    // Fetch results for scan
    const { data: results, error: resultsError } = await adminClient
      .from('scan_results')
      .select('severity')
      .eq('scan_id', scan.id)

    if (resultsError || !results) continue

    const mockFindings = results.map(r => ({ severity: r.severity } as ScanFinding))
    const scoreResult = calculateSecurityScore(mockFindings)

    // Update scan record
    await adminClient
      .from('scans')
      .update({
        security_score: scoreResult.score,
        critical_count: scoreResult.criticalCount,
        high_count: scoreResult.highCount,
        medium_count: scoreResult.mediumCount,
        low_count: scoreResult.lowCount,
      })
      .eq('id', scan.id)

    updatedCount++
  }

  return NextResponse.json({ success: true, updatedCount })
}
