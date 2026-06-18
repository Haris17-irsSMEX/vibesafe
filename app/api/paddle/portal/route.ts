/**
 * app/api/paddle/portal/route.ts
 *
 * POST /api/paddle/portal
 *
 * Creates a Paddle customer portal session for authenticated users.
 * Requires paddle_customer_id stored from a prior webhook event.
 * Returns { portalUrl } on success, or { error, fallbackUrl } on failure.
 *
 * Security: session verified server-side; paddle_customer_id loaded from DB
 * (never accepted from client).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserProfile, upsertUserProfile } from '@/lib/db/users'

export async function POST() {
  try {
    // 1. Verify session server-side
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Load user profile — never trust client-supplied customer ID
    let profile = await getUserProfile(user.id)
    if (!profile) {
      await upsertUserProfile(user.id, user.email ?? null)
      profile = await getUserProfile(user.id)
    }

    // 3. Check for Paddle customer ID
    const paddleCustomerId = profile?.paddle_customer_id
    if (!paddleCustomerId) {
      // User has not yet completed a paid checkout — no portal available
      return NextResponse.json(
        {
          error: 'No billing account found. Complete a checkout first to access the billing portal.',
          fallbackUrl: null,
        },
        { status: 422 }
      )
    }

    // 4. Validate API key
    const paddleApiKey = process.env.PADDLE_API_KEY
    if (!paddleApiKey) {
      console.error('[portal] PADDLE_API_KEY is not set')
      return NextResponse.json(
        { error: 'Billing portal is not configured yet.' },
        { status: 503 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // 5. Request a Paddle customer portal session
    //    Paddle API: POST /customers/{customer_id}/portal-sessions
    const portalRes = await fetch(
      `https://api.paddle.com/customers/${paddleCustomerId}/portal-sessions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${paddleApiKey}`,
        },
        body: JSON.stringify({
          // Return URL after the user closes the portal
          return_url: `${appUrl}/settings`,
        }),
      }
    )

    if (!portalRes.ok) {
      const body = await portalRes.text()
      console.error('[portal] Paddle portal API error:', portalRes.status, body)

      // Graceful fallback — don't crash; return a safe message
      return NextResponse.json(
        {
          error: 'Billing portal is not available right now. Please try again later or contact support.',
          fallbackUrl: null,
        },
        { status: 502 }
      )
    }

    const portalData = await portalRes.json()
    const portalUrl: string | undefined = portalData?.data?.urls?.general?.overview

    if (!portalUrl) {
      console.error('[portal] No portal URL in Paddle response:', JSON.stringify(portalData))
      return NextResponse.json(
        {
          error: 'Billing portal is not configured yet.',
          fallbackUrl: null,
        },
        { status: 502 }
      )
    }

    return NextResponse.json({ portalUrl })
  } catch (err) {
    console.error('[portal] Unexpected error:', err instanceof Error ? err.message : 'unknown')
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
