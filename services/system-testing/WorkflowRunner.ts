import "server-only";

import type { Page, Locator } from "playwright-core";
import type {
  NewSystemTestFinding,
  SystemTestCategory,
  SystemTestSeverity,
  WorkflowDefinition,
  WorkflowStep,
  WorkflowStepResult,
  WorkflowSummary,
} from "@/lib/db/system-tests";

const UNSAFE_WORKFLOW_ACTION = /delete|remove|logout|sign\s*out|pay|purchase|checkout|subscribe|confirm|reset|submit(?:\s+payment)?|cancel\s+subscription/i;
const MAX_WORKFLOW_STEPS = 12;

type PageSnapshot = { url: string; title: string | null; bodyText: string };
type WorkflowFindingInput = Omit<NewSystemTestFinding, "run_id" | "screenshot_url">;

export function parseSafeWorkflow(input: unknown): WorkflowDefinition | null {
  if (input === undefined || input === null) return null;
  if (typeof input !== "object" || Array.isArray(input)) throw new Error("Workflow must be an object.");
  const candidate = input as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const goal = typeof candidate.goal === "string" ? candidate.goal.trim() : "";
  if (!name || name.length > 120) throw new Error("Workflow name is required and must be 120 characters or fewer.");
  if (goal.length > 500) throw new Error("Workflow goal must be 500 characters or fewer.");
  if (!Array.isArray(candidate.steps) || candidate.steps.length === 0 || candidate.steps.length > MAX_WORKFLOW_STEPS) {
    throw new Error(`Workflow must include between 1 and ${MAX_WORKFLOW_STEPS} steps.`);
  }

  const steps = candidate.steps.map((rawStep, index): WorkflowStep => {
    if (typeof rawStep !== "object" || rawStep === null || Array.isArray(rawStep)) throw new Error(`Workflow step ${index + 1} is invalid.`);
    const step = rawStep as Record<string, unknown>;
    if (step.type === "visit" && typeof step.url === "string" && step.url.trim() && step.url.length <= 2_000) return { type: "visit", url: step.url.trim() };
    if (step.type === "click" && typeof step.text === "string" && step.text.trim() && step.text.length <= 160) return { type: "click", text: step.text.trim() };
    if (step.type === "expectUrlContains" && typeof step.value === "string" && step.value.trim() && step.value.length <= 500) return { type: "expectUrlContains", value: step.value.trim() };
    if (step.type === "expectText" && typeof step.value === "string" && step.value.trim() && step.value.length <= 500) return { type: "expectText", value: step.value.trim() };
    throw new Error(`Workflow step ${index + 1} has an unsupported type or missing value.`);
  });

  return { name, goal: goal || null, steps };
}

function sameOriginUrl(raw: string, origin: string): string | null {
  try {
    const url = new URL(raw, origin);
    url.hash = "";
    return url.origin === origin && (url.protocol === "http:" || url.protocol === "https:") ? url.toString() : null;
  } catch {
    return null;
  }
}

async function snapshot(page: Page): Promise<PageSnapshot> {
  const [url, title, bodyText] = await Promise.all([
    Promise.resolve(page.url()),
    page.title().catch(() => null),
    page.locator("body").innerText({ timeout: 2_500 }).catch(() => ""),
  ]);
  return { url, title, bodyText: bodyText.slice(0, 20_000) };
}

async function findSafeClickTarget(page: Page, text: string): Promise<{ locator: Locator; label: string; href: string | null; insideForm: boolean } | null | "ambiguous"> {
  const exactLink = page.getByRole("link", { name: text, exact: true });
  const exactButton = page.getByRole("button", { name: text, exact: true });
  const exactCount = (await exactLink.count()) + (await exactButton.count());
  let locator: Locator | null = null;
  if (exactCount === 1) locator = (await exactLink.count()) === 1 ? exactLink : exactButton;
  else if (exactCount > 1) locator = await chooseTopmostVisible([exactLink, exactButton]);
  else {
    const fuzzyLink = page.getByRole("link", { name: text, exact: false });
    const fuzzyButton = page.getByRole("button", { name: text, exact: false });
    const fuzzyCount = (await fuzzyLink.count()) + (await fuzzyButton.count());
    if (fuzzyCount === 0) return null;
    if (fuzzyCount > 1) locator = await chooseTopmostVisible([fuzzyLink, fuzzyButton]);
    else locator = (await fuzzyLink.count()) === 1 ? fuzzyLink : fuzzyButton;
  }

  if (!locator) return "ambiguous";

  const details = await locator.evaluate((element) => ({
    label: ((element as HTMLElement).innerText || element.getAttribute("aria-label") || "").trim().replace(/\s+/g, " "),
    href: element instanceof HTMLAnchorElement ? element.href : null,
    insideForm: Boolean(element.closest("form")),
  }));
  return { locator, ...details };
}

async function chooseTopmostVisible(locators: Locator[]): Promise<Locator | null> {
  const candidates: { locator: Locator; index: number; top: number }[] = [];
  for (const locator of locators) {
    const positions = await locator.evaluateAll((elements) => elements.map((element, index) => {
      const rect = (element as HTMLElement).getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return { index, top: rect.top, visible: rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none" };
    }));
    for (const position of positions) if (position.visible) candidates.push({ locator, index: position.index, top: position.top });
  }
  candidates.sort((a, b) => a.top - b.top);
  if (candidates.length === 0) return null;
  if (candidates.length > 1 && candidates[0].top === candidates[1].top) return null;
  return candidates[0].locator.nth(candidates[0].index);
}

function makeWorkflowEvidence(workflow: WorkflowDefinition, index: number, step: WorkflowStep, before: PageSnapshot, after: PageSnapshot, clickedText?: string) {
  return {
    workflow: { name: workflow.name, goal: workflow.goal, stepIndex: index + 1, stepType: step.type, stepInput: step, urlBefore: before.url, urlAfter: after.url, clickedText: clickedText ?? null, pageTitle: after.title },
  };
}

export async function executeSafeWorkflow(input: {
  page: Page;
  origin: string;
  workflow: WorkflowDefinition;
  addFinding: (finding: WorkflowFindingInput) => void;
}): Promise<WorkflowSummary> {
  const results: WorkflowStepResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (let index = 0; index < input.workflow.steps.length; index += 1) {
    const step = input.workflow.steps[index];
    const before = await snapshot(input.page);
    let after = before;
    let status: WorkflowStepResult["status"] = "passed";
    let detail = "Step completed.";
    let clickedText: string | undefined;
    let expectedResult: string | null = null;

    const saveFinding = (severity: SystemTestSeverity, category: SystemTestCategory, title: string, actualResult: string, expectedResult?: string) => {
      input.addFinding({
        severity,
        category,
        title,
        page_url: before.url,
        action: `${step.type}: ${step.type === "visit" ? step.url : step.type === "click" ? step.text : step.value}`,
        expected_result: expectedResult ?? null,
        actual_result: actualResult,
        evidence: makeWorkflowEvidence(input.workflow, index, step, before, after, clickedText),
        reproduction_steps: [`Open ${before.url}.`, `Run workflow “${input.workflow.name}” step ${index + 1}: ${step.type}.`, actualResult],
      });
    };

    try {
      if (step.type === "visit") {
        expectedResult = "A successful same-origin page load.";
        const target = sameOriginUrl(step.url, input.origin);
        if (!target) {
          status = "skipped";
          detail = "Step skipped for safety: external navigation is not allowed.";
          saveFinding("low", "safety_skipped", "Workflow step skipped for safety", detail);
        } else {
          const response = await input.page.goto(target, { waitUntil: "domcontentloaded", timeout: 8_000 });
          after = await snapshot(input.page);
          if (new URL(after.url).origin !== input.origin || (response?.status() ?? 0) >= 400) {
            status = "failed";
            detail = `Visit did not load a successful same-origin page${response ? ` (HTTP ${response.status()})` : ""}.`;
            saveFinding(response && response.status() >= 500 ? "high" : "medium", "workflow_failure", "Workflow visit failed", detail, "A successful same-origin page load.");
          } else {
            detail = `Visited ${after.url}.`;
          }
        }
      } else if (step.type === "click") {
        expectedResult = `One visible safe link or button labeled “${step.text}”.`;
        if (UNSAFE_WORKFLOW_ACTION.test(step.text)) {
          status = "skipped";
          detail = "Step skipped for safety: destructive or payment-related action.";
          saveFinding("low", "safety_skipped", "Workflow step skipped for safety", detail);
        } else {
          const target = await findSafeClickTarget(input.page, step.text);
          if (target === null || target === "ambiguous") {
            status = "failed";
            detail = target === "ambiguous" ? `Multiple safe elements matched “${step.text}”.` : `No visible link or button matched “${step.text}”.`;
            saveFinding("medium", "missing_element", "Workflow click target not found", detail, `One visible safe link or button labeled “${step.text}”.`);
          } else if (target.insideForm || UNSAFE_WORKFLOW_ACTION.test(target.label) || (target.href !== null && !sameOriginUrl(target.href, input.origin))) {
            status = "skipped";
            detail = "Step skipped for safety: destructive or payment-related action.";
            clickedText = target.label;
            saveFinding("low", "safety_skipped", "Workflow step skipped for safety", detail);
          } else {
            clickedText = target.label;
            await target.locator.click({ timeout: 2_500 });
            await input.page.waitForTimeout(350);
            after = await snapshot(input.page);
            detail = `Clicked “${clickedText}”.`;
          }
        }
      } else if (step.type === "expectUrlContains") {
        expectedResult = `URL containing “${step.value}”.`;
        after = await snapshot(input.page);
        if (!after.url.includes(step.value)) {
          status = "failed";
          detail = `Expected URL to include “${step.value}”, but it was ${after.url}.`;
          saveFinding("medium", "expectation_failed", "Workflow URL expectation failed", detail, `URL containing “${step.value}”.`);
        } else {
          detail = `URL contains “${step.value}”.`;
        }
      } else {
        expectedResult = `Visible text containing “${step.value}”.`;
        after = await snapshot(input.page);
        if (!after.bodyText.includes(step.value)) {
          status = "failed";
          detail = `Expected visible page text “${step.value}” was not found.`;
          saveFinding("medium", "expectation_failed", "Workflow text expectation failed", detail, `Visible text containing “${step.value}”.`);
        } else {
          detail = `Visible text contains “${step.value}”.`;
        }
      }
    } catch (error) {
      after = await snapshot(input.page);
      status = "failed";
      detail = error instanceof Error ? error.message.slice(0, 500) : "The workflow step could not be completed.";
      saveFinding("medium", "workflow_failure", "Workflow step failed", detail, "The workflow step should complete safely.");
    }

    if (status === "passed") passed += 1;
    if (status === "failed") failed += 1;
    if (status === "skipped") skipped += 1;
    results.push({
      index: index + 1,
      type: step.type,
      status,
      detail,
      urlBefore: before.url,
      urlAfter: after.url,
      pageTitle: after.title,
      input: step,
      expectedResult,
      actualResult: detail,
      clickedText: clickedText ?? null,
    });
  }

  return {
    name: input.workflow.name,
    goal: input.workflow.goal,
    status: failed > 0 ? "failed" : passed === 0 && skipped > 0 ? "skipped" : skipped > 0 ? "partial" : "passed",
    steps: results,
    counts: { passed, failed, skipped },
  };
}
