/**
 * app/api/scans/run-ai/route.ts
 *
 * Triggers the DeepSeek AI scan execution for a specific scan record.
 * This can take a while, so we might eventually want to move it to a background worker.
 * For now, we await it directly.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isScanReadyForAI } from '@/lib/db/scans'
import { runAIScan } from '@/services/scanner/ScanOrchestrator'
import { rateLimitAIScan } from '@/lib/rate-limit'

export const maxDuration = 300 // Max Vercel timeout for Pro (if applicable)

export async function POST(request: Request) {
  try {
    // 1. Auth check
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 1.5. Rate Limit
    const rateLimitResult = await rateLimitAIScan(user.id)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, error: 'Daily AI scan limit reached. Try again tomorrow.' },
        { status: 429 }
      )
    }

    // 2. Parse request
    const body = await request.json().catch(() => ({}))
    const scanId = body.scanId

    if (!scanId || typeof scanId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'scanId is required' },
        { status: 400 }
      )
    }

    // 3. Pre-flight check (ownership & status)
    // Ensures status='scanning' and file_count > 0
    const isReady = await isScanReadyForAI(scanId, user.id)
    if (!isReady) {
      return NextResponse.json(
        { success: false, error: 'Scan is not ready for AI analysis or unauthorized.' },
        { status: 400 }
      )
    }

    // 4. Execute AI Scan
    // This blocks until the orchestrator finishes all sections.
    const result = await runAIScan(scanId, user.id)

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to complete AI scan.' },
        { status: 500 }
      )
    }

    // 5. Success
    return NextResponse.json({ success: true })

  } catch (err) {
    console.error('[POST /api/scans/run-ai] Unhandled error:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
