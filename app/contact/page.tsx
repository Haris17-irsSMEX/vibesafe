import { PublicLayout } from "@/components/layout/public-layout";
import { Mail } from "lucide-react";

export default function ContactPage() {
  return (
    <PublicLayout>
      <section className="py-24 bg-white min-h-[60vh] flex flex-col justify-center">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Contact Us
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 leading-relaxed">
            For product support, billing questions, or security-related inquiries, contact us.
          </p>

          <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
            <div className="flex justify-center mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                <Mail className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">VibeSafe Support</h3>
            <p className="text-sm text-slate-500 mb-6">Operated by irsSMEX</p>
            
            <a
              href="mailto:support@irssmex.com"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-indigo-600 px-8 text-base font-semibold text-white transition-all hover:bg-indigo-700 shadow-md shadow-indigo-200"
            >
              support@irssmex.com
            </a>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
