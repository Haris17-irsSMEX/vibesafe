import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ResultsPage() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Scan Results</h1>
        <p className="text-sm text-slate-600">Detailed findings from your latest security scans.</p>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">No recent scans</h2>
        <p className="mt-2 text-sm text-slate-600">Your scan history will appear here once you connect a repository.</p>
      </div>
    </DashboardLayout>
  );
}
