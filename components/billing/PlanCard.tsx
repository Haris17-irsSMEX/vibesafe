'use client'

import { useState } from 'react'
import type { ButtonHTMLAttributes, ElementType } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Crown,
  ExternalLink,
  Loader2,
  ShieldCheck,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { UserPlan } from '@/lib/db/users'
import { formatSafeDate } from '@/lib/date'
import { getPlanLabel } from '@/lib/plan-label'
import { getPricingPlanForUserPlan } from '@/lib/pricing'
import { GlowCard } from '@/components/ui/glow-card'
import { cn } from '@/lib/utils'

type PlanDetails = {
  icon: ElementType
  badgeClassName: string
  iconClassName: string
}

const PLAN_DETAILS: Record<UserPlan, PlanDetails> = {
  free: {
    icon: ShieldCheck,
    badgeClassName: 'border-white/10 bg-white/5 text-cc-muted',
    iconClassName: 'border-white/10 bg-cc-bg-secondary text-cc-muted',
  },
  starter: {
    icon: Zap,
    badgeClassName: 'border-white/15 bg-white/8 text-cc-text',
    iconClassName: 'border-white/12 bg-white/6 text-cc-text',
  },
  builder: {
    icon: Crown,
    badgeClassName: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    iconClassName: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
  },
  pro: {
    icon: Crown,
    badgeClassName: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
    iconClassName: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
  },
}

interface PlanCardProps {
  currentPlan: UserPlan
  paddleCustomerId: string | null
  planUpdatedAt: string | null
}

function ActionButton({
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function PlanCard({
  currentPlan,
  paddleCustomerId,
  planUpdatedAt,
}: PlanCardProps) {
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const planVisual = PLAN_DETAILS[currentPlan]
  const planInfo = getPricingPlanForUserPlan(currentPlan)
  const PlanIcon = planVisual.icon
  const isPaid = currentPlan !== 'free'

  const handleUpgrade = (plan: 'starter' | 'builder') => {
    router.push(`/checkout?plan=${plan}`)
  }

  const handleManageBilling = async () => {
    if (portalLoading) return
    setPortalLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/paddle/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await res.json()

      if (!res.ok || !data.portalUrl) {
        setError(data.error ?? 'Billing portal is not available right now.')
        setPortalLoading(false)
        return
      }

      window.open(data.portalUrl, '_blank', 'noopener,noreferrer')
      setPortalLoading(false)
    } catch {
      setError('Network error. Please try again.')
      setPortalLoading(false)
    }
  }

  return (
    <GlowCard className="overflow-hidden rounded-2xl border-cc-border bg-cc-surface">
      <div className="border-b border-cc-border bg-cc-bg-secondary/80 px-6 py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span
              className={cn(
                'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border',
                planVisual.iconClassName
              )}
            >
              <PlanIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cc-subtle">
                Current plan
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-cc-text">
                {getPlanLabel(currentPlan)}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-cc-muted">
                {planInfo.shortDescription}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]',
                planVisual.badgeClassName
              )}
            >
              {getPlanLabel(currentPlan)}
            </span>
            <span className="inline-flex items-center rounded-full border border-cc-border bg-cc-surface px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cc-muted">
              {planInfo.scanAllowanceLabel}
            </span>
            {isPaid && paddleCustomerId && (
              <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-400">
                Billing active
              </span>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-cc-border bg-cc-surface px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
              Plan allowance
            </p>
            <p className="mt-2 text-sm font-medium text-cc-text">
              {planInfo.scanAllowanceLabel}
            </p>
          </div>
          <div className="rounded-xl border border-cc-border bg-cc-surface px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
              Plan active since
            </p>
            <p className="mt-2 text-sm font-medium text-cc-text">
              {isPaid
                ? formatSafeDate(planUpdatedAt, 'Not available')
                : 'Current free access'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cc-subtle">
          Included with {getPlanLabel(currentPlan)}
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {planInfo.features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-3 rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-3 text-sm text-cc-muted"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-3 lg:flex-row">
          {currentPlan === 'free' && (
            <>
              <ActionButton
                id="plan-upgrade-starter-btn"
                onClick={() => handleUpgrade('starter')}
                className="border-white/10 bg-cc-text text-cc-bg hover:bg-white"
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Upgrade to Starter
                </span>
                <ArrowRight className="h-4 w-4" />
              </ActionButton>
              <ActionButton
                id="plan-upgrade-builder-btn"
                onClick={() => handleUpgrade('builder')}
                className="border-cc-border-strong bg-cc-surface-raised text-cc-text hover:bg-cc-surface-hover"
              >
                <span className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-violet-300" />
                  Upgrade to Builder
                </span>
                <ArrowRight className="h-4 w-4" />
              </ActionButton>
            </>
          )}

          {currentPlan === 'starter' && (
            <>
              <ActionButton
                id="plan-upgrade-builder-from-starter-btn"
                onClick={() => handleUpgrade('builder')}
                disabled={portalLoading}
                className="border-cc-border-strong bg-cc-surface-raised text-cc-text hover:bg-cc-surface-hover"
              >
                <span className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-violet-300" />
                  Upgrade to Builder
                </span>
                <ArrowRight className="h-4 w-4" />
              </ActionButton>

              {paddleCustomerId && (
                <ActionButton
                  id="manage-billing-btn"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="border-cc-border bg-cc-bg-secondary text-cc-text hover:bg-cc-surface-hover"
                >
                  <span className="flex items-center gap-2">
                    {portalLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    Manage billing
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </ActionButton>
              )}
            </>
          )}

          {(currentPlan === 'builder' || currentPlan === 'pro') && paddleCustomerId && (
            <ActionButton
              id="manage-billing-btn-builder"
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="border-cc-border bg-cc-bg-secondary text-cc-text hover:bg-cc-surface-hover lg:max-w-xs"
            >
              <span className="flex items-center gap-2">
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage billing
              </span>
              <ArrowRight className="h-4 w-4" />
            </ActionButton>
          )}
        </div>
      </div>
    </GlowCard>
  )
}
