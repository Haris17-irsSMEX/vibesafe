import { redirect } from "next/navigation";
import { Activity, Ban, CheckCircle2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ServerDashboardLayout } from "@/components/layout/server-dashboard-layout";
import { AppPageContainer, AppPageHeader } from "@/components/layout/app-page";
import { SurfaceCard } from "@/components/dashboard/dashboard-ui";
import { SystemTestForm } from "@/components/system-testing/SystemTestForm";
import { getAccountUsageSummary } from "@/lib/usage-limits";

function formatUtcReset(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

export default async function SystemTestingPage() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");
  const usage = await getAccountUsageSummary(user.id, user.email);
  const usageLabel = usage.isAdmin
    ? "Admin access"
    : `${usage.systemTests.used} / ${usage.systemTests.limit} system tests used today`;

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="default">
        <AppPageHeader
          title="System Testing"
          description="Check whether your live or staging app works before users see it."
          icon={<Activity className="h-5 w-5" />}
        />
        <SurfaceCard className="p-5 sm:p-7">
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-cc-text">Start a safe system test</h2>
            <p className="mt-2 text-sm leading-6 text-cc-muted">
              Choose a quick site check or guide CtrlCode through one safe public workflow. Every result is based on a captured browser response, error, request, or interaction trace.
            </p>
          </div>
          <div className="mt-6 border-t border-cc-border pt-6">
            <SystemTestForm
              canRunSystemTest={usage.isAdmin || usage.systemTests.allowed}
              guidedWorkflowEnabled={usage.limits.guidedWorkflowTestingEnabled}
              usageLabel={usageLabel}
              resetLabel={formatUtcReset(usage.window.resetAt)}
              upgradeUrl={usage.plan === "starter" ? "/checkout?plan=builder" : usage.plan === "builder" ? "/contact" : "/pricing"}
              planLabel={usage.planLabel}
              isAdmin={usage.isAdmin}
            />
          </div>
        </SurfaceCard>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <SurfaceCard className="p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"><CheckCircle2 className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-cc-text">What CtrlCode checks</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-cc-muted"><li>Pages load successfully</li><li>Internal links work</li><li>Safe buttons navigate correctly</li><li>Browser console and runtime errors</li><li>Failed API or network requests</li><li>Broken public workflows</li></ul></div></div>
          </SurfaceCard>
          <SurfaceCard className="p-5 sm:p-6">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400"><Ban className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-cc-text">What CtrlCode avoids</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-cc-muted"><li>Payments and checkout</li><li>Deleting data or destructive actions</li><li>Logging out users</li><li>Submitting forms</li><li>Authentication bypass attempts</li><li>External domains</li></ul></div></div>
          </SurfaceCard>
        </div>
        <SurfaceCard className="mt-5 p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cc-border-strong bg-cc-surface-raised text-cc-muted"><ShieldCheck className="h-4 w-4" /></span><div><h2 className="text-sm font-semibold text-cc-text">Evidence-first results</h2><p className="mt-1 text-sm leading-6 text-cc-muted">CtrlCode reports only what the browser observed. It does not guess at runtime bugs or treat untested areas as working.</p></div></div>
        </SurfaceCard>
      </AppPageContainer>
    </ServerDashboardLayout>
  );
}
