import "server-only";

import { lookup } from "node:dns/promises";
import { chromium, type Browser, type Page } from "playwright";
import type {
  NewSystemTestFinding,
  SystemTestCategory,
  SystemTestSeverity,
  SystemTestSummary,
} from "@/lib/db/system-tests";

export const SYSTEM_TEST_LIMITS = {
  maxPages: 10,
  maxDepth: 2,
  pageTimeoutMs: 8_000,
  actionTimeoutMs: 2_500,
  maxSafeButtonChecksPerPage: 3,
} as const;

const DANGEROUS_ACTION = /delete|remove|logout|sign\s*out|pay|purchase|checkout|subscribe|confirm|reset|submit|cancel\s+order/i;
const SAFE_BUTTON_LABEL = /^(show|toggle|menu|close|details|expand|collapse)/i;
const STATIC_PATH = /\.(?:css|js|mjs|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|pdf|zip|mp4|webm)$/i;
const PRIVATE_HOST = /^(localhost|.+\.local)$/i;
const ABORTED_REQUEST = /net::err_aborted|ns_binding_aborted|err_aborted|request (?:was )?cancel(?:ed|led)|request aborted|navigation cancell?ed|frame was detached|target closed during navigation/i;
const FRAMEWORK_NOISE = /chrome-extension:|moz-extension:|safari-extension:|resizeobserver loop limit exceeded|download the react devtools|failed to load resource|source\s*map|sourcemap/i;
const STACK_LINE = /^(?:at\s+|https?:\/\/.*\/_next\/static\/chunks\/|webpack-internal:|\s*\^\s*$)/i;
const RSC_NOISE = /failed to fetch rsc payload|rsc payload|fetch rsc|server response was not a valid rsc payload|app router.*(?:navigation|prefetch)|(?:navigation|prefetch).*(?:rsc|cancel(?:ed|led))/i;
const PREFETCH_OR_HYDRATION_NOISE = /(?:prefetch|hydration).*(?:cancel(?:ed|led)|aborted|recover)|hydration (?:failed|error|mismatch)/i;

type QueueItem = { url: string; depth: number; discoveredFrom?: string };
type VisitedPage = { url: string; status: number | null; title: string | null };
type BrowserEvidence = Record<string, unknown>;
type IgnoredEventCounts = {
  ignoredAbortedRequests: number;
  ignoredStaticRequests: number;
  ignoredConsoleEvents: number;
  ignoredRscConsoleMessages: number;
  ignoredFrameworkConsoleNoise: number;
  ignoredDuplicateConsoleErrors: number;
  actionableConsoleErrors: number;
};
type PageHealth = {
  documentStatus: number | null;
  pageLoaded: boolean;
  bodyPresent: boolean;
  errorOverlayVisible: boolean;
  navigationFailed: boolean;
};
type PendingConsoleEvent = {
  pageUrl: string;
  source: "console" | "pageerror";
  originalMessage: string;
  normalizedMessage: string | null;
};

export type SystemTestExecution = {
  findings: NewSystemTestFinding[];
  summary: SystemTestSummary;
};

export class SystemTestInputError extends Error {}
export class SystemTestRunnerUnavailableError extends Error {}

export async function normalizePublicSystemTestUrl(input: unknown): Promise<{ targetUrl: string; origin: string }> {
  if (typeof input !== "string" || input.trim().length === 0 || input.length > 2_000) {
    throw new SystemTestInputError("Enter a valid public http(s) URL.");
  }

  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw new SystemTestInputError("Enter a valid public http(s) URL.");
  }

  if (!(url.protocol === "https:" || url.protocol === "http:") || url.username || url.password) {
    throw new SystemTestInputError("Enter a valid public http(s) URL.");
  }

  const hostname = url.hostname.toLowerCase();
  const privateIp = isPrivateIp(hostname);
  const local = PRIVATE_HOST.test(hostname) || privateIp;
  if (local && process.env.NODE_ENV === "production") {
    throw new SystemTestInputError("System Testing accepts public URLs only in production.");
  }

  // Prevent the server-side browser from being pointed at a hostname that
  // resolves to a local/private address in production. Local development is
  // intentionally allowed so the MVP can be exercised against localhost.
  if (process.env.NODE_ENV === "production") {
    try {
      const addresses = await lookup(hostname, { all: true, verbatim: true });
      if (addresses.length === 0 || addresses.some((address) => isPrivateIp(address.address))) {
        throw new SystemTestInputError("System Testing accepts public URLs only in production.");
      }
    } catch (error) {
      if (error instanceof SystemTestInputError) throw error;
      throw new SystemTestInputError("CtrlCode could not verify that this is a public URL.");
    }
  }

  url.hash = "";
  return { targetUrl: url.toString(), origin: url.origin };
}

function isPrivateIp(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "::1" || lower === "0.0.0.0" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:" ) || lower.startsWith("::ffff:127.")) return true;
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const [a, b] = match.slice(1).map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function safeUrl(raw: string, origin: string): string | null {
  try {
    const url = new URL(raw, origin);
    url.hash = "";
    if (url.origin !== origin || !(url.protocol === "http:" || url.protocol === "https:")) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function requestDetails(request: { url(): string; method(): string; resourceType(): string }) {
  const requestUrl = request.url();
  const url = new URL(requestUrl);
  return {
    requestUrl,
    method: request.method(),
    resourceType: request.resourceType(),
    pathname: url.pathname,
    isRsc: url.searchParams.has("_rsc"),
    isFrameworkStatic: url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/_next/image") || url.pathname === "/favicon.ico",
  };
}

function isStaticOrFrameworkResource(details: ReturnType<typeof requestDetails>): boolean {
  return details.isFrameworkStatic || details.isRsc || STATIC_PATH.test(details.pathname) || ["image", "font", "stylesheet", "media"].includes(details.resourceType);
}

function isActionableRequest(details: ReturnType<typeof requestDetails>): boolean {
  return details.pathname.startsWith("/api/") || ["fetch", "xhr", "document"].includes(details.resourceType);
}

function normalizeConsoleMessage(message: string): string | null {
  const lines = message
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !STACK_LINE.test(line));
  const concise = lines[0]?.replace(/\s+/g, " ").slice(0, 500) ?? "";
  if (!concise || FRAMEWORK_NOISE.test(concise)) return null;
  return concise;
}

function normalizeConsoleForDedup(message: string): string {
  return message
    .replace(/https?:\/\/[^\s)]+/gi, "[url]")
    .replace(/\/_next\/static\/chunks\/[^\s)]+/gi, "/_next/static/chunks/[chunk]")
    .replace(/\b[a-f0-9]{8,}\b/gi, "[hash]")
    .replace(/:\d+(?::\d+)?\b/g, ":line")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isHealthyPage(health: PageHealth): boolean {
  return health.pageLoaded && health.bodyPresent && !health.errorOverlayVisible && !health.navigationFailed && (health.documentStatus === null || health.documentStatus < 400);
}

function classifyConsoleMessage(message: string | null, health: PageHealth): { ignored: boolean; reason?: "rsc" | "framework" | "stack"; severity?: SystemTestSeverity; severityRationale?: string } {
  if (!message) return { ignored: true, reason: "stack" };
  if (RSC_NOISE.test(message) && isHealthyPage(health)) return { ignored: true, reason: "rsc" };
  if ((FRAMEWORK_NOISE.test(message) || PREFETCH_OR_HYDRATION_NOISE.test(message)) && isHealthyPage(health)) return { ignored: true, reason: "framework" };
  if (/uncaught|unhandled|typeerror|referenceerror|syntaxerror|chunkloaderror/i.test(message)) {
    return { ignored: false, severity: health.errorOverlayVisible || health.navigationFailed ? "high" : "medium", severityRationale: health.errorOverlayVisible || health.navigationFailed ? "The page failed to render or navigation failed." : "A meaningful runtime exception was observed while the page remained available." };
  }
  return { ignored: false, severity: "low", severityRationale: "A non-blocking browser error was observed; the page remained available." };
}

function severityForNetworkStatus(status: number, details: ReturnType<typeof requestDetails>): SystemTestSeverity {
  if (status >= 500) return details.resourceType === "document" ? "high" : "medium";
  if (["script", "stylesheet"].includes(details.resourceType)) return "medium";
  return details.pathname.startsWith("/api/") || details.resourceType === "fetch" || details.resourceType === "xhr" ? "medium" : "low";
}

function addFinding(
  findings: NewSystemTestFinding[],
  runId: string,
  input: {
    severity: SystemTestSeverity;
    category: SystemTestCategory;
    title: string;
    pageUrl: string;
    action?: string;
    expectedResult?: string;
    actualResult: string;
    evidence: BrowserEvidence;
    reproductionSteps: string[];
  }
) {
  // A System Testing finding is only constructed at a deterministic observation point.
  if (!input.pageUrl || Object.keys(input.evidence).length === 0) return;
  findings.push({
    run_id: runId,
    severity: input.severity,
    category: input.category,
    title: input.title,
    page_url: input.pageUrl,
    action: input.action ?? null,
    expected_result: input.expectedResult ?? null,
    actual_result: input.actualResult,
    evidence: input.evidence,
    reproduction_steps: input.reproductionSteps,
    screenshot_url: null,
  });
}

async function collectSafeButtons(page: Page, currentUrl: string, findings: NewSystemTestFinding[], runId: string) {
  const buttons = await page.locator("button").evaluateAll((elements) =>
    elements.map((element, index) => {
      const button = element as HTMLButtonElement;
      const text = (button.innerText || button.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ");
      return {
        index,
        text,
        disabled: button.disabled || button.getAttribute("aria-disabled") === "true",
        type: button.getAttribute("type") || "submit",
        insideForm: Boolean(button.closest("form")),
      };
    })
  );

  let checked = 0;
  for (const button of buttons) {
    if (checked >= SYSTEM_TEST_LIMITS.maxSafeButtonChecksPerPage) break;
    if (!button.text || button.disabled || button.type !== "button" || button.insideForm) continue;
    if (DANGEROUS_ACTION.test(button.text) || !SAFE_BUTTON_LABEL.test(button.text)) continue;
    checked += 1;

    const before = await page.evaluate(() => ({ url: location.href, title: document.title, textLength: document.body.innerText.length }));
    try {
      await page.locator("button").nth(button.index).click({ timeout: SYSTEM_TEST_LIMITS.actionTimeoutMs });
      await page.waitForTimeout(350);
      const after = await page.evaluate(() => ({ url: location.href, title: document.title, textLength: document.body.innerText.length }));
      const observedChange = before.url !== after.url || before.title !== after.title || before.textLength !== after.textLength;
      if (!observedChange) {
        addFinding(findings, runId, {
          severity: "low",
          category: "dead_button",
          title: `No observable result after clicking “${button.text}”`,
          pageUrl: currentUrl,
          action: `Clicked button[${button.index}] “${button.text}”`,
          expectedResult: "A safe UI action, navigation, or visible content update.",
          actualResult: "The URL, title, and visible page text did not change within the observation window.",
          evidence: { type: "safe_button_probe", selector: `button[${button.index}]`, text: button.text, before, after },
          reproductionSteps: [`Open ${currentUrl}.`, `Click the “${button.text}” button.`, "Observe that no navigation or visible text change occurs."],
        });
      }
    } catch (error) {
      addFinding(findings, runId, {
        severity: "low",
        category: "dead_button",
        title: `Safe button “${button.text}” could not be activated`,
        pageUrl: currentUrl,
        action: `Clicked button[${button.index}] “${button.text}”`,
        expectedResult: "The safe button should be interactive.",
        actualResult: "The browser could not activate this non-destructive button.",
        evidence: { type: "safe_button_probe_error", selector: `button[${button.index}]`, text: button.text, error: error instanceof Error ? error.message.slice(0, 300) : "Unknown click error" },
        reproductionSteps: [`Open ${currentUrl}.`, `Try the “${button.text}” button.`, "Observe the activation failure."],
      });
    }
  }
}

export async function runPublicSystemTest(input: { runId: string; targetUrl: string; origin: string }): Promise<SystemTestExecution> {
  let browser: Browser;
  try {
    browser = await chromium.launch({ headless: true });
  } catch (error) {
    console.warn("[system-tests] browser launch unavailable", { reason: error instanceof Error ? error.message.slice(0, 200) : "unknown" });
    throw new SystemTestRunnerUnavailableError("System testing runner is not available in this deployment environment yet.");
  }

  const findings: NewSystemTestFinding[] = [];
  const visited: VisitedPage[] = [];
  const seen = new Set<string>();
  const queue: QueueItem[] = [{ url: input.targetUrl, depth: 0 }];
  let currentPageUrl = input.targetUrl;
  const ignored: IgnoredEventCounts = {
    ignoredAbortedRequests: 0,
    ignoredStaticRequests: 0,
    ignoredConsoleEvents: 0,
    ignoredRscConsoleMessages: 0,
    ignoredFrameworkConsoleNoise: 0,
    ignoredDuplicateConsoleErrors: 0,
    actionableConsoleErrors: 0,
  };
  const savedConsoleKeys = new Set<string>();
  const pendingConsoleEvents: PendingConsoleEvent[] = [];

  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: false, serviceWorkers: "block" });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(SYSTEM_TEST_LIMITS.pageTimeoutMs);
    page.setDefaultTimeout(SYSTEM_TEST_LIMITS.actionTimeoutMs);

    // The runner cannot leave the normalized origin, including for assets or redirects.
    await page.route("**/*", async (route) => {
      const target = safeUrl(route.request().url(), input.origin);
      if (!target) return route.abort();
      return route.continue();
    });
    // A safe button probe must not be allowed to turn into a separate browsing
    // flow. Popup windows are outside this MVP's public-page crawl scope.
    page.on("popup", (popup) => {
      void popup.close().catch(() => undefined);
    });

    const flushConsoleEvents = (health: PageHealth) => {
      const eventsForPage = pendingConsoleEvents.splice(0, pendingConsoleEvents.length);
      for (const event of eventsForPage) {
        const classification = classifyConsoleMessage(event.normalizedMessage, health);
        if (classification.ignored) {
          ignored.ignoredConsoleEvents += 1;
          if (classification.reason === "rsc") ignored.ignoredRscConsoleMessages += 1;
          else if (classification.reason === "framework") ignored.ignoredFrameworkConsoleNoise += 1;
          continue;
        }
        const normalized = normalizeConsoleForDedup(event.normalizedMessage!);
        const dedupeKey = `${event.source}|${event.pageUrl}|${normalized}`;
        if (savedConsoleKeys.has(dedupeKey)) {
          ignored.ignoredConsoleEvents += 1;
          ignored.ignoredDuplicateConsoleErrors += 1;
          continue;
        }
        savedConsoleKeys.add(dedupeKey);
        ignored.actionableConsoleErrors += 1;
        addFinding(findings, input.runId, {
          severity: classification.severity!,
          category: event.source === "pageerror" ? "runtime_error" : "console_error",
          title: event.source === "pageerror" ? "Unhandled browser runtime error" : "Browser console error",
          pageUrl: event.pageUrl,
          actualResult: event.normalizedMessage!,
          evidence: {
            type: event.source,
            originalMessagePreview: event.originalMessage.slice(0, 500),
            normalizedMessage: event.normalizedMessage,
            pageUrl: event.pageUrl,
            classification: "actionable_console_or_runtime_error",
            pageLoadedSuccessfully: isHealthyPage(health),
            documentStatus: health.documentStatus,
            errorOverlayVisible: health.errorOverlayVisible,
            severityRationale: classification.severityRationale,
          },
          reproductionSteps: [`Open ${event.pageUrl}.`, "Open browser developer tools and inspect the Console."],
        });
      }
    };

    page.on("console", (message) => {
      if (message.type() !== "error") return;
      pendingConsoleEvents.push({ pageUrl: currentPageUrl, source: "console", originalMessage: message.text(), normalizedMessage: normalizeConsoleMessage(message.text()) });
    });

    page.on("pageerror", (error) => {
      pendingConsoleEvents.push({ pageUrl: currentPageUrl, source: "pageerror", originalMessage: error.message, normalizedMessage: normalizeConsoleMessage(error.message) });
    });

    page.on("requestfailed", (request) => {
      if (new URL(request.url()).origin !== input.origin) return;
      const failure = request.failure()?.errorText ?? "Request failed";
      const details = requestDetails(request);
      if (ABORTED_REQUEST.test(failure)) {
        ignored.ignoredAbortedRequests += 1;
        if (isStaticOrFrameworkResource(details)) ignored.ignoredStaticRequests += 1;
        return;
      }
      if (isStaticOrFrameworkResource(details) && !isActionableRequest(details)) {
        // A status-bearing static response is handled below. A bare image/font
        // failure is not enough evidence of a broken public workflow.
        ignored.ignoredStaticRequests += 1;
        return;
      }
      addFinding(findings, input.runId, {
        severity: isActionableRequest(details) ? "medium" : "low",
        category: "network_error",
        title: "Same-origin network request failed",
        pageUrl: currentPageUrl,
        action: `${details.method} ${details.requestUrl}`,
        actualResult: failure.slice(0, 1_000),
        evidence: { type: "request_failed", requestUrl: details.requestUrl, resourceType: details.resourceType, method: details.method, status: null, failureReason: failure, pageUrl: currentPageUrl, classification: isActionableRequest(details) ? "actionable_api_or_data_request_failure" : "non_static_request_failure" },
        reproductionSteps: [`Open ${currentPageUrl}.`, `Observe the failed ${details.method} request to ${details.requestUrl} in Network tools.`],
      });
    });

    page.on("response", (response) => {
      const request = response.request();
      if (request.resourceType() === "document" || response.status() < 400 || new URL(response.url()).origin !== input.origin) return;
      const details = requestDetails(request);
      addFinding(findings, input.runId, {
        severity: severityForNetworkStatus(response.status(), details),
        category: "network_error",
        title: `Same-origin network request returned HTTP ${response.status()}`,
        pageUrl: currentPageUrl,
        action: `${details.method} ${response.url()}`,
        actualResult: `Received HTTP ${response.status()}.`,
        evidence: { type: "network_response", requestUrl: response.url(), resourceType: details.resourceType, method: details.method, status: response.status(), failureReason: null, pageUrl: currentPageUrl, classification: isActionableRequest(details) ? "actionable_api_or_data_response" : "status_bearing_static_resource_response" },
        reproductionSteps: [`Open ${currentPageUrl}.`, `Inspect the ${details.method} request to ${response.url()} in Network tools.`],
      });
    });

    while (queue.length > 0 && visited.length < SYSTEM_TEST_LIMITS.maxPages) {
      const item = queue.shift()!;
      if (seen.has(item.url)) continue;
      seen.add(item.url);
      currentPageUrl = item.url;

      let responseStatus: number | null = null;
      let title: string | null = null;
      try {
        const response = await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: SYSTEM_TEST_LIMITS.pageTimeoutMs });
        responseStatus = response?.status() ?? null;
        const finalUrl = page.url();
        if (new URL(finalUrl).origin !== input.origin) {
          addFinding(findings, input.runId, {
            severity: "medium",
            category: "broken_page",
            title: "Public page navigated outside the allowed origin",
            pageUrl: item.url,
            actualResult: `Navigation ended at ${finalUrl}.`,
            evidence: { type: "cross_origin_navigation", requestedUrl: item.url, finalUrl },
            reproductionSteps: [`Open ${item.url}.`, `Observe navigation to ${finalUrl}.`],
          });
          continue;
        }
        currentPageUrl = finalUrl;
        title = await page.title().catch(() => null);
        visited.push({ url: currentPageUrl, status: responseStatus, title });
        const pageState = await page.evaluate(() => {
          const bodyText = document.body?.innerText?.trim() ?? "";
          const bodyContent = document.body?.textContent ?? "";
          return {
            bodyPresent: bodyText.length > 0,
            errorOverlayVisible: Boolean(document.querySelector("nextjs-portal, [data-nextjs-dialog-overlay], [data-nextjs-dialog]")) || /application error: a client-side exception|next\.js.*error|something went wrong/i.test(bodyContent),
          };
        }).catch(() => ({ bodyPresent: false, errorOverlayVisible: false }));
        flushConsoleEvents({ documentStatus: responseStatus, pageLoaded: true, bodyPresent: pageState.bodyPresent, errorOverlayVisible: pageState.errorOverlayVisible, navigationFailed: false });

        if (responseStatus === null || responseStatus >= 400) {
          addFinding(findings, input.runId, {
            severity: responseStatus !== null && responseStatus >= 500 ? "high" : "medium",
            category: item.discoveredFrom ? "broken_link" : "broken_page",
            title: responseStatus === null ? "Page did not return an HTTP response" : `Page returned HTTP ${responseStatus}`,
            pageUrl: currentPageUrl,
            action: item.discoveredFrom ? `Followed internal link from ${item.discoveredFrom}` : undefined,
            expectedResult: "The public page should return a successful response.",
            actualResult: responseStatus === null ? "No document response was available." : `Received HTTP ${responseStatus}.`,
            evidence: { type: "document_response", requestedUrl: item.url, finalUrl: currentPageUrl, status: responseStatus, discoveredFrom: item.discoveredFrom ?? null },
            reproductionSteps: [`Open ${item.discoveredFrom ?? input.targetUrl}.`, `Navigate to ${item.url}.`, `Observe HTTP ${responseStatus ?? "no response"}.`],
          });
        }

        if (responseStatus !== null && responseStatus < 400) {
          const links = await page.locator("a[href]").evaluateAll((anchors) => anchors.map((anchor) => (anchor as HTMLAnchorElement).href));
          for (const link of links) {
            const normalized = safeUrl(link, input.origin);
            if (!normalized || STATIC_PATH.test(new URL(normalized).pathname) || item.depth >= SYSTEM_TEST_LIMITS.maxDepth) continue;
            if (!seen.has(normalized)) queue.push({ url: normalized, depth: item.depth + 1, discoveredFrom: currentPageUrl });
          }
          await collectSafeButtons(page, currentPageUrl, findings, input.runId);
          flushConsoleEvents({ documentStatus: responseStatus, pageLoaded: true, bodyPresent: pageState.bodyPresent, errorOverlayVisible: pageState.errorOverlayVisible, navigationFailed: false });
        }
      } catch (error) {
        visited.push({ url: item.url, status: null, title: null });
        flushConsoleEvents({ documentStatus: null, pageLoaded: false, bodyPresent: false, errorOverlayVisible: false, navigationFailed: true });
        addFinding(findings, input.runId, {
          severity: "medium",
          category: item.discoveredFrom ? "broken_link" : "broken_page",
          title: "Public page could not be loaded",
          pageUrl: item.url,
          action: item.discoveredFrom ? `Followed internal link from ${item.discoveredFrom}` : undefined,
          expectedResult: "The public page should load successfully.",
          actualResult: error instanceof Error ? error.message.slice(0, 1_000) : "Browser navigation failed.",
          evidence: { type: "navigation_error", url: item.url, error: error instanceof Error ? error.message.slice(0, 1_000) : "Unknown navigation error" },
          reproductionSteps: [`Open ${item.url}.`, "Observe the navigation failure."],
        });
      }
    }

    await context.close();
  } finally {
    await browser.close();
  }

  const { findings: deduped, ignoredDuplicates } = deduplicateFindings(findings);
  const severityCounts: Record<SystemTestSeverity, number> = { high: 0, medium: 0, low: 0, info: 0 };
  for (const finding of deduped) severityCounts[finding.severity] += 1;
  return {
    findings: deduped,
    summary: {
      pagesChecked: visited.length,
      pagesVisited: visited,
      findingsCount: deduped.length,
      actionableFindings: deduped.length,
      severityCounts,
      ignoredAbortedRequests: ignored.ignoredAbortedRequests,
      ignoredStaticRequests: ignored.ignoredStaticRequests,
      ignoredDuplicateFindings: ignoredDuplicates,
      ignoredConsoleEvents: ignored.ignoredConsoleEvents,
      ignoredRscConsoleMessages: ignored.ignoredRscConsoleMessages,
      ignoredFrameworkConsoleNoise: ignored.ignoredFrameworkConsoleNoise,
      ignoredDuplicateConsoleErrors: ignored.ignoredDuplicateConsoleErrors,
      actionableConsoleErrors: ignored.actionableConsoleErrors,
      limits: { maxPages: SYSTEM_TEST_LIMITS.maxPages, maxDepth: SYSTEM_TEST_LIMITS.maxDepth },
    },
  };
}

function normalizeForDedup(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\?_rsc=[^\s&]+/g, "")
    .replace(/\n\s*at\s+.*$/gim, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function deduplicateFindings(findings: NewSystemTestFinding[]): { findings: NewSystemTestFinding[]; ignoredDuplicates: number } {
  const seen = new Set<string>();
  let ignoredDuplicates = 0;
  const unique = findings.filter((finding) => {
    const key = [finding.category, finding.page_url, normalizeForDedup(finding.actual_result), normalizeForDedup(finding.action)].join("|");
    if (seen.has(key)) {
      ignoredDuplicates += 1;
      return false;
    }
    seen.add(key);
    return true;
  });
  return { findings: unique, ignoredDuplicates };
}
