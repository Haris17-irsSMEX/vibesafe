import { redirect } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle,
  Settings,
  ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AccountCard } from '@/components/billing/AccountCard'
import { GitHubCard } from '@/components/billing/GitHubCard'
import { PlanCard } from '@/components/billing/PlanCard'
import { UsageCard } from '@/components/billing/UsageCard'
import { SurfaceCard } from '@/components/dashboard/dashboard-ui'
import {
  AppPageContainer,
  AppPageHeader,
  AppSectionHeader,
} from '@/components/layout/app-page'
import { ServerDashboardLayout } from '@/components/layout/server-dashboard-layout'
import { supportEmail } from '@/lib/brand'
import {
  getGitHubLoginForUser,
  getUserCompletedScanCount,
  getUserProfile,
  getUserScanCount,
  upsertUserProfile,
} from '@/lib/db/users'
import { getPlanLabel } from '@/lib/plan-label'

interface SettingsPageProps {
  searchParams: { upgraded?: string; error?: string }
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const supabase = createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  let profile = await getUserProfile(user.id)
  if (!profile) {
    await upsertUserProfile(user.id, user.email ?? null)
    profile = await getUserProfile(user.id)
  }

  const [totalScans, completedScans, githubConnection] = await Promise.all([
    getUserScanCount(user.id),
    getUserCompletedScanCount(user.id),
    getGitHubLoginForUser(user.id),
  ])

  const plan = profile?.plan ?? 'free'
  const planLabel = getPlanLabel(plan)
  const justUpgraded = searchParams.upgraded === '1'

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="wide" className="space-y-8">
        <AppPageHeader
          title="Settings"
          description="Manage account, repository access, usage, and billing."
          icon={<Settings className="h-5 w-5" />}
        />

        {justUpgraded && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4"
          >
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Plan upgraded successfully!
              </p>
              <p className="mt-1 text-sm text-emerald-300/90">
                Your new plan benefits are now active for future reviews and premium findings.
              </p>
            </div>
          </div>
        )}

        {searchParams.error && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-400">Billing error</p>
              <p className="mt-1 text-sm text-red-300/90">
                {searchParams.error === 'checkout_failed'
                  ? 'Failed to start checkout process.'
                  : searchParams.error}
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-8 xl:grid-cols-12">
          <div className="space-y-8 xl:col-span-7">
            <section aria-labelledby="plan-section-heading">
              <AppSectionHeader
                title="Plan and billing"
                description="Review your current access level, daily review allowance, and billing actions."
              />
              <PlanCard
                currentPlan={plan}
                paddleCustomerId={profile?.paddle_customer_id ?? null}
                planUpdatedAt={profile?.plan_updated_at ?? null}
              />
            </section>

            <section aria-labelledby="usage-section-heading">
              <AppSectionHeader
                title="Usage"
                description="Live scan counts from your account history, plus the real daily allowance for your active plan."
              />
              <UsageCard
                totalScans={totalScans}
                completedScans={completedScans}
                plan={plan}
              />
            </section>
          </div>

          <div className="space-y-8 xl:col-span-5">
            <section aria-labelledby="account-section-heading">
              <AppSectionHeader
                title="Account"
                description="Identity, membership, and current workspace access details."
              />
              <AccountCard
                email={user.email ?? profile?.email ?? null}
                createdAt={profile?.created_at ?? null}
                planLabel={planLabel}
                githubLogin={githubConnection?.login ?? null}
              />
            </section>

            <section aria-labelledby="github-section-heading">
              <AppSectionHeader
                title="GitHub integration"
                description="Repository connection state and the actions available on your current GitHub link."
              />
              <GitHubCard
                connected={githubConnection !== null}
                githubLogin={githubConnection?.login ?? null}
                connectedAt={githubConnection?.connectedAt ?? null}
              />
            </section>

            <section aria-labelledby="security-notes-heading">
              <AppSectionHeader
                title="Security and access notes"
                description="Operational notes about billing, repository access, and support."
              />
              <SurfaceCard className="p-6">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cc-border bg-cc-surface-raised text-cc-muted">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                  <div className="space-y-3 text-sm leading-6 text-cc-muted">
                    <p>
                      Billing is handled through Paddle using your existing checkout and portal flow. Repository access is managed through GitHub OAuth and used only for repo review workflows.
                    </p>
                    <p>
                      Need help with account access or billing? Contact{' '}
                      <a
                        href={`mailto:${supportEmail}`}
                        className="text-cc-text underline decoration-white/20 underline-offset-4 hover:decoration-white/50"
                      >
                        {supportEmail}
                      </a>
                      .
                    </p>
                  </div>
                </div>
              </SurfaceCard>
            </section>
          </div>
        </div>
      </AppPageContainer>
    </ServerDashboardLayout>
  )
}
