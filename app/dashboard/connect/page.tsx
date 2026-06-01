/**
 * /dashboard/connect
 *
 * Repository authorization page.
 * Shows GitHub connection status.
 * Uses a separate GitHub OAuth flow — NOT Supabase Auth.
 */

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConnectPageClient } from './ConnectPageClient'

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  // Server-side auth guard
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Check if GitHub is already connected
  const { data: connection } = await supabase
    .from('connected_repos')
    .select('github_login, connected_at, token_scope')
    .eq('user_id', user.id)
    .maybeSingle()

  return (
    <DashboardLayout>
      <ConnectPageClient
        isConnected={!!connection}
        githubLogin={connection?.github_login ?? null}
        connectedAt={connection?.connected_at ?? null}
        successParam={searchParams.success ?? null}
        errorParam={searchParams.error ?? null}
      />
    </DashboardLayout>
  )
}
