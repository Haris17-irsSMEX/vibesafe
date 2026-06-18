/**
 * app/api/billing/checkout/route.ts
 *
 * Server-side Paddle checkout session creator.
 * Creates a Paddle checkout for the authenticated user.
 * Validates plan, verifies session, then returns checkout URL.
 *
 * POST /api/billing/checkout
 * Body: { plan: 'starter' | 'builder' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PADDLE_PRICE_IDS: Record<string, string> = {
  starter: process.env.PADDLE_STARTER_PRICE_ID ?? '',
  builder: process.env.PADDLE_BUILDER_PRICE_ID ?? '',
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify session
    const supabase = createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse body
    const body = await req.json().catch(() => null)
    const plan = body?.plan

    if (!plan || !['starter', 'builder'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "starter" or "builder".' },
        { status: 400 }
      )
    }

    const priceId = PADDLE_PRICE_IDS[plan]
    if (!priceId) {
      console.error(`[checkout] Missing price ID for plan: ${plan}`)
      return NextResponse.json(
        { error: 'Billing configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const paddleApiKey = process.env.PADDLE_API_KEY
    if (!paddleApiKey) {
      console.error('[checkout] PADDLE_API_KEY is not set')
      return NextResponse.json(
        { error: 'Billing is not configured. Please contact support.' },
        { status: 500 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // 3. Create Paddle checkout session via API
    const paddleRes = await fetch('https://api.paddle.com/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${paddleApiKey}`,
      },
      body: JSON.stringify({
        items: [{ price_id: priceId, quantity: 1 }],
        customer: {
          email: user.email,
        },
        custom_data: {
          user_id: user.id,
          plan,
        },
        checkout: {
          url: `${appUrl}/settings?upgraded=1`,
        },
      }),
    })

    if (!paddleRes.ok) {
      const errBody = await paddleRes.text()
      console.error('[checkout] Paddle API error:', paddleRes.status, errBody)
      return NextResponse.json(
        { error: 'Failed to create checkout session. Please try again.' },
        { status: 502 }
      )
    }

    const paddleData = await paddleRes.json()
    const checkoutUrl = paddleData?.data?.checkout?.url

    if (!checkoutUrl) {
      console.error('[checkout] No checkout URL returned by Paddle:', JSON.stringify(paddleData))
      return NextResponse.json(
        { error: 'Failed to create checkout session. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ checkoutUrl })
  } catch (err) {
    console.error('[checkout] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
