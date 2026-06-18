import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getUserProfile, getGitHubLoginForUser, getUserScanCount } from "@/lib/db/users"
import { getRecentScansForUser } from "@/lib/db/scans"
import { Shield, GitFork, ArrowRight, Play, CheckCircle, Clock, AlertCircle } from "lucide-react"

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  // Load all data in parallel
  const [profile, githubLogin, scanCount, recentScans] = await Promise.all([
    getUserProfile(user.id),
    getGitHubLoginForUser(user.id),
    getUserScanCount(user.id),
    getRecentScansForUser(user.id, 5),
  ])

  const plan = profile?.plan ?? 'free'
  const isConnected = !!githubLogin

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl">
        {/* Welcome Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Welcome back, {user.email?.split('@')[0]}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Here is an overview of your repository security status.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-600">
              {plan} Plan
            </span>
            {isConnected ? (
              <Link
                href="/dashboard/connect"
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
              >
                <Play className="h-4 w-4" />
                Start Scan
              </Link>
            ) : (
              <Link
                href="/dashboard/connect"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <GitFork className="h-4 w-4" />
                Connect GitHub
              </Link>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isConnected ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                {isConnected ? (
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                ) : (
                  <GitFork className="h-5 w-5 text-slate-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">GitHub Status</p>
                <p className="text-base font-semibold text-slate-900">
                  {isConnected ? `Connected as @${githubLogin.login}` : 'Not Connected'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
                <Shield className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Total Scans</p>
                <p className="text-base font-semibold text-slate-900">
                  {scanCount} scan{scanCount === 1 ? '' : 's'} run
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Scans */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Recent Scans</h2>
          </div>
          
          {recentScans.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentScans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <GitFork className="h-5 w-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{scan.repo_name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(scan.created_at).toLocaleDateString()}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${
                          scan.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          scan.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-indigo-100 text-indigo-700'
                        }`}>
                          {scan.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                          {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/scan/${scan.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <Shield className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-sm font-semibold text-slate-900">No scans yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Connect your GitHub repository to run your first security scan.
              </p>
              {!isConnected && (
                <Link
                  href="/dashboard/connect"
                  className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
                >
                  <GitFork className="h-4 w-4" />
                  Connect Repository
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
