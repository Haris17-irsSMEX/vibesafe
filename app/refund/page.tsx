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
              At VibeSafe (operated by irsSMEX), we want to ensure you are satisfied with our AI security scanning tools. This policy outlines the conditions under which refunds may be issued.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">1. Payment Processing</h2>
            <p>
              All payments for VibeSafe premium plans (Starter and Builder) are securely processed by our Merchant of Record, Paddle. Paddle acts as the reseller of our services, and your transaction is officially with Paddle.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">2. Subscription Cancellations</h2>
            <p>
              You may cancel your subscription at any time through the billing portal available in your VibeSafe settings. Once canceled, your premium access will remain active until the end of your current billing cycle. Canceling a subscription prevents future charges but does not automatically issue a refund for the current period.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">3. Refund Requests</h2>
            <p>
              If you believe you have been billed in error, or if you are entirely unsatisfied with the service, you may request a refund by emailing us at <a href="mailto:support@irssmex.com" className="text-indigo-600 hover:underline">support@irssmex.com</a>. 
            </p>
            <p>
              Refunds are reviewed on a case-by-case basis. While we aim to be fair and accommodating, we do not guarantee refunds, particularly in cases of heavy service usage, programmatic abuse, or terms of service violations.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">4. Contacting Support</h2>
            <p>
              When requesting a refund, please include your account email and a brief explanation of why you are requesting the refund. This helps us improve VibeSafe for everyone.
            </p>
            <p>
              Contact: <a href="mailto:support@irssmex.com" className="text-indigo-600 hover:underline">support@irssmex.com</a>
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
