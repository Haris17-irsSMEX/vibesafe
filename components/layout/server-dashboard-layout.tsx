import { DashboardLayout } from './dashboard-layout'

export async function ServerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>
}
