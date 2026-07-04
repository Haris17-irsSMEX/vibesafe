import { createClient } from '@/lib/supabase/server';
import { PublicLayout } from '@/components/layout/public-layout';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import { CheckoutClient } from './CheckoutClient';

export default async function CheckoutPage({ searchParams }: { searchParams: { plan?: string } }) {
  const plan = searchParams.plan;
  const isValidPlan = plan === 'starter' || plan === 'builder';

  // Fallback for missing/invalid plan
  if (!isValidPlan) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50 px-6 py-24">
          <ShieldCheck className="h-16 w-16 text-slate-300 mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 text-center">Invalid Plan Selected</h1>
          <p className="mt-2 text-slate-600 text-center">We couldn&apos;t find the plan you were looking for.</p>
          <Link
            href="/pricing"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            View Pricing Plans
          </Link>
        </div>
      </PublicLayout>
    );
  }

  // Auth check
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return (
      <PublicLayout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-50 px-6 py-24">
          <Lock className="h-16 w-16 text-indigo-200 mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 text-center">Sign in to continue your upgrade</h1>
          <p className="mt-2 text-slate-600 text-center">You need a CtrlCode account to checkout securely.</p>
          <Link
            href="/login"
            className="mt-8 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 shadow-md"
          >
            Sign in
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const planName = plan === 'starter' ? 'Starter' : 'Builder';
  const planPrice = plan === 'starter' ? '$29 / month' : '$99 / month';
  const planFeatures = plan === 'starter' 
    ? [
        'Full finding explanations',
        'Suggested fixes & vulnerable code snippets',
        'Copy-paste fix prompts for Cursor/Claude',
        'Higher scan limits'
      ]
    : [
        'Highest scan limits',
        'More serious project usage',
        'Priority scan capacity',
        'Team-ready workflow'
      ];

  return (
    <PublicLayout>
      <div className="min-h-screen bg-slate-50 py-12 md:py-24 px-6">
        <div className="mx-auto max-w-lg">
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-8">
            <ArrowLeft className="h-4 w-4" />
            Back to settings
          </Link>

          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Complete your CtrlCode upgrade
            </h1>
            <p className="mt-2 text-slate-600">
              You are upgrading to the {planName} plan.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl p-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{planName} Plan</h2>
                <p className="text-sm text-slate-500 mt-1">Billed securely via Paddle</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-extrabold text-slate-900">{planPrice.split(' ')[0]}</span>
                <span className="text-sm text-slate-500"> {planPrice.split(' ').slice(1).join(' ')}</span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Benefits unlocked</h3>
              <ul className="space-y-3">
                {planFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 mb-2 flex items-start gap-3">
              <Lock className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <p className="text-xs text-slate-600 leading-relaxed">
                Payments are securely processed by Paddle, our merchant of record. 
                By continuing, you agree to our <Link href="/terms" className="text-indigo-600 hover:underline">Terms</Link> and <Link href="/privacy" className="text-indigo-600 hover:underline">Privacy Policy</Link>.
              </p>
            </div>

            <CheckoutClient plan={plan} />
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
