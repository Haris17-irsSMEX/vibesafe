import { ServerDashboardLayout } from '@/components/layout/server-dashboard-layout'
import { DashboardSkeleton } from '@/components/ui/skeletons'

export default function DashboardLoading() {
  return (
    <ServerDashboardLayout>
      <div className="mx-auto w-full max-w-7xl">
        <DashboardSkeleton />
      </div>
    </ServerDashboardLayout>
  )
}
