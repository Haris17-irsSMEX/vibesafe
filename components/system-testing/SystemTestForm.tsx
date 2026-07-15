"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, CheckCircle2, GitBranch, Loader2, Sparkles } from "lucide-react";

type TestMode = "quick" | "workflow";
type WorkflowStep =
  | { type: "visit"; url: string }
  | { type: "click"; text: string }
  | { type: "expectUrlContains"; value: string }
  | { type: "expectText"; value: string };

type WorkflowTemplate = {
  id: "navigation" | "pricing" | "login" | "cta" | "contact" | "custom";
  label: string;
  name: string;
  clickText: string;
  expectedUrl: string;
  expectedText: string;
};

const templates: WorkflowTemplate[] = [
  { id: "navigation", label: "Test homepage navigation", name: "Homepage navigation", clickText: "Product", expectedUrl: "", expectedText: "" },
  { id: "pricing", label: "Test pricing page", name: "Homepage to pricing", clickText: "Pricing", expectedUrl: "/pricing", expectedText: "" },
  { id: "login", label: "Test login page", name: "Homepage to login", clickText: "Sign in", expectedUrl: "/login", expectedText: "" },
  { id: "cta", label: "Test main CTA", name: "Homepage primary CTA", clickText: "Start review", expectedUrl: "/login", expectedText: "" },
  { id: "contact", label: "Test contact page", name: "Homepage to contact", clickText: "Contact", expectedUrl: "/contact", expectedText: "" },
  { id: "custom", label: "Custom workflow", name: "", clickText: "", expectedUrl: "", expectedText: "" },
];

function buildGuidedSteps(input: { startingUrl: string; clickText: string; expectedUrl: string; expectedText: string }): WorkflowStep[] {
  const steps: WorkflowStep[] = [{ type: "visit", url: input.startingUrl.trim() }];
  if (input.clickText.trim()) steps.push({ type: "click", text: input.clickText.trim() });
  if (input.expectedUrl.trim()) steps.push({ type: "expectUrlContains", value: input.expectedUrl.trim() });
  if (input.expectedText.trim()) steps.push({ type: "expectText", value: input.expectedText.trim() });
  return steps;
}

export function SystemTestForm() {
  const router = useRouter();
  const [mode, setMode] = useState<TestMode>("quick");
  const [targetUrl, setTargetUrl] = useState("");
  const [workflowName, setWorkflowName] = useState("");
  const [startingUrl, setStartingUrl] = useState("");
  const [clickText, setClickText] = useState("");
  const [expectedUrl, setExpectedUrl] = useState("");
  const [expectedText, setExpectedText] = useState("");
  const [advancedSteps, setAdvancedSteps] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function chooseTemplate(template: WorkflowTemplate) {
    setMode("workflow");
    setWorkflowName(template.name);
    setStartingUrl(targetUrl);
    setClickText(template.clickText);
    setExpectedUrl(template.expectedUrl);
    setExpectedText(template.expectedText);
    setAdvancedSteps("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedTarget = targetUrl.trim();
    let workflow: { name: string; goal: string; steps: WorkflowStep[] } | undefined;

    if (mode === "workflow") {
      const name = workflowName.trim() || "Guided workflow";
      const goal = "Verify a safe public navigation flow.";
      const start = startingUrl.trim() || normalizedTarget;
      let steps: WorkflowStep[];

      try {
        if (advancedSteps.trim()) {
          const parsed = JSON.parse(advancedSteps);
          if (!Array.isArray(parsed)) throw new Error("Workflow steps must be a JSON array.");
          steps = parsed as WorkflowStep[];
        } else {
          steps = buildGuidedSteps({ startingUrl: start, clickText, expectedUrl, expectedText });
        }
      } catch {
        setError("Advanced workflow steps must be a valid JSON array.");
        return;
      }

      if (!start || steps.length < 2) {
        setError("Add a starting URL and at least one safe action or expectation for the guided workflow.");
        return;
      }
      workflow = { name, goal, steps };
    }

    setIsRunning(true);
    try {
      const response = await fetch("/api/system-tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl: normalizedTarget, workflow }),
      });
      const data = await response.json().catch(() => null);
      if (data?.runId) {
        router.push(`/system-testing/${data.runId}`);
        router.refresh();
        return;
      }
      setError(data?.error ?? "System test could not be started. Please retry.");
    } catch {
      setError("System test could not be started. Please retry.");
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <label className="block">
        <span className="text-sm font-medium text-cc-text">Website URL</span>
        <span className="mt-1 block text-xs leading-5 text-cc-subtle">Use a public live or staging http(s) URL. Localhost works only during local development.</span>
        <input
          type="url"
          inputMode="url"
          autoComplete="url"
          required
          value={targetUrl}
          onChange={(event) => setTargetUrl(event.target.value)}
          placeholder="https://staging.example.com"
          className="mt-3 block min-h-11 w-full rounded-lg border border-cc-border bg-cc-bg px-3.5 text-sm text-cc-text outline-none placeholder:text-cc-subtle focus:border-cc-border-strong focus:ring-2 focus:ring-white/15 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isRunning}
        />
      </label>

      <fieldset disabled={isRunning}>
        <legend className="text-sm font-medium text-cc-text">Choose a test</legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => setMode("quick")} className={`rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/25 ${mode === "quick" ? "border-cc-border-strong bg-cc-surface-raised" : "border-cc-border bg-cc-bg-secondary hover:bg-cc-surface"}`} aria-pressed={mode === "quick"}>
            <span className="flex items-center gap-2 text-sm font-semibold text-cc-text"><CheckCircle2 className="h-4 w-4 text-emerald-400" />Quick Site Check</span>
            <span className="mt-2 block text-xs leading-5 text-cc-muted">Best for broken pages, links, failed requests, browser errors, and safe navigation issues.</span>
          </button>
          <button type="button" onClick={() => setMode("workflow")} className={`rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/25 ${mode === "workflow" ? "border-cc-border-strong bg-cc-surface-raised" : "border-cc-border bg-cc-bg-secondary hover:bg-cc-surface"}`} aria-pressed={mode === "workflow"}>
            <span className="flex items-center gap-2 text-sm font-semibold text-cc-text"><GitBranch className="h-4 w-4 text-cc-muted" />Guided Workflow Test</span>
            <span className="mt-2 block text-xs leading-5 text-cc-muted">Best for simple flows such as Homepage → Pricing → Login.</span>
          </button>
        </div>
      </fieldset>

      {mode === "workflow" && (
        <section className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4 sm:p-5">
          <div className="flex flex-col gap-1"><h2 className="text-sm font-semibold text-cc-text">Build a safe workflow</h2><p className="text-xs leading-5 text-cc-subtle">Choose a helper, then describe one safe public navigation path. CtrlCode converts these fields into the validated workflow internally.</p></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {templates.map((template) => <button key={template.id} type="button" onClick={() => chooseTemplate(template)} className="rounded-full border border-cc-border bg-cc-bg px-3 py-1.5 text-xs font-medium text-cc-muted outline-none transition-colors hover:bg-cc-surface-hover hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20">{template.label}</button>)}
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="text-xs font-medium text-cc-muted">Workflow name</span><input value={workflowName} onChange={(event) => setWorkflowName(event.target.value)} maxLength={120} placeholder="Homepage to Pricing" className="mt-2 block min-h-10 w-full rounded-lg border border-cc-border bg-cc-bg px-3 text-sm text-cc-text outline-none placeholder:text-cc-subtle focus:border-cc-border-strong focus:ring-2 focus:ring-white/15" /></label>
            <label className="block"><span className="text-xs font-medium text-cc-muted">Starting URL</span><input type="url" value={startingUrl} onChange={(event) => setStartingUrl(event.target.value)} placeholder={targetUrl || "https://staging.example.com"} className="mt-2 block min-h-10 w-full rounded-lg border border-cc-border bg-cc-bg px-3 text-sm text-cc-text outline-none placeholder:text-cc-subtle focus:border-cc-border-strong focus:ring-2 focus:ring-white/15" /></label>
            <label className="block"><span className="text-xs font-medium text-cc-muted">Click text</span><input value={clickText} onChange={(event) => setClickText(event.target.value)} maxLength={160} placeholder="Pricing" className="mt-2 block min-h-10 w-full rounded-lg border border-cc-border bg-cc-bg px-3 text-sm text-cc-text outline-none placeholder:text-cc-subtle focus:border-cc-border-strong focus:ring-2 focus:ring-white/15" /></label>
            <label className="block"><span className="text-xs font-medium text-cc-muted">Expected URL contains</span><input value={expectedUrl} onChange={(event) => setExpectedUrl(event.target.value)} maxLength={300} placeholder="/pricing" className="mt-2 block min-h-10 w-full rounded-lg border border-cc-border bg-cc-bg px-3 text-sm text-cc-text outline-none placeholder:text-cc-subtle focus:border-cc-border-strong focus:ring-2 focus:ring-white/15" /></label>
          </div>
          <label className="mt-4 block"><span className="text-xs font-medium text-cc-muted">Expected page text <span className="font-normal text-cc-subtle">(optional)</span></span><input value={expectedText} onChange={(event) => setExpectedText(event.target.value)} maxLength={500} placeholder="Pricing that scales with your reviews" className="mt-2 block min-h-10 w-full rounded-lg border border-cc-border bg-cc-bg px-3 text-sm text-cc-text outline-none placeholder:text-cc-subtle focus:border-cc-border-strong focus:ring-2 focus:ring-white/15" /></label>
          <details className="mt-5 rounded-lg border border-cc-border bg-cc-bg p-3.5"><summary className="cursor-pointer text-sm font-medium text-cc-text">Advanced: define workflow steps manually</summary><p className="mt-2 text-xs leading-5 text-cc-subtle">For technical users. This JSON array replaces the guided steps above. Supported steps: visit, click, expectUrlContains, expectText.</p><textarea value={advancedSteps} onChange={(event) => setAdvancedSteps(event.target.value)} rows={8} spellCheck={false} placeholder={'[\n  { "type": "visit", "url": "https://example.com" },\n  { "type": "click", "text": "Pricing" },\n  { "type": "expectUrlContains", "value": "/pricing" }\n]'} className="mt-3 block w-full rounded-lg border border-cc-border bg-cc-bg-secondary px-3 py-2.5 font-mono text-xs leading-5 text-cc-text outline-none placeholder:text-cc-subtle focus:border-cc-border-strong focus:ring-2 focus:ring-white/15" /></details>
        </section>
      )}

      <div className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-4 text-sm text-cc-muted"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /><p>CtrlCode only performs safe public-page checks. It does not submit payments, delete data, log out users, submit destructive forms, or bypass authentication.</p></div>
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">{error}</p>}
      <button type="submit" disabled={isRunning || !targetUrl.trim()} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cc-text px-4 py-2.5 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
        {isRunning ? "System test is running…" : mode === "quick" ? "Run Quick Site Check" : "Run Guided Workflow Test"}
        {!isRunning && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
