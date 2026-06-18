import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getUserProfile,
  upsertUserProfile,
  getUserScanCount,
  getUserCompletedScanCount,
  getGitHubLoginForUser,
} from '@/lib/db/users'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { PlanCard } from '@/components/billing/PlanCard'
import { UsageCard } from '@/components/billing/UsageCard'
import { AccountCard } from '@/components/billing/AccountCard'
import { GitHubCard } from '@/components/billing/GitHubCard'
import { Settings, CheckCircle } from 'lucide-react'

interface SettingsPageProps {
  searchParams: { upgraded?: string; error?: string }
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  // 1. Verify session
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Load/provision user profile
  let profile = await getUserProfile(user.id)
  if (!profile) {
    await upsertUserProfile(user.id, user.email ?? null)
    profile = await getUserProfile(user.id)
  }

  // 3. Load all page data in parallel (safe — errors return defaults)
  const [totalScans, completedScans, githubConnection] = await Promise.all([
    getUserScanCount(user.id),
    getUserCompletedScanCount(user.id),
    getGitHubLoginForUser(user.id),
  ])

  const plan = profile?.plan ?? 'free'
  const justUpgraded = searchParams.upgraded === '1'

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl">
        {/* Page header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900">
            <Settings className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <p className="text-sm text-slate-500">Manage your account, plan, and billing.</p>
          </div>
        </div>

        {/* Alerts */}
        {justUpgraded && (
          <div
            role="status"
            className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm"
          >
            <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Plan upgraded successfully!
              </p>
              <p className="text-sm text-emerald-700">
                Your new plan benefits are now active. Enjoy full access to all findings.
              </p>
            </div>
          </div>
        )}

        {searchParams.error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 shadow-sm"
          >
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
              <span className="text-sm font-bold text-red-600">!</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-red-900">Billing Error</p>
              <p className="text-sm text-red-700">
                {searchParams.error === 'checkout_failed' ? 'Failed to start checkout process.' : searchParams.error}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* ── Plan & Billing ── */}
          <section aria-labelledby="plan-section-heading">
            <h2
              id="plan-section-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Plan &amp; Billing
            </h2>
            <PlanCard
              currentPlan={plan}
              paddleCustomerId={profile?.paddle_customer_id ?? null}
              planUpdatedAt={profile?.plan_updated_at ?? null}
            />
          </section>

          {/* ── Scan Usage ── */}
          <section aria-labelledby="usage-section-heading">
            <h2
              id="usage-section-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Usage
            </h2>
            <UsageCard
              totalScans={totalScans}
              completedScans={completedScans}
              plan={plan}
            />
          </section>

          {/* ── Account ── */}
          <section aria-labelledby="account-section-heading">
            <h2
              id="account-section-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Account
            </h2>
            <AccountCard
              email={user.email ?? profile?.email ?? null}
              createdAt={profile?.created_at ?? new Date().toISOString()}
            />
          </section>

          {/* ── GitHub ── */}
          <section aria-labelledby="github-section-heading">
            <h2
              id="github-section-heading"
              className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400"
            >
              Integrations
            </h2>
            <GitHubCard
              connected={githubConnection !== null}
              githubLogin={githubConnection?.login ?? null}
              connectedAt={githubConnection?.connectedAt ?? null}
            />
          </section>
        </div>
      </div>
    </DashboardLayout>
  )
}
