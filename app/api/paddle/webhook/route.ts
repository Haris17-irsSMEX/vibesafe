/**
 * app/api/paddle/webhook/route.ts
 *
 * POST /api/paddle/webhook
 *
 * Handles Paddle webhook events with cryptographic signature verification.
 * Updates users.plan ONLY from verified Paddle events.
 * Never trusts frontend plan updates.
 *
 * Supported events:
 *   - subscription.activated   → upgrade plan
 *   - subscription.updated     → update plan
 *   - subscription.canceled    → downgrade to free
 *   - transaction.completed    → ensure plan is set (one-time purchase fallback)
 *
 * Security:
 *   - Signature verified using HMAC-SHA256 with PADDLE_WEBHOOK_SECRET
 *   - user_id read from custom_data (set at checkout), never from client headers
 *   - paddle_customer_id stored for portal access
 *   - Raw body is read before any parsing (required for signature)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { updateUserPlan } from '@/lib/db/users'
import type { UserPlan } from '@/lib/db/users'

// ─── Price ID → Plan mapping ──────────────────────────────────────────────────

const PRICE_PLAN_MAP: Record<string, UserPlan> = {
  [process.env.PADDLE_STARTER_PRICE_ID ?? '__starter__']: 'starter',
  [process.env.PADDLE_BUILDER_PRICE_ID ?? '__builder__']: 'builder',
}

/** Minimal shape of a Paddle line-item object used to extract the price ID. */
type PaddleLineItem = {
  price?: {
    id?: string
  }
}

function priceIdToPlan(priceId: string): UserPlan | null {
  return PRICE_PLAN_MAP[priceId] ?? null
}

// ─── Signature verification ───────────────────────────────────────────────────

/**
 * Verify Paddle webhook signature.
 * Paddle signs with: HMAC-SHA256(secret, timestamp + ":" + rawBody)
 * Paddle sends header: Paddle-Signature: ts=<timestamp>;h1=<hmac>
 *
 * Returns true if signature is valid, false otherwise.
 */
function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader) return false

  // Parse ts= and h1= from header
  const parts = Object.fromEntries(
    signatureHeader.split(';').map((part) => part.split('=') as [string, string])
  )
  const timestamp = parts['ts']
  const receivedHmac = parts['h1']

  if (!timestamp || !receivedHmac) return false

  // Compute expected HMAC
  const payload = `${timestamp}:${rawBody}`
  const expectedHmac = createHmac('sha256', secret).update(payload).digest('hex')

  // Timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(receivedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    )
  } catch {
    // Buffer length mismatch means definitely not equal
    return false
  }
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body BEFORE parsing — required for signature verification
  let rawBody: string
  try {
    rawBody = await req.text()
  } catch {
    return NextResponse.json({ error: 'Could not read request body.' }, { status: 400 })
  }

  // 2. Verify signature
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] PADDLE_WEBHOOK_SECRET is not set — rejecting all webhook events')
    return NextResponse.json({ error: 'Webhook secret not configured.' }, { status: 500 })
  }

  const signatureHeader = req.headers.get('Paddle-Signature')
  const isValid = verifyPaddleSignature(rawBody, signatureHeader, webhookSecret)

  if (!isValid) {
    console.warn('[webhook] Invalid Paddle signature — rejecting request')
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  // 3. Parse verified event
  let event: Record<string, unknown>
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const eventType = event.event_type as string | undefined
  const data = event.data as Record<string, unknown> | undefined

  console.log(`[webhook] Received verified event: ${eventType}`)

  // 4. Route by event type
  try {
    switch (eventType) {
      case 'subscription.activated':
      case 'subscription.updated': {
        await handleSubscriptionChange(data, 'active')
        break
      }

      case 'subscription.canceled':
      case 'subscription.paused': {
        await handleSubscriptionChange(data, 'canceled')
        break
      }

      case 'transaction.completed': {
        await handleTransactionCompleted(data)
        break
      }

      default:
        // Unhandled events: acknowledge receipt but take no action
        console.log(`[webhook] Unhandled event type: ${eventType} — ignoring`)
        break
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[webhook] Error processing event:', err instanceof Error ? err.message : 'unknown')
    // Return 200 to prevent Paddle retrying — the error is logged for investigation
    return NextResponse.json({ received: true, warning: 'Event processing error' })
  }
}

// ─── Event handlers ───────────────────────────────────────────────────────────

async function handleSubscriptionChange(
  data: Record<string, unknown> | undefined,
  action: 'active' | 'canceled'
) {
  if (!data) return

  const customData = data.custom_data as Record<string, string> | null | undefined
  const userId = customData?.user_id

  if (!userId) {
    console.warn('[webhook] subscription event missing custom_data.user_id — skipping')
    return
  }

  const customerId = data.customer_id as string | undefined
  const subscriptionId = data.id as string | undefined

  if (action === 'canceled') {
    // Downgrade to free on cancellation
    await updateUserPlan(userId, 'free', customerId, subscriptionId)
    console.log(`[webhook] Downgraded user ${userId} to free (subscription canceled)`)
    return
  }

  // Determine plan from items
  const items = data.items as Array<Record<string, unknown>> | undefined
  const priceId = (items?.[0] as PaddleLineItem | undefined)?.price?.id

  if (!priceId) {
    console.warn('[webhook] subscription event missing price ID — skipping')
    return
  }

  const plan = priceIdToPlan(priceId)
  if (!plan) {
    console.warn(`[webhook] Unknown price ID: ${priceId} — skipping`)
    return
  }

  await updateUserPlan(userId, plan, customerId, subscriptionId)
  console.log(`[webhook] Upgraded user ${userId} to plan: ${plan}`)
}

async function handleTransactionCompleted(data: Record<string, unknown> | undefined) {
  if (!data) return

  const customData = data.custom_data as Record<string, string> | null | undefined
  const userId = customData?.user_id

  if (!userId) {
    console.warn('[webhook] transaction.completed missing custom_data.user_id — skipping')
    return
  }

  const customerId = data.customer_id as string | undefined

  // Get plan from items
  const items = data.items as Array<Record<string, unknown>> | undefined
  const priceId = (items?.[0] as PaddleLineItem | undefined)?.price?.id

  if (!priceId) {
    console.warn('[webhook] transaction.completed missing price ID — skipping')
    return
  }

  const plan = priceIdToPlan(priceId)
  if (!plan) {
    console.warn(`[webhook] Unknown price ID in transaction: ${priceId} — skipping`)
    return
  }

  // For transaction.completed, we may not have a subscription ID
  await updateUserPlan(userId, plan, customerId, undefined)
  console.log(`[webhook] Set plan via transaction for user ${userId}: ${plan}`)
}
