import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/auth/admin'

export async function GET() {
  const supabase = createClient()
  const { data: { session } } = await (await supabase).auth.getSession()

  if (!session?.user?.email) {
    return NextResponse.json({ isAdmin: false })
  }

  const isAdmin = isAdminEmail(session.user.email)

  return NextResponse.json({ isAdmin })
}
