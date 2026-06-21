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
import { useRouter } from 'next/navigation'
import type { UserPlan } from '@/lib/db/users'
import { GlowCard } from '@/components/ui/glow-card'
import { cn } from '@/lib/utils'

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

const PLAN_STYLES: Record<UserPlan, { badge: string; icon: React.ElementType; glowColor: string; bgColor: string; borderColor: string }> = {
  free: {
    badge: 'bg-white/5 text-zinc-400 border border-white/10',
    icon: ShieldCheck,
    glowColor: 'rgba(255, 255, 255, 0.05)',
    bgColor: 'bg-card/50',
    borderColor: 'border-white/10',
  },
  starter: {
    badge: 'bg-primary/10 text-primary border border-primary/20 shadow-[0_0_10px_-2px_rgba(124,58,237,0.3)]',
    icon: Zap,
    glowColor: 'rgba(124, 58, 237, 0.15)',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary/20',
  },
  builder: {
    badge: 'bg-violet-500/10 text-violet-400 border border-violet-500/20 shadow-[0_0_10px_-2px_rgba(139,92,246,0.3)]',
    icon: Crown,
    glowColor: 'rgba(139, 92, 246, 0.15)',
    bgColor: 'bg-violet-500/5',
    borderColor: 'border-violet-500/20',
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
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planInfo = PLAN_FEATURES[currentPlan]
  const planStyle = PLAN_STYLES[currentPlan]
  const PlanIcon = planStyle.icon
  const isPaid = currentPlan !== 'free'

  const router = useRouter()

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
    <GlowCard glowColor={planStyle.glowColor} className={cn("p-0 overflow-hidden", planStyle.bgColor, planStyle.borderColor)}>
      {/* Header */}
      <div className="px-6 py-5 border-b border-white/5 bg-black/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border shadow-inner",
                currentPlan === 'free'
                  ? 'bg-white/5 border-white/10'
                  : currentPlan === 'starter'
                  ? 'bg-primary/20 border-primary/30'
                  : 'bg-violet-500/20 border-violet-500/30'
              )}
            >
              <PlanIcon className={cn("h-6 w-6", currentPlan === 'free' ? 'text-zinc-400' : currentPlan === 'starter' ? 'text-primary' : 'text-violet-400')} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Current Plan</h2>
              <p className="text-sm text-muted-foreground">{planInfo.description}</p>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
              planStyle.badge
            )}
          >
            {planInfo.title}
          </span>
        </div>

        {planUpdatedAt && isPaid && (
          <p className="mt-4 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">
            Plan active since {new Date(planUpdatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
      </div>

      {/* Features */}
      <div className="px-6 py-6 bg-card/30">
        <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">
          Included in {planInfo.title}
        </h3>
        <ul className="space-y-3">
          {planInfo.features.map((feature) => (
            <li key={feature} className="flex items-start gap-3 text-sm text-zinc-300">
              <CheckCircle2
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  currentPlan === 'free'
                    ? 'text-zinc-500'
                    : currentPlan === 'starter'
                    ? 'text-primary'
                    : 'text-violet-500'
                )}
              />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 pb-2 bg-card/30">
          <p
            role="alert"
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="px-6 pb-6 bg-card/30">
        {/* Free: show upgrade buttons */}
        {currentPlan === 'free' && (
          <div className="flex flex-col gap-3 sm:flex-row mt-2">
            <button
              id="plan-upgrade-starter-btn"
              onClick={() => handleUpgrade('starter')}
              className="flex flex-1 items-center justify-between w-full rounded-xl border border-primary/50 bg-primary/10 px-5 py-3.5 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary hover:text-white group"
            >
              <div className="flex items-center gap-2.5">
                <Zap className="h-4 w-4" />
                Upgrade to Starter
              </div>
              <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              id="plan-upgrade-builder-btn"
              onClick={() => handleUpgrade('builder')}
              className="flex flex-1 items-center justify-between w-full rounded-xl border border-transparent bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] transition-all hover:bg-violet-700 group"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4" />
                Upgrade to Builder
              </div>
              <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>
          </div>
        )}

        {/* Starter: show upgrade to builder + manage billing */}
        {currentPlan === 'starter' && (
          <div className="flex flex-col gap-3 sm:flex-row mt-2">
            <button
              id="plan-upgrade-builder-from-starter-btn"
              onClick={() => handleUpgrade('builder')}
              disabled={portalLoading}
              className="flex flex-1 items-center justify-between w-full rounded-xl border border-transparent bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_0_20px_-5px_rgba(139,92,246,0.5)] transition-all hover:bg-violet-700 disabled:opacity-50 group"
            >
              <div className="flex items-center gap-2.5">
                <Crown className="h-4 w-4" />
                Upgrade to Builder
              </div>
              <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            {paddleCustomerId && (
              <button
                id="manage-billing-btn"
                onClick={handleManageBilling}
                disabled={portalLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-white/10 disabled:opacity-50"
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
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-white/10 disabled:opacity-50"
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
    </GlowCard>
  )
}
