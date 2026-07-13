import { redirect } from "next/navigation";
import { Activity, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout";
import { AppPageContainer, AppPageHeader } from "@/components/layout/app-page";
import { SurfaceCard } from "@/components/dashboard/dashboard-ui";
import { SystemTestForm } from "@/components/system-testing/SystemTestForm";

export default async function SystemTestingPage() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="default">
        <AppPageHeader
          title="System Testing"
          description="Check a live or staging system for public-page failures with deterministic browser evidence."
          icon={<Activity className="h-5 w-5" />}
        />
        <SurfaceCard className="p-5 sm:p-7">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-cc-text">Run a safe public-page test</h2>
            <p className="mt-2 text-sm leading-6 text-cc-muted">
              CtrlCode crawls a small set of same-origin public pages and records actual HTTP failures, browser errors, failed requests, and safe interaction traces.
            </p>
          </div>
          <div className="mt-6 border-t border-cc-border pt-6">
            <SystemTestForm />
          </div>
        </SurfaceCard>

        <SurfaceCard className="mt-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <h2 className="text-sm font-semibold text-cc-text">Safe MVP scope</h2>
              <p className="mt-1 text-sm leading-6 text-cc-muted">CtrlCode only performs safe public-page checks in this MVP. It does not submit payments or destructive actions.</p>
            </div>
          </div>
        </SurfaceCard>
      </AppPageContainer>
    </ServerDashboardLayout>
  );
}
