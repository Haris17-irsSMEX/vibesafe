import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitSystemTest } from "@/lib/rate-limit";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  createSystemTestRun,
  insertSystemTestFindings,
  updateSystemTestRun,
} from "@/lib/db/system-tests";
import {
  normalizePublicSystemTestUrl,
  runPublicSystemTest,
  SystemTestInputError,
  SystemTestRunnerUnavailableError,
} from "@/services/system-testing/SystemTestRunner";
import { parseSafeWorkflow } from "@/services/system-testing/WorkflowRunner";

// This synchronous MVP is intentionally bounded. A future worker can reuse the
// runner and persistence layer without changing the public route contract.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ success: false, error: "You must be signed in." }, { status: 401 });
  }

  const isAdmin = isAdminEmail(user.email);
  const rateLimit = await rateLimitSystemTest(user.id, isAdmin);
  console.info("[system-tests] rate limit evaluated", {
    userId: user.id,
    isAdmin,
    environment: process.env.NODE_ENV,
    allowed: rateLimit.success,
    remaining: rateLimit.remaining,
  });
  if (!rateLimit.success) {
    const retryAfterMinutes = rateLimit.retryAfterSeconds ? Math.max(1, Math.ceil(rateLimit.retryAfterSeconds / 60)) : null;
    const error = retryAfterMinutes
      ? `System test limit reached. Please try again in about ${retryAfterMinutes} minute${retryAfterMinutes === 1 ? "" : "s"}.`
      : "System test limit reached. Please try again later.";
    return NextResponse.json(
      { success: false, error, retryAfterSeconds: rateLimit.retryAfterSeconds ?? null },
      {
        status: 429,
        headers: rateLimit.retryAfterSeconds ? { "Retry-After": String(rateLimit.retryAfterSeconds) } : undefined,
      }
    );
  }

  let target: { targetUrl: string; origin: string };
  let workflow: ReturnType<typeof parseSafeWorkflow>;
  try {
    const body = await request.json();
    target = await normalizePublicSystemTestUrl(body?.targetUrl);
    workflow = parseSafeWorkflow(body?.workflow);
  } catch (error) {
    const message = error instanceof SystemTestInputError || error instanceof Error ? error.message : "Enter a valid public http(s) URL.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }

  const created = await createSystemTestRun({
    userId: user.id,
    targetUrl: target.targetUrl,
    normalizedOrigin: target.origin,
  });
  if (!created.ok) {
    return NextResponse.json({ success: false, error: created.error }, { status: 500 });
  }

  const runId = created.runId;
  const startedAt = new Date().toISOString();
  try {
    await updateSystemTestRun(runId, { status: "running", started_at: startedAt, error_message: null });
    console.info("[system-tests] run started", { runId, origin: target.origin });

    const execution = await runPublicSystemTest({ runId, targetUrl: target.targetUrl, origin: target.origin, workflow });
    await insertSystemTestFindings(execution.findings);
    await updateSystemTestRun(runId, {
      status: "completed",
      completed_at: new Date().toISOString(),
      summary: execution.summary,
      error_message: null,
    });
    console.info("[system-tests] run completed", { runId, pagesChecked: execution.summary.pagesChecked, findingsCount: execution.findings.length });
    return NextResponse.json({ success: true, runId });
  } catch (error) {
    const safeMessage = error instanceof SystemTestRunnerUnavailableError
      ? error.message
      : "System test could not be completed. Please retry.";
    console.warn("[system-tests] run failed", { runId, reason: error instanceof Error ? error.message.slice(0, 300) : "unknown" });
    try {
      await updateSystemTestRun(runId, {
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: safeMessage,
      });
    } catch {
      // Preserve the original failure response; a DB failure is logged in the helper.
    }
    return NextResponse.json({ success: false, runId, error: safeMessage }, { status: 500 });
  }
}
