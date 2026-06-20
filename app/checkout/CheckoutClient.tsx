'use client';

import { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';

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
        setError(data.error || 'An unexpected error occurred. Please try again.');
        setLoading(false);
        return;
      }

      window.location.href = data.checkoutUrl;
    } catch {
      setError('Could not reach Paddle. Check your internet connection and Paddle environment.');
      setLoading(false);
    }
  };

  return (
    <div className="mt-8">
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 text-base font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-70 shadow-md"
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-5 w-5" />}
        {loading ? 'Preparing secure checkout...' : 'Continue to secure payment'}
      </button>
    </div>
  );
}
