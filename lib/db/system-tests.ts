/** Server-only persistence helpers for the evidence-only System Testing module. */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type SystemTestRunStatus = "pending" | "running" | "completed" | "failed";
export type SystemTestSeverity = "high" | "medium" | "low" | "info";
export type SystemTestCategory =
  | "broken_page"
  | "broken_link"
  | "console_error"
  | "network_error"
  | "dead_button"
  | "runtime_error"
  | "accessibility_basic"
  | "performance_basic"
  | "workflow_failure"
  | "missing_element"
  | "expectation_failed"
  | "safety_skipped";

export type WorkflowStep =
  | { type: "visit"; url: string }
  | { type: "click"; text: string }
  | { type: "expectUrlContains"; value: string }
  | { type: "expectText"; value: string };

export type WorkflowDefinition = {
  name: string;
  goal: string | null;
  steps: WorkflowStep[];
};

export type WorkflowStepResult = {
  index: number;
  type: WorkflowStep["type"];
  status: "passed" | "failed" | "skipped";
  detail: string;
  urlBefore: string;
  urlAfter: string;
  pageTitle: string | null;
  /** Additive fields; older saved workflow runs may not include them. */
  input?: WorkflowStep;
  expectedResult?: string | null;
  actualResult?: string;
  clickedText?: string | null;
};

export type WorkflowSummary = {
  name: string;
  goal: string | null;
  status: "passed" | "failed" | "partial" | "skipped";
  steps: WorkflowStepResult[];
  counts: { passed: number; failed: number; skipped: number };
};

export type SystemTestSummary = {
  pagesChecked: number;
  pagesVisited: { url: string; status: number | null; title: string | null }[];
  findingsCount: number;
  actionableFindings: number;
  severityCounts: Record<SystemTestSeverity, number>;
  ignoredAbortedRequests: number;
  ignoredStaticRequests: number;
  ignoredDuplicateFindings: number;
  ignoredConsoleEvents: number;
  ignoredRscConsoleMessages: number;
  ignoredFrameworkConsoleNoise: number;
  ignoredDuplicateConsoleErrors: number;
  actionableConsoleErrors: number;
  workflow?: WorkflowSummary | null;
  limits: { maxPages: number; maxDepth: number };
};

export type SystemTestRunRecord = {
  id: string;
  user_id: string;
  target_url: string;
  normalized_origin: string;
  status: SystemTestRunStatus;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  summary: SystemTestSummary | null;
  created_at: string;
};

export type SystemTestFindingRecord = {
  id: string;
  run_id: string;
  severity: SystemTestSeverity;
  category: SystemTestCategory;
  title: string;
  page_url: string;
  action: string | null;
  expected_result: string | null;
  actual_result: string;
  evidence: Record<string, unknown>;
  reproduction_steps: string[];
  screenshot_url: string | null;
  created_at: string;
};

export type NewSystemTestFinding = Omit<SystemTestFindingRecord, "id" | "created_at">;

export async function createSystemTestRun(input: {
  userId: string;
  targetUrl: string;
  normalizedOrigin: string;
}): Promise<{ ok: true; runId: string } | { ok: false; error: string }> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("system_test_runs")
    .insert({
      user_id: input.userId,
      target_url: input.targetUrl,
      normalized_origin: input.normalizedOrigin,
      status: "pending",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[system-tests] create run failed", { code: error?.code, message: error?.message });
    return { ok: false, error: "Unable to create the system test run." };
  }

  return { ok: true, runId: data.id };
}

export async function updateSystemTestRun(
  runId: string,
  values: {
    status: SystemTestRunStatus;
    error_message?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    summary?: SystemTestSummary | null;
  }
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("system_test_runs").update(values).eq("id", runId);
  if (error) {
    console.error("[system-tests] update run failed", { runId, code: error.code, message: error.message });
    throw new Error("Unable to update the system test run.");
  }
}

export async function insertSystemTestFindings(findings: NewSystemTestFinding[]): Promise<void> {
  if (findings.length === 0) return;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("system_test_findings").insert(findings);
  if (error) {
    console.error("[system-tests] save findings failed", { code: error.code, message: error.message, count: findings.length });
    throw new Error("Unable to save system test findings.");
  }
}

export async function getSystemTestRunForUser(runId: string, userId: string): Promise<SystemTestRunRecord | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("system_test_runs")
    .select("*")
    .eq("id", runId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[system-tests] load run failed", { runId, code: error.code, message: error.message });
    return null;
  }
  return data as SystemTestRunRecord | null;
}

export async function getSystemTestFindingsForRun(runId: string, userId: string): Promise<SystemTestFindingRecord[]> {
  const admin = createSupabaseAdminClient();
  // Check ownership before loading service-role findings.
  const run = await getSystemTestRunForUser(runId, userId);
  if (!run) return [];
  const { data, error } = await admin
    .from("system_test_findings")
    .select("*")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[system-tests] load findings failed", { runId, code: error.code, message: error.message });
    return [];
  }

  return data as SystemTestFindingRecord[];
}
