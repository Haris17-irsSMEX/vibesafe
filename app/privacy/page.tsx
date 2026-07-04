import { PublicLayout } from "@/components/layout/public-layout";

export default function PrivacyPage() {
  return (
    <PublicLayout>
      <section className="py-24 bg-white min-h-screen">
        <div className="mx-auto max-w-3xl px-6">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-8">
            Privacy Policy
          </h1>
          <div className="prose prose-slate max-w-none text-slate-600 space-y-6">
            <p><strong>Last Updated:</strong> {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            
            <p>
              Welcome to CtrlCode, operated by irsSMEX. This Privacy Policy describes how we collect, use, and handle your information when you use our security scanning services.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">1. What Data We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Account Information:</strong> Account email, GitHub username, and repository metadata.</li>
              <li><strong>Scan Data:</strong> Selected code files authorized for scanning and the resulting security scan findings.</li>
              <li><strong>Billing Data:</strong> Billing status and plan information (actual payment details are handled securely by Paddle).</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">2. How We Use Data</h2>
            <p>We use the data we collect solely to provide, maintain, and improve the CtrlCode service. This includes:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Authentication and account management.</li>
              <li>Performing AI-driven repository security scans.</li>
              <li>Displaying scan results securely in your dashboard.</li>
              <li>Processing billing and sending account notifications.</li>
              <li>Providing product support.</li>
            </ul>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">3. GitHub Data Authorization</h2>
            <p>
              CtrlCode requires read access to repositories that you explicitly authorize. We read your code strictly to perform automated security scans. We do not write to your repositories, and we do not store your source code permanently beyond the duration of the scan process.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">4. Payment Data</h2>
            <p>
              All payment processing is handled securely by our Merchant of Record, Paddle. CtrlCode does not collect or store your credit card numbers or raw financial data.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">5. Security</h2>
            <p>
              We prioritize the security of your data. All GitHub tokens are securely encrypted and handled server-side. Scan results are private and visible only to the authenticated user who initiated the scan.
            </p>

            <h2 className="text-2xl font-bold text-slate-900 mt-12 mb-4">6. Contact</h2>
            <p>
              If you have any questions or concerns regarding this Privacy Policy, please contact us at: <a href="mailto:irssmex@gmail.com" className="text-indigo-600 hover:underline">irssmex@gmail.com</a>.
            </p>

            <div className="mt-16 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-500">
              <strong>Note:</strong> This page is provided for informational purposes regarding our data handling practices and should not be construed as formal legal advice.
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
