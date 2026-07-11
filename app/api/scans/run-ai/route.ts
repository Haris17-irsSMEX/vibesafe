import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isScanReadyForAI, updateScanStatus } from '@/lib/db/scans'
import { runAIScan } from '@/services/scanner/ScanOrchestrator'
import { rateLimitAIScan } from '@/lib/rate-limit'
import { getUserProfile } from '@/lib/db/users'
import { isAdminEmail } from '@/lib/auth/admin'

// Phase 1 adds project discovery, deterministic verification, and richer
// reporting. Let the platform allow a full five minutes rather than racing a
// shorter local watchdog against a still-running orchestrator.
export const maxDuration = 300

function getSafeAiFailureMessage(error: unknown): string {
  const marker = error instanceof Error ? error.message : ''
  if (marker.includes('AI_PROVIDER_auth')) return 'AI provider authentication failed. Please check configuration.'
  if (marker.includes('AI_PROVIDER_rate_limit')) return 'AI provider rate limit reached. Please retry shortly.'
  if (marker.includes('AI_PROVIDER_provider_unavailable')) return 'AI provider is temporarily unavailable. Please retry.'
  if (marker.includes('AI_PROVIDER_payload_too_large')) return 'This repository is large, so CtrlCode is analyzing it in multiple security-focused passes.'
  if (marker.includes('AI_PROVIDER_timeout')) return 'AI analysis timed out. Please retry.'
  if (marker.includes('AI_PROVIDER_empty_response')) return 'AI provider returned an empty response. Please retry.'
  if (marker.includes('AI_PROVIDER_invalid_json')) return 'AI provider returned an invalid response. Please retry.'
  if (marker.includes('AI_PROVIDER_unsupported_structured_response')) return 'AI provider returned an unsupported structured response. Please retry.'
  return 'AI analysis failed. Please retry.'
}

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
    console.info('[POST /api/scans/run-ai] scan requested', { scanId })

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

    stage = 'call_deepseek'
    // Do not race this work with a short in-process timeout. Doing so can
    // return an error while runAIScan continues and successfully completes.
    const result = await runAIScan(scanId, user.id)

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
    const marker = err instanceof Error ? err.message : ''
    const isTimeout = marker === 'TIMEOUT' || marker.includes('AI_PROVIDER_timeout')
    const isProviderFailure = marker.startsWith('AI_PROVIDER_')
    const finalStage = isTimeout || isProviderFailure ? 'call_deepseek' : stage
    const safeError = getSafeAiFailureMessage(err)

    if (isTimeout) console.warn('[POST /api/scans/run-ai] timeout trigger', { scanId: currentScanId, stage: finalStage })
    console.error(`[POST /api/scans/run-ai] Unhandled error at stage ${finalStage}:`, err instanceof Error ? err.message : 'Unknown error')

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
