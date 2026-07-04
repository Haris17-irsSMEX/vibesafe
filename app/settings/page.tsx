import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getUserProfile,
  upsertUserProfile,
  getUserScanCount,
  getUserCompletedScanCount,
  getGitHubLoginForUser,
} from '@/lib/db/users'
import { ServerDashboardLayout } from '@/components/layout/server-dashboard-layout'
import { PlanCard } from '@/components/billing/PlanCard'
import { UsageCard } from '@/components/billing/UsageCard'
import { AccountCard } from '@/components/billing/AccountCard'
import { GitHubCard } from '@/components/billing/GitHubCard'
import { Settings, CheckCircle, AlertTriangle } from 'lucide-react'
import { AppPageContainer, AppPageHeader } from '@/components/layout/app-page'

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
    <ServerDashboardLayout>
      <AppPageContainer size="narrow">
        <AppPageHeader
          title="Settings"
          description="Manage your account, plan, billing, and integrations."
          icon={<Settings className="h-5 w-5" />}
        />

        {/* Alerts */}
        {justUpgraded && (
          <div
            role="status"
            className="mb-8 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 shadow-sm"
          >
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Plan upgraded successfully!
              </p>
              <p className="mt-1 text-sm text-emerald-400/80">
                Your new plan benefits are now active. Enjoy full access to all findings and AI features.
              </p>
            </div>
          </div>
        )}

        {searchParams.error && (
          <div
            role="alert"
            className="mb-8 flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4 shadow-sm"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-400">Billing Error</p>
              <p className="mt-1 text-sm text-red-400/80">
                {searchParams.error === 'checkout_failed' ? 'Failed to start checkout process.' : searchParams.error}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* ── Plan & Billing ── */}
            <section aria-labelledby="plan-section-heading">
              <h2
                id="plan-section-heading"
                className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"
              >
                Plan &amp; Billing
                <div className="h-px flex-1 bg-white/5" />
              </h2>
              <PlanCard
                currentPlan={plan}
                paddleCustomerId={profile?.paddle_customer_id ?? null}
                planUpdatedAt={profile?.plan_updated_at ?? null}
              />
            </section>
          </div>

          <div className="space-y-8">
            {/* ── Scan Usage ── */}
            <section aria-labelledby="usage-section-heading">
              <h2
                id="usage-section-heading"
                className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"
              >
                Usage
                <div className="h-px flex-1 bg-white/5" />
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
                className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"
              >
                Account
                <div className="h-px flex-1 bg-white/5" />
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
                className="mb-4 text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"
              >
                Integrations
                <div className="h-px flex-1 bg-white/5" />
              </h2>
              <GitHubCard
                connected={githubConnection !== null}
                githubLogin={githubConnection?.login ?? null}
                connectedAt={githubConnection?.connectedAt ?? null}
              />
            </section>
          </div>
        </div>
      </AppPageContainer>
    </ServerDashboardLayout>
  )
}
