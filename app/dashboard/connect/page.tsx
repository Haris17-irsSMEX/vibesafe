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

function ConnectSkeleton() {
  return (
    <div className="max-w-4xl animate-pulse">
      <div className="mb-8">
        <div className="h-8 w-48 rounded bg-slate-200"></div>
        <div className="mt-2 h-4 w-96 rounded bg-slate-200"></div>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-slate-200"></div>
          <div className="space-y-2">
            <div className="h-5 w-32 rounded bg-slate-200"></div>
            <div className="h-4 w-48 rounded bg-slate-200"></div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-slate-100"></div>
          ))}
        </div>
        <div className="mt-6 flex gap-3 border-t border-slate-100 pt-5">
          <div className="h-9 w-32 rounded-lg bg-slate-200"></div>
          <div className="h-9 w-32 rounded-lg bg-slate-200"></div>
        </div>
      </div>
      <div className="mt-8">
        <div className="mb-4">
          <div className="h-6 w-40 rounded bg-slate-200"></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"></div>
          ))}
        </div>
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
