import "server-only";

import type { Browser } from "playwright-core";

export type SystemTestRunnerMode = "local" | "serverless-chromium" | "disabled";

type ConfiguredRunnerMode = SystemTestRunnerMode | "auto";

export class BrowserLaunchUnavailableError extends Error {
  constructor(
    message: string,
    public readonly mode: SystemTestRunnerMode,
    public readonly causeMessage?: string
  ) {
    super(message);
    this.name = "BrowserLaunchUnavailableError";
  }
}

function configuredMode(): ConfiguredRunnerMode {
  const raw = process.env.SYSTEM_TEST_RUNNER_MODE?.trim().toLowerCase();
  if (raw === "local" || raw === "serverless-chromium" || raw === "disabled" || raw === "auto") return raw;
  return "auto";
}

function selectMode(): SystemTestRunnerMode {
  const mode = configuredMode();
  if (mode !== "auto") return mode;
  return process.env.NODE_ENV === "production" ? "serverless-chromium" : "local";
}

function safeReason(error: unknown): string {
  return error instanceof Error ? error.message.slice(0, 300) : "unknown";
}

export async function launchSystemTestBrowser(): Promise<{ browser: Browser; mode: SystemTestRunnerMode }> {
  const mode = selectMode();
  const runtime = process.env.NEXT_RUNTIME ?? "nodejs";
  console.info("[system-tests] browser launch selected", {
    environment: process.env.NODE_ENV,
    runtime,
    configuredMode: configuredMode(),
    selectedMode: mode,
  });

  if (mode === "disabled") {
    throw new BrowserLaunchUnavailableError("System testing runner is disabled in this deployment.", mode);
  }

  if (mode === "serverless-chromium") {
    try {
      const [{ chromium: playwrightChromium }, chromiumModule] = await Promise.all([
        import("playwright-core"),
        import("@sparticuz/chromium"),
      ]);
      const serverlessChromium = chromiumModule.default;
      serverlessChromium.setGraphicsMode = false;
      const executablePath = await serverlessChromium.executablePath();
      const browser = await playwrightChromium.launch({
        args: [
          ...serverlessChromium.args,
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-sandbox",
        ],
        executablePath,
        headless: true,
      });
      console.info("[system-tests] browser launch ready", {
        mode,
        environment: process.env.NODE_ENV,
        runtime,
        productionChromiumExecutableAvailable: Boolean(executablePath),
      });
      return { browser, mode };
    } catch (error) {
      const reason = safeReason(error);
      console.warn("[system-tests] browser launch failed", {
        mode,
        environment: process.env.NODE_ENV,
        runtime,
        productionChromiumExecutableAvailable: false,
        reason,
      });
      throw new BrowserLaunchUnavailableError("System testing browser could not start in this deployment. Please contact support.", mode, reason);
    }
  }

  try {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });
    console.info("[system-tests] browser launch ready", {
      mode,
      environment: process.env.NODE_ENV,
      runtime,
      localPlaywrightAvailable: true,
    });
    return { browser, mode };
  } catch (error) {
    const reason = safeReason(error);
    console.warn("[system-tests] browser launch failed", {
      mode,
      environment: process.env.NODE_ENV,
      runtime,
      localPlaywrightAvailable: false,
      reason,
    });
    throw new BrowserLaunchUnavailableError("System testing browser could not start in this environment. Run `npx playwright install chromium` locally or configure serverless Chromium in production.", mode, reason);
  }
}
