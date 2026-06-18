import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function DashboardLoading() {
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl animate-pulse">
        {/* Header Skeleton */}
        <div className="mb-8 flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-slate-200"></div>
          <div className="space-y-2">
            <div className="h-6 w-48 rounded bg-slate-200"></div>
            <div className="h-4 w-64 rounded bg-slate-200"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-6">
          <div className="h-32 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="h-5 w-32 rounded bg-slate-200"></div>
            <div className="mt-4 flex gap-4">
              <div className="h-10 w-24 rounded-lg bg-slate-100"></div>
              <div className="h-10 w-24 rounded-lg bg-slate-100"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-64 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="h-5 w-40 rounded bg-slate-200"></div>
              <div className="mt-6 space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded bg-slate-100"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-full rounded bg-slate-100"></div>
                      <div className="h-3 w-2/3 rounded bg-slate-100"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-64 rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="h-5 w-32 rounded bg-slate-200"></div>
              <div className="mt-6 space-y-3">
                <div className="h-8 w-full rounded bg-slate-100"></div>
                <div className="h-8 w-3/4 rounded bg-slate-100"></div>
                <div className="h-8 w-5/6 rounded bg-slate-100"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
