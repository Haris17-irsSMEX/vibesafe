/**
 * /dashboard/connect
 *
 * Repository authorization page.
 * Server component: loads connection + repo data server-side.
 * Token is decrypted and used server-side only — never sent to client.
 */

import { Suspense } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getConnectedRepositories } from '@/services/github/getConnectedRepositories'
import { ConnectPageClient } from './ConnectPageClient'

async function ConnectDataFetcher({
  successParam,
  errorParam,
}: {
  successParam: string | null
  errorParam: string | null
}) {
  const data = await getConnectedRepositories()

  return (
    <ConnectPageClient
      connected={data.connected}
      githubLogin={data.githubLogin}
      connectedAt={data.connectedAt}
      repositories={data.repositories}
      repoError={data.error}
      successParam={successParam}
      errorParam={errorParam}
    />
  )
}

import { RepoListSkeleton, Skeleton } from '@/components/ui/skeletons'

function ConnectSkeleton() {
  return (
    <div className="max-w-5xl animate-pulse">
      <div className="mb-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-2 h-4 w-96" />
      </div>
      <div className="rounded-xl border border-white/5 bg-card p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
      <div className="mt-8">
        <div className="mb-6 flex justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-64" />
        </div>
        <RepoListSkeleton />
      </div>
    </div>
  )
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: { success?: string; error?: string }
}) {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return (
    <DashboardLayout>
      <Suspense fallback={<ConnectSkeleton />}>
        <ConnectDataFetcher
          successParam={searchParams.success ?? null}
          errorParam={searchParams.error ?? null}
        />
      </Suspense>
    </DashboardLayout>
  )
}
