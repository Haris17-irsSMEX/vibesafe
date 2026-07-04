'use client'

import { useState } from 'react'
import { Lock, ShieldCheck, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UpgradeCTAProps {
  /** Context for the CTA message */
  context?: 'overview' | 'detail'
  className?: string
}

export function UpgradeCTA({ context = 'overview', className = '' }: UpgradeCTAProps) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleUpgrade = async (plan: 'starter' | 'builder') => {
    setLoadingPlan(plan)
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
        setLoadingPlan(null)
        return
      }

      // Redirect to Paddle-hosted checkout
      window.location.href = data.checkoutUrl
    } catch {
      setError('Network error. Please try again.')
      setLoadingPlan(null)
    }
  }

  return (
    <section
      className={cn("relative overflow-hidden rounded-2xl border border-cc-border-strong bg-cc-surface p-6 sm:p-7", className)}
      role="region"
      aria-label="Upgrade to unlock full results"
    >
      <div className="relative flex flex-col gap-7 md:flex-row md:items-start">
        <div className="flex-1">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cc-border-strong bg-cc-surface-raised text-cc-muted">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-cc-text">
                {context === 'detail'
                  ? 'Full analysis locked on Free plan'
                  : 'Unlock the complete security analysis'}
              </h3>
              <p className="mt-2 text-sm leading-6 text-cc-muted">
                {context === 'detail'
                  ? 'Unlock vulnerable code, detailed remediation guidance, and an agent-ready fix prompt.'
                  : 'Free results include safe finding metadata. Upgrade for full explanations, evidence, remediation guidance, and AI fix prompts.'}
              </p>
            </div>
          </div>

          <ul className="relative mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              'Full issue description & why it matters',
              'Vulnerable code and evidence',
              'Detailed remediation guidance',
              'Cursor / Codex fix prompt',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-cc-muted">
                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </ul>

          {/* Error message */}
          {error && (
            <p
              role="alert"
              className="relative mt-5 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {error}
            </p>
          )}
        </div>

        <div className="relative flex shrink-0 flex-col gap-3 md:w-64">
          <button
            id="upgrade-starter-btn"
            onClick={() => handleUpgrade('starter')}
            disabled={loadingPlan !== null}
            className="group flex min-h-11 w-full items-center justify-between rounded-lg border border-cc-border-strong bg-cc-surface-raised px-4 text-sm font-semibold text-cc-text outline-none transition-colors hover:bg-cc-surface-hover focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Upgrade to Starter plan"
          >
            <div className="flex items-center gap-2.5">
              {loadingPlan === 'starter' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              Starter Plan
            </div>
            <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>

          <button
            id="upgrade-builder-btn"
            onClick={() => handleUpgrade('builder')}
            disabled={loadingPlan !== null}
            className="group flex min-h-11 w-full items-center justify-between rounded-lg border border-transparent bg-cc-text px-4 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 disabled:pointer-events-none disabled:opacity-50"
            aria-label="Upgrade to Builder plan"
          >
            <div className="flex items-center gap-2.5">
              {loadingPlan === 'builder' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Builder Plan
            </div>
            <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </section>
  )
}
