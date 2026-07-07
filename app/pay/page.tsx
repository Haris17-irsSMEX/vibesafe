import Link from 'next/link'
import { AlertTriangle, Lock } from 'lucide-react'
import { PublicLayout } from '@/components/layout/public-layout'
import { PayClient } from './PayClient'

interface PayPageProps {
  searchParams: {
    _ptxn?: string
  }
}

function getPaddleEnvironment(): 'sandbox' | 'production' {
  const environment = process.env.PADDLE_ENVIRONMENT ?? 'sandbox'
  return environment === 'sandbox' ? 'sandbox' : 'production'
}

export default function PayPage({ searchParams }: PayPageProps) {
  const transactionId = searchParams._ptxn

  return (
    <PublicLayout>
      <main className="relative min-h-[72vh] overflow-hidden bg-cc-bg px-5 py-16 sm:px-6 sm:py-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.065),transparent_65%)]"
        />

        <div className="relative mx-auto max-w-xl">
          {!transactionId ? (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-7 text-center sm:p-10">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-cc-text">
                Payment session missing
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-red-100/75">
                This payment link is missing its Paddle transaction ID. Choose a plan
                again to create a fresh secure checkout session.
              </p>
              <Link
                href="/pricing"
                className="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-cc-text px-6 text-sm font-semibold text-cc-bg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                Back to pricing
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-cc-border-strong bg-cc-surface shadow-[0_24px_70px_rgba(0,0,0,0.25)]">
              <div className="border-b border-cc-border bg-cc-secondary p-7 text-center sm:p-9">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-cc-border bg-cc-surface-raised text-cc-muted">
                  <Lock className="h-5 w-5" />
                </span>
                <h1 className="mt-6 text-2xl font-semibold tracking-[-0.03em] text-cc-text">
                  Opening secure payment
                </h1>
                <p className="mt-3 text-sm leading-6 text-cc-muted">
                  CtrlCode is opening Paddle Checkout for your transaction. Your plan
                  updates only after Paddle confirms payment through the webhook.
                </p>
              </div>

              <PayClient
                transactionId={transactionId}
                environment={getPaddleEnvironment()}
              />
            </div>
          )}
        </div>
      </main>
    </PublicLayout>
  )
}
