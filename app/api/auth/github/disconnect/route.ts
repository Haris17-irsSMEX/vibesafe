/**
 * POST /api/auth/github/disconnect
 *
 * Disconnects the current user's GitHub connection.
 * - Verifies Supabase session server-side (user_id never from client)
 * - Deletes the connected_repos row for the authenticated user
 * - POST only — no GET destructive action
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  // 1. Verify Supabase session — derive user_id from session only
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Delete using service role to bypass RLS — user_id comes from session
    const adminClient = createSupabaseAdminClient()

    const { error: deleteError } = await adminClient
      .from('connected_repos')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('[disconnect] DB delete error:', deleteError.message)
      return NextResponse.json(
        { error: 'Failed to disconnect GitHub account' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[disconnect] Unexpected error:', err instanceof Error ? err.message : 'Unknown')
    return NextResponse.json(
      { error: 'Failed to disconnect GitHub account' },
      { status: 500 }
    )
  }
}
