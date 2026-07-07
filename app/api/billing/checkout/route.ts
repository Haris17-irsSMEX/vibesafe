/**
 * app/api/billing/checkout/route.ts
 *
 * Server-side Paddle checkout session creator.
 * Creates a Paddle transaction for the authenticated user.
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

function getAppUrl() {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    ''
  )
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

    const environment = process.env.PADDLE_ENVIRONMENT ?? 'sandbox'
    const isSandbox = environment === 'sandbox'
    const paddleApiUrl = isSandbox 
      ? 'https://sandbox-api.paddle.com/transactions' 
      : 'https://api.paddle.com/transactions'

    const appUrl = getAppUrl()
    const paymentUrl = `${appUrl}/pay`

    console.log(`[checkout] Initiating checkout for plan=${plan}, env=${environment}`)

    // 3. Create Paddle checkout session via API
    const paddleRes = await fetch(paddleApiUrl, {
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
          email: user.email ?? '',
          plan,
        },
        checkout: {
          url: paymentUrl,
        },
      }),
    })

    if (!paddleRes.ok) {
      const errBody = await paddleRes.json().catch(() => ({}))
      const code = errBody?.error?.code
      
      console.error('[checkout] Paddle API error:', paddleRes.status, code)

      let userFriendlyError = 'Failed to create checkout session. Please try again.'

      if (code === 'transaction_checkout_url_domain_is_not_approved') {
        userFriendlyError = 'Checkout is disabled because this domain is pending Paddle approval.'
      } else if (code === 'transaction_default_checkout_url_not_set') {
        userFriendlyError = 'Checkout configuration error. Please contact support.'
      }

      return NextResponse.json(
        { error: userFriendlyError },
        { status: 502 }
      )
    }

    const paddleData = await paddleRes.json()
    const checkoutUrl = paddleData?.data?.checkout?.url

    if (!checkoutUrl) {
      console.error('[checkout] No checkout URL returned by Paddle')
      return NextResponse.json(
        { error: 'Failed to create checkout session. Please try again.' },
        { status: 502 }
      )
    }

    if (typeof checkoutUrl !== 'string' || !checkoutUrl.startsWith(paymentUrl)) {
      let returnedHost = 'unknown'
      try {
        returnedHost = new URL(String(checkoutUrl)).host
      } catch {
        returnedHost = 'invalid-url'
      }

      console.error('[checkout] Unexpected Paddle checkout URL returned:', returnedHost)
      return NextResponse.json(
        { error: 'Checkout configuration error. Please contact support.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ checkoutUrl })
  } catch {
    console.error('[checkout] Unexpected error occurred')
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    )
  }
}
