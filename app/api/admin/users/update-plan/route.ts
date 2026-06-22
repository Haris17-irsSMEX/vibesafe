/**
 * app/api/admin/users/update-plan/route.ts
 *
 * ADMIN-ONLY API route to manually override a user's plan for testing.
 * Supports both JSON body (fetch) and FormData (form submit from admin UI).
 *
 * SECURITY:
 *  - Requires an authenticated session
 *  - Caller's email must be in ADMIN_EMAILS env var (server-side check)
 *  - Only allowed plans: free, starter, builder, pro
 *  - Never callable by non-admin users — 403 on any unauthorized access
 *  - Does NOT touch Paddle webhooks or subscription state
 *  - For internal testing only
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'
import { adminUpdateUserPlan, isAllowedPlan } from '@/lib/db/admin-stats'

export async function POST(request: NextRequest) {
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

    // 3. Parse body — support both JSON and FormData
    let userId: string | undefined
    let plan: string | undefined

    const contentType = request.headers.get('content-type') ?? ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      userId = body.userId
      plan = body.plan
    } else {
      // FormData (from admin UI form submit)
      const formData = await request.formData()
      userId = formData.get('userId')?.toString()
      plan = formData.get('plan')?.toString()
    }

    if (!userId || !plan) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, plan' },
        { status: 400 }
      )
    }

    if (!isAllowedPlan(plan)) {
      return NextResponse.json(
        { error: `Invalid plan. Allowed: free, starter, builder, pro` },
        { status: 400 }
      )
    }

    // 4. Apply plan override
    const result = await adminUpdateUserPlan(userId, plan)

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // 5. For FormData requests (form submits), redirect back to admin panel
    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    return NextResponse.json({
      ok: true,
      message: `Plan updated to '${plan}' for user ${userId}`,
    })
  } catch (err) {
    console.error('[admin/update-plan] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
