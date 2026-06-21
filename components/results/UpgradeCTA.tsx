'use client'

import { useState } from 'react'
import { Lock, Sparkles, Zap, ArrowRight, Loader2 } from 'lucide-react'
import { GlowCard } from '@/components/ui/glow-card'
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
    <GlowCard
      glowColor="rgba(124, 58, 237, 0.15)"
      className={cn("relative overflow-hidden p-8 border-primary/20 bg-primary/5", className)}
      role="region"
      aria-label="Upgrade to unlock full results"
    >
      {/* Decorative blurred glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-500/20 blur-3xl"
      />

      {/* Header */}
      <div className="relative flex flex-col md:flex-row md:items-start gap-8">
        <div className="flex-1">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 shadow-inner">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">
                {context === 'detail'
                  ? 'Full analysis locked on Free plan'
                  : 'Unlock the full power of AI Security Analysis'}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {context === 'detail'
                  ? 'Upgrade to unlock detailed vulnerability descriptions, code snippets, and copy-paste fixes for your IDE.'
                  : 'Free tier limits findings to basic metadata. Upgrade to get complete descriptions, vulnerable code snippets, and AI fix prompts for every finding.'}
              </p>
            </div>
          </div>

          {/* Feature list */}
          <ul className="relative mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              'Full issue description & why it matters',
              'Vulnerable code snippet highlighted',
              'AI-generated fix code (copy-paste ready)',
              'Cursor / Claude / IDE fix prompt',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-sm text-zinc-300">
                <Sparkles className="h-4 w-4 shrink-0 text-primary" />
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

        {/* CTA Buttons */}
        <div className="relative flex flex-col gap-3 shrink-0 md:w-64">
          <button
            id="upgrade-starter-btn"
            onClick={() => handleUpgrade('starter')}
            disabled={loadingPlan !== null}
            className="flex items-center justify-between w-full rounded-xl border border-primary/50 bg-primary/10 px-5 py-3.5 text-sm font-semibold text-primary shadow-sm transition-all hover:bg-primary hover:text-white disabled:pointer-events-none disabled:opacity-50 group"
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
            className="flex items-center justify-between w-full rounded-xl border border-transparent bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)] transition-all hover:bg-primary-hover disabled:pointer-events-none disabled:opacity-50 group"
            aria-label="Upgrade to Builder plan"
          >
            <div className="flex items-center gap-2.5">
              {loadingPlan === 'builder' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Builder Plan
            </div>
            <ArrowRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
        </div>
      </div>
    </GlowCard>
  )
}
