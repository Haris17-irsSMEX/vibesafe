/**
 * /dashboard/connect
 *
 * Repository authorization page.
 * Server component: loads connection + repo data server-side.
 * Token is decrypted and used server-side only — never sent to client.
 */

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getConnectedRepositories } from '@/services/github/getConnectedRepositories'
import { ConnectPageClient } from './ConnectPageClient'

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  // Server-side auth guard
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  // Load connection status + repositories server-side
  // Token decryption happens entirely in this call — never reaches client
  const data = await getConnectedRepositories()

  return (
    <DashboardLayout>
      <ConnectPageClient
        connected={data.connected}
        githubLogin={data.githubLogin}
        connectedAt={data.connectedAt}
        repositories={data.repositories}
        repoError={data.error}
        successParam={searchParams.success ?? null}
        errorParam={searchParams.error ?? null}
      />
    </DashboardLayout>
  )
}
