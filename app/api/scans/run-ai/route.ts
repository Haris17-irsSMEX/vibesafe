import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isScanReadyForAI, updateScanStatus } from '@/lib/db/scans'
import { runAIScan } from '@/services/scanner/ScanOrchestrator'
import { rateLimitAIScan } from '@/lib/rate-limit'
import { getUserProfile } from '@/lib/db/users'
import { isAdminEmail } from '@/lib/auth/admin'

export const maxDuration = 300 // Max Vercel timeout for Pro (if applicable)

export async function POST(request: Request) {
  let stage = 'route_start'
  let currentScanId: string | null = null

  try {
    // 1. Auth check
    stage = 'authenticate_user'
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // 1.5. Rate Limit
    stage = 'rate_limit'
    const profile = await getUserProfile(user.id)
    const plan = profile?.plan ?? 'free'
    const isAdmin = isAdminEmail(user.email)

    const rateLimitResult = await rateLimitAIScan(user.id, plan, isAdmin)
    if (!rateLimitResult.success) {
      const errorMsg =
        plan === 'free'
          ? 'Free scan limit reached. Upgrade to run more scans.'
          : 'Scan limit reached. Try again later.'

      return NextResponse.json(
        { success: false, error: errorMsg },
        { status: 429 }
      )
    }

    // 2. Parse request
    stage = 'parse_request'
    const body = await request.json().catch(() => ({}))
    const scanId = body.scanId

    if (!scanId || typeof scanId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'scanId is required' },
        { status: 400 }
      )
    }
    currentScanId = scanId

    // 3. Pre-flight check
    stage = 'load_scan'
    const isReady = await isScanReadyForAI(scanId, user.id)
    if (!isReady) {
      return NextResponse.json(
        { success: false, error: 'Scan is not ready for AI analysis or unauthorized.' },
        { status: 400 }
      )
    }

    // PART 1 — Set scan_engine and stage immediately
    stage = 'set_scanning_status'
    await updateScanStatus(scanId, 'scanning', {
      scan_engine: 'deepseek',
      error_stage: 'run_ai_started',
      error_message: null
    })

    // PART 3 — Add full route timeout guard (35s)
    stage = 'call_deepseek'
    const timeoutMs = 35000
    const timeoutPromise = new Promise<{ ok: false, error: string, isTimeout: true }>((_, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'))
      }, timeoutMs)
    })

    const result = await Promise.race([
      runAIScan(scanId, user.id),
      timeoutPromise
    ])

    // Wait, runAIScan returns { ok: true/false, ... }
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'AI scan could not be completed. Please retry.' },
        { status: 500 }
      )
    }

    // 5. Success
    stage = 'return_success'
    return NextResponse.json({ 
      success: true,
      scanId,
      findingsCount: result.findingsCount,
      securityScore: result.securityScore
    })

  } catch (err) {
    const isTimeout = err instanceof Error && err.message === 'TIMEOUT'
    const finalStage = isTimeout ? 'run_ai_timeout' : stage
    const safeError = isTimeout 
      ? 'AI scan timed out before completion. Please retry.' 
      : 'An unexpected error occurred during AI analysis.'

    console.error(`[POST /api/scans/run-ai] Unhandled error at stage ${finalStage}:`, err)

    if (currentScanId) {
      try {
        const { updateScanStatus } = await import('@/lib/db/scans')
        await updateScanStatus(currentScanId, 'failed', {
          error_stage: finalStage,
          error_message: safeError,
          completed_at: new Date().toISOString(),
          security_score: null
        })
      } catch (dbErr) {
        console.error('[POST /api/scans/run-ai] Failed to update scan status in catch block:', dbErr)
      }
    }

    return NextResponse.json(
      { success: false, error: safeError },
      { status: 500 }
    )
  }
}
