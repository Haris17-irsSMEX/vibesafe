'use client';

import { useState } from 'react';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';

const CHECKOUT_PENDING_APPROVAL_MESSAGE =
  'Secure checkout is processed by Paddle. If checkout does not open, this domain may still be pending Paddle approval.';

export function CheckoutClient({ plan }: { plan: 'starter' | 'builder' }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (!res.ok || !data.checkoutUrl) {
        setError(CHECKOUT_PENDING_APPROVAL_MESSAGE);
        setLoading(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError(CHECKOUT_PENDING_APPROVAL_MESSAGE);
      setLoading(false);
    }
  };

  return (
    <div className="mt-8">
      {error && (
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-xl border border-cc-border bg-cc-secondary p-4 text-sm text-cc-muted"
        >
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cc-text" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-cc-text px-8 text-sm font-semibold text-cc-bg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
        {loading ? 'Preparing secure checkout…' : 'Continue to secure payment'}
      </button>
    </div>
  );
}
