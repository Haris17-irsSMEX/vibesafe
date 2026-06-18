'use client'

import { useState } from 'react'
import { Lock, Sparkles, Zap, ArrowRight, Loader2 } from 'lucide-react'

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
    <div
      className={`relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 p-6 shadow-sm ${className}`}
      role="region"
      aria-label="Upgrade to unlock full results"
    >
      {/* Decorative blurred glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-300/30 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-violet-300/20 blur-2xl"
      />

      {/* Header */}
      <div className="relative flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
          <Lock className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">
            {context === 'detail'
              ? 'Full analysis locked on Free plan'
              : 'Upgrade to see the full explanation and fix prompt'}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {context === 'detail'
              ? 'Unlock copy-paste fixes for Cursor, Claude, or your IDE.'
              : 'Get complete descriptions, vulnerable code snippets, and AI fix prompts for every finding.'}
          </p>
        </div>
      </div>

      {/* Feature list */}
      <ul className="relative mt-5 space-y-2">
        {[
          'Full issue description & why it matters',
          'Vulnerable code snippet highlighted',
          'AI-generated fix code (copy-paste ready)',
          'Cursor / Claude / IDE fix prompt',
        ].map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
            {item}
          </li>
        ))}
      </ul>

      {/* Error message */}
      {error && (
        <p
          role="alert"
          className="relative mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {/* CTA Buttons */}
      <div className="relative mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          id="upgrade-starter-btn"
          onClick={() => handleUpgrade('starter')}
          disabled={loadingPlan !== null}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-indigo-600 bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
          aria-label="Upgrade to Starter plan"
        >
          {loadingPlan === 'starter' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Upgrade to Starter
          {loadingPlan !== 'starter' && <ArrowRight className="h-4 w-4" />}
        </button>

        <button
          id="upgrade-builder-btn"
          onClick={() => handleUpgrade('builder')}
          disabled={loadingPlan !== null}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-violet-600 bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-60"
          aria-label="Upgrade to Builder plan"
        >
          {loadingPlan === 'builder' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Upgrade to Builder
          {loadingPlan !== 'builder' && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
