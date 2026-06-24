import { getAdminStatus } from '@/lib/auth/admin'
import { DashboardLayout } from './dashboard-layout'

export async function ServerDashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await getAdminStatus()
  return <DashboardLayout isAdmin={isAdmin}>{children}</DashboardLayout>
}
