import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">Manage your account and billing preferences.</p>
      </div>
      <div className="max-w-2xl space-y-6">
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Profile</h2>
          <p className="mt-1 text-sm text-slate-600">Update your account information.</p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">Email address</label>
            <input 
              type="email" 
              disabled 
              className="mt-1 block w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-slate-500 shadow-sm sm:text-sm"
              value={user.email || ""}
            />
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-slate-900">Plan</h2>
          <p className="mt-1 text-sm text-slate-600">You are currently on the Free plan.</p>
          <div className="mt-4">
            <button className="inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800">
              Upgrade to Pro
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
