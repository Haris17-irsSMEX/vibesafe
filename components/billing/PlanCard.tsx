'use client'

import { useState } from 'react'
import {
  Zap,
  Sparkles,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ExternalLink,
  Crown,
  ShieldCheck,
} from 'lucide-react'
import type { UserPlan } from '@/lib/db/users'

// ─── Plan feature definitions ────────────────────────────────────────────────

const PLAN_FEATURES: Record<UserPlan, { title: string; description: string; features: string[] }> = {
  free: {
    title: 'Free',
    description: 'Get started with basic security scanning.',
    features: [
      'Unlimited repository scans',
      'Security score & severity counts',
      'Finding names, categories & file paths',
      'CWE identifier per finding',
    ],
  },
  starter: {
    title: 'Starter',
    description: 'Full analysis for solo developers and small projects.',
    features: [
      'Everything in Free',
      'Full issue descriptions & why it matters',
      'Vulnerable code snippets',
      'AI-generated fix code (copy-paste ready)',
      'Cursor, Claude & IDE fix prompts',
    ],
  },
  builder: {
    title: 'Builder',
    description: 'For teams shipping fast and securely at scale.',
    features: [
      'Everything in Starter',
      'Higher scan frequency limits',
      'Priority scanning queue',
      'Team-ready features (coming soon)',
      'Priority support',
    ],
  },
}

const PLAN_STYLES: Record<UserPlan, { badge: string; icon: React.ElementType; gradient: string; border: string }> = {
  free: {
    badge: 'bg-slate-100 text-slate-700 border border-slate-200',
    icon: ShieldCheck,
    gradient: 'from-slate-50 to-white',
    border: 'border-slate-200',
  },
  starter: {
    badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200',
    icon: Zap,
    gradient: 'from-indigo-50/50 to-white',
    border: 'border-indigo-200',
  },
  builder: {
    badge: 'bg-violet-100 text-violet-700 border border-violet-200',
    icon: Crown,
    gradient: 'from-violet-50/50 to-white',
    border: 'border-violet-200',
  },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PlanCardProps {
  currentPlan: UserPlan
  paddleCustomerId: string | null
  planUpdatedAt: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PlanCard({ currentPlan, paddleCustomerId, planUpdatedAt }: PlanCardProps) {
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planInfo = PLAN_FEATURES[currentPlan]
  const planStyle = PLAN_STYLES[currentPlan]
  const PlanIcon = planStyle.icon
  const isPaid = currentPlan !== 'free'

  const handleUpgrade = async (plan: 'starter' | 'builder') => {
    if (upgradeLoading) return
    setUpgradeLoading(plan)
    setError(null)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok || !data.checkoutUrl) {
        setError(data.error ?? 'Failed to start checkout. Please try again.')
        setUpgradeLoading(null)
        return
      }

      window.location.href = data.checkoutUrl
    } catch {
      setError('Network error. Please try again.')
      setUpgradeLoading(null)
    }
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
    <div
      className={`rounded-2xl border bg-gradient-to-br ${planStyle.gradient} ${planStyle.border} overflow-hidden shadow-sm`}
    >
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ${
                currentPlan === 'free'
                  ? 'bg-slate-200'
                  : currentPlan === 'starter'
                  ? 'bg-indigo-600'
                  : 'bg-violet-600'
              }`}
            >
              <PlanIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Current Plan</h2>
              <p className="text-sm text-slate-500">{planInfo.description}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide ${planStyle.badge}`}
          >
            {planInfo.title}
          </span>
        </div>

        {planUpdatedAt && isPaid && (
          <p className="mt-3 text-xs text-slate-400">
            Plan active since {new Date(planUpdatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Features */}
      <div className="px-6 py-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
          Included in {planInfo.title}
        </h3>
        <ul className="space-y-2">
          {planInfo.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
              <CheckCircle2
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  currentPlan === 'free'
                    ? 'text-slate-400'
                    : currentPlan === 'starter'
                    ? 'text-indigo-500'
                    : 'text-violet-500'
                }`}
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 pb-2">
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 pb-6">
        {/* Free: show upgrade buttons */}
        {currentPlan === 'free' && (
          <div className="flex flex-col gap-3 sm:flex-row mt-2">
            <button
              id="plan-upgrade-starter-btn"
              onClick={() => handleUpgrade('starter')}
              disabled={upgradeLoading !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {upgradeLoading === 'starter' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Upgrade to Starter
              {upgradeLoading !== 'starter' && <ArrowRight className="h-4 w-4" />}
            </button>

            <button
              id="plan-upgrade-builder-btn"
              onClick={() => handleUpgrade('builder')}
              disabled={upgradeLoading !== null}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {upgradeLoading === 'builder' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Upgrade to Builder
              {upgradeLoading !== 'builder' && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        )}

        {/* Starter: show upgrade to builder + manage billing */}
        {currentPlan === 'starter' && (
          <div className="flex flex-col gap-3 sm:flex-row mt-2">
            <button
              id="plan-upgrade-builder-from-starter-btn"
              onClick={() => handleUpgrade('builder')}
              disabled={upgradeLoading !== null || portalLoading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700 disabled:opacity-60"
            >
              {upgradeLoading === 'builder' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Crown className="h-4 w-4" />
              )}
              Upgrade to Builder
            </button>

            {paddleCustomerId && (
              <button
                id="manage-billing-btn"
                onClick={handleManageBilling}
                disabled={portalLoading || upgradeLoading !== null}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-60"
              >
                {portalLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Manage Billing
              </button>
            )}
          </div>
        )}

        {/* Builder: show manage billing */}
        {currentPlan === 'builder' && paddleCustomerId && (
          <div className="mt-2">
            <button
              id="manage-billing-btn-builder"
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-60"
            >
              {portalLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
              Manage Billing
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
