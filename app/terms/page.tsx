import { PublicLayout } from "@/components/layout/public-layout";

export default function TermsPage() {
  return (
    <PublicLayout>
      <section className="py-24 bg-white min-h-screen">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-8">
            Terms of Service
          </h1>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <p>
              By accessing and using VibeSafe (&quot;Service&quot;), operated by irsSMEX, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">1. Use of Service</h2>
            <p>
              VibeSafe provides an automated AI security scanning tool designed to identify potential vulnerabilities in software repositories. You must be at least 18 years old to use the Service. You agree to use the Service only for lawful purposes and in compliance with all applicable local, state, national, and international laws.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">2. Account Responsibility & GitHub Authorization</h2>
            <p>
              To use VibeSafe, you must authenticate using your GitHub account. By doing so, you authorize VibeSafe to read the repositories you select. You are solely responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">3. Security Scan Limitations & Disclaimer</h2>
            <p>
              <strong>VibeSafe is a security assistance tool, not a guarantee that your software is fully secure.</strong> While we strive to provide accurate and actionable security guidance, automated scanning cannot detect all possible vulnerabilities. You acknowledge that relying on VibeSafe does not replace professional security auditing, and we are not liable for any security breaches, data loss, or damages resulting from undetected vulnerabilities.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">4. Paid Plans and Billing</h2>
            <p>
              Certain features of VibeSafe are available only under paid subscription plans. All payments are securely processed by our Merchant of Record, Paddle. By subscribing, you agree to Paddle’s terms of service and billing policies. Subscriptions automatically renew unless canceled prior to the renewal date.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">5. Acceptable Use</h2>
            <p>
              You agree not to misuse the Service. This includes, but is not limited to: attempting to bypass rate limits, attempting to reverse engineer the scanning engine, using the Service to scan codebases you do not own or lack authorization to scan, or using the Service to facilitate malicious activities.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">6. Service Availability & Termination</h2>
            <p>
              We reserve the right to modify, suspend, or discontinue the Service at any time without prior notice. We may terminate or suspend your account immediately if you breach these Terms of Service.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">7. Contact</h2>
            <p>
              If you have any questions regarding these Terms of Service, please contact us at: <a href="mailto:support@irssmex.com" className="text-indigo-600 hover:underline">support@irssmex.com</a>.
            </p>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
