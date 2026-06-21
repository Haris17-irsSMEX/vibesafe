/**
 * POST /api/scans/create
 *
 * Creates a new scan record for a repository.
 * - Verifies Supabase session (user_id from session only)
 * - Verifies GitHub connection exists for the user
 * - Validates request body
 * - Creates scan with status='pending'
 * - Does NOT start file fetching or analysis (deferred to next phase)
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createScanForRepo } from '@/lib/db/scans'

interface CreateScanBody {
  repoId: number
  repoName: string
  repoFullName: string
  repoUrl: string
  defaultBranch: string
}

function validateBody(body: unknown): body is CreateScanBody {
  if (typeof body !== 'object' || body === null) return false
  const b = body as Record<string, unknown>
  return (
    typeof b.repoId === 'number' &&
    b.repoId > 0 &&
    typeof b.repoName === 'string' &&
    b.repoName.length > 0 &&
    b.repoName.length <= 200 &&
    typeof b.repoFullName === 'string' &&
    b.repoFullName.length > 0 &&
    b.repoFullName.length <= 400 &&
    typeof b.repoUrl === 'string' &&
    b.repoUrl.startsWith('https://github.com/') &&
    typeof b.defaultBranch === 'string' &&
    b.defaultBranch.length > 0 &&
    b.defaultBranch.length <= 100
  )
}

export async function POST(request: NextRequest) {
  // 1. Verify Supabase session — derive user_id from session
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json(
      { success: false, error: 'You must be signed in.' },
      { status: 401 }
    )
  }

  // 2. Parse and validate request body
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    )
  }

  if (!validateBody(body)) {
    return NextResponse.json(
      { success: false, error: 'Invalid or missing repository details.' },
      { status: 400 }
    )
  }

  // 3. Verify GitHub connection exists for this user
  const adminClient = createSupabaseAdminClient()

  const { data: connection, error: connError } = await adminClient
    .from('connected_repos')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (connError || !connection) {
    return NextResponse.json(
      {
        success: false,
        error: 'GitHub connection expired. Please reconnect GitHub from the Connect page.',
      },
      { status: 403 }
    )
  }

  // 4. Create scan record
  const result = await createScanForRepo({
    userId: user.id,
    repoFullName: body.repoFullName,
    repoName: body.repoName,
    repoUrl: body.repoUrl,
    defaultBranch: body.defaultBranch,
  })

  if (!result.ok) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    scanId: result.scanId,
  })
}
