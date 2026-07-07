'use client'

import Script from 'next/script'
import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, Loader2, RotateCw } from 'lucide-react'

type PaddleEnvironment = 'sandbox' | 'production'

type PaddleEvent = {
  name?: string
}

type PaddleCheckoutOptions = {
  transactionId: string
  settings?: {
    displayMode?: 'overlay'
    theme?: 'dark' | 'light'
    successUrl?: string
  }
}

declare global {
  interface Window {
    Paddle?: {
      Environment?: {
        set: (environment: PaddleEnvironment) => void
      }
      Initialize: (options: {
        token: string
        eventCallback?: (event: PaddleEvent) => void
      }) => void
      Checkout: {
        open: (options: PaddleCheckoutOptions) => void
      }
    }
  }
}

interface PayClientProps {
  transactionId: string
  environment: PaddleEnvironment
}

function isCompletionEvent(eventName: string | undefined) {
  const normalizedName = eventName?.toLowerCase() ?? ''
  return (
    normalizedName.includes('checkout.completed') ||
    normalizedName.includes('checkout.complete') ||
    normalizedName.includes('transaction.completed') ||
    normalizedName.includes('transaction.paid')
  )
}

export function PayClient({ transactionId, environment }: PayClientProps) {
  const openedRef = useRef(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const openCheckout = useCallback(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN

    if (!token) {
      setStatus('error')
      setError('Paddle Checkout is not configured. Please contact support.')
      return
    }

    if (!window.Paddle) {
      setStatus('error')
      setError('Paddle Checkout failed to load. Please refresh and try again.')
      return
    }

    if (openedRef.current) return
    openedRef.current = true

    try {
      if (environment === 'sandbox') {
        window.Paddle.Environment?.set('sandbox')
      }

      window.Paddle.Initialize({
        token,
        eventCallback: (event) => {
          if (isCompletionEvent(event.name)) {
            window.location.href = '/settings?checkout=success'
          }
        },
      })

      window.Paddle.Checkout.open({
        transactionId,
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          successUrl: `${window.location.origin}/settings?payment=pending`,
        },
      })

      setStatus('ready')
      setError(null)
    } catch {
      openedRef.current = false
      setStatus('error')
      setError('Could not open Paddle Checkout. Please refresh and try again.')
    }
  }, [environment, transactionId])

  const handleRetry = () => {
    openedRef.current = false
    setStatus('loading')
    setError(null)
    openCheckout()
  }

  return (
    <div className="p-6 sm:p-7">
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={openCheckout}
        onError={() => {
          setStatus('error')
          setError('Paddle Checkout failed to load. Please refresh and try again.')
        }}
      />

      {status !== 'error' ? (
        <div className="rounded-xl border border-cc-border bg-cc-secondary p-5">
          <div className="flex items-start gap-3">
            <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-cc-muted" />
            <div>
              <p className="text-sm font-semibold text-cc-text">
                {status === 'ready' ? 'Checkout window opened' : 'Preparing checkout'}
              </p>
              <p className="mt-1 text-xs leading-5 text-cc-muted">
                If the Paddle window does not appear, allow pop-ups for this site or
                use the button below to retry.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
            <div>
              <p className="text-sm font-semibold text-red-200">
                Could not open checkout
              </p>
              <p className="mt-1 text-xs leading-5 text-red-100/75">{error}</p>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleRetry}
        className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-5 text-sm font-semibold text-cc-text transition-colors hover:bg-cc-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <RotateCw className="h-4 w-4" />
        Open Paddle checkout
      </button>
    </div>
  )
}
