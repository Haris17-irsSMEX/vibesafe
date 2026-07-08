import { PublicLayout } from "@/components/layout/public-layout";

export default function RefundPage() {
  return (
    <PublicLayout>
      <section className="py-24 bg-white min-h-screen">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-8">
            Refund Policy
          </h1>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <p>
              At CtrlCode (operated by irsSMEX), we want billing, cancellation, and refund handling to be clear. This policy explains how subscription cancellations and eligible refund or withdrawal requests are handled for CtrlCode purchases.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">1. Payment Processing</h2>
            <p>
              CtrlCode is sold through Paddle, our merchant of record. All payments for CtrlCode premium plans (Starter and Builder) are securely processed by Paddle. Paddle acts as the reseller of our services, and your transaction is officially with Paddle.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">2. Subscription Cancellations</h2>
            <p>
              Customers can cancel subscriptions at any time through Paddle using the receipt or manage subscription link provided after purchase, or through the billing area in their CtrlCode settings page when available. Cancellation prevents future renewals. Access to paid features may continue until the end of the current billing period unless Paddle or applicable law determines otherwise.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">3. Refund Requests</h2>
            <p>
              Eligible refund, cancellation, or withdrawal requests are handled according to the <a href="https://www.paddle.com/legal/buyer-terms" className="text-indigo-600 hover:underline">Paddle Buyer Terms</a> and <a href="https://www.paddle.com/legal/refund-policy" className="text-indigo-600 hover:underline">Paddle Refund Policy</a>. Customers may request cancellation or refund within 14 days of purchase where applicable under Paddle Buyer Terms or consumer law.
            </p>
            <p>
              Refund eligibility can depend on the buyer’s location, product use, applicable consumer law, and Paddle policies. Paddle may issue refunds in certain cases, including chargeback-risk situations, according to Paddle policies and without requiring additional consent from CtrlCode where Paddle determines a refund is appropriate. Taxes and refund timing are handled by Paddle where applicable.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">4. Contacting Support</h2>
            <p>
              For refund or billing help, customers can contact Paddle through the receipt or manage subscription link sent after purchase. Customers can also contact CtrlCode support at <a href="mailto:irssmex@gmail.com" className="text-indigo-600 hover:underline">irssmex@gmail.com</a>. When contacting support, please include your account email and a brief explanation of the billing issue so we can help route the request.
            </p>
            <p>
              Contact: <a href="mailto:irssmex@gmail.com" className="text-indigo-600 hover:underline">irssmex@gmail.com</a>
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
