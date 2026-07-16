import type { ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clipboard,
  Code2,
  Database,
  Eye,
  FileCode2,
  FileSearch,
  Gauge,
  GitBranch,
  KeyRound,
  Lock,
  Network,
  Play,
  RotateCcw,
  ScanLine,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305.998.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function SectionIntro({
  eyebrow,
  title,
  description,
  centered = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  centered?: boolean;
}) {
  return (
    <div className={cn("max-w-3xl", centered && "mx-auto text-center")}>
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-cc-muted">
        {eyebrow}
      </p>
      <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-cc-text sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-balance text-base leading-7 text-cc-muted sm:text-lg">
        {description}
      </p>
    </div>
  );
}

function DemoWindow({
  title,
  label = "Example product view",
  children,
}: {
  title: string;
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-cc-border-strong bg-[#0f0f0f] shadow-[0_28px_80px_rgba(0,0,0,0.34)]">
      <div className="flex h-11 items-center gap-3 border-b border-cc-border bg-cc-secondary px-4">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
          <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        </div>
        <span className="min-w-0 flex-1 truncate text-center text-[11px] font-medium text-cc-subtle">
          {title}
        </span>
        <span className="hidden rounded-md border border-cc-border px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-cc-subtle sm:block">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function RiskBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "critical" | "high" | "medium" | "safe" | "neutral";
}) {
  const tones = {
    critical: "border-red-500/20 bg-red-500/10 text-red-300",
    high: "border-orange-500/20 bg-orange-500/10 text-orange-300",
    medium: "border-amber-500/20 bg-amber-500/10 text-amber-300",
    safe: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
    neutral: "border-cc-border bg-white/[0.03] text-cc-muted",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

function HeroProductDemo() {
  const findings = [
    { title: "Missing server-side authorization", tone: "critical" as const },
    { title: "Missing rate limiting", tone: "high" as const },
    { title: "Hardcoded API key", tone: "high" as const },
  ];

  return (
    <DemoWindow title="CtrlCode · demo/saas-app" label="Illustrative demo data">
      <div className="grid min-h-[590px] lg:grid-cols-[190px_minmax(0,1fr)_310px]">
        <aside className="hidden border-r border-cc-border bg-[#121212] p-4 lg:flex lg:flex-col">
          <BrandLogo
            href="#product"
            iconClassName="h-4 w-4"
            wordmarkClassName="text-base"
          />
          <div className="mt-8 space-y-1 text-xs">
            <div className="flex items-center gap-2 rounded-lg border border-cc-border bg-white/[0.05] px-3 py-2.5 text-cc-text">
              <Activity className="h-3.5 w-3.5" />
              Report
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 text-cc-subtle">
              <ShieldAlert className="h-3.5 w-3.5" />
              Findings
              <span className="ml-auto rounded bg-white/[0.06] px-1.5 py-0.5">8</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 text-cc-subtle">
              <FileCode2 className="h-3.5 w-3.5" />
              Files reviewed
            </div>
          </div>
          <div className="mt-auto rounded-lg border border-cc-border bg-cc-surface p-3">
            <p className="truncate text-xs font-medium text-cc-text">demo/saas-app</p>
            <p className="mt-1 text-[10px] text-cc-subtle">main · Review complete</p>
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 border-b border-cc-border pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <RiskBadge tone="neutral">Example review</RiskBadge>
                <RiskBadge tone="medium">Needs attention</RiskBadge>
              </div>
              <h3 className="text-xl font-semibold tracking-tight text-cc-text">
                Security Officer Report
              </h3>
              <p className="mt-1.5 text-xs text-cc-subtle">
                demo/saas-app · production-readiness review
              </p>
            </div>
            <div className="flex w-fit items-end gap-1 rounded-xl border border-cc-border bg-cc-surface px-4 py-3">
              <span className="text-3xl font-semibold tracking-[-0.05em] text-cc-text">64</span>
              <span className="mb-1 text-xs text-cc-subtle">/ 100</span>
            </div>
          </div>

          <div className="grid gap-3 py-5 sm:grid-cols-3">
            {[
              ["Critical", "1", "text-red-300"],
              ["High", "3", "text-orange-300"],
              ["Medium", "4", "text-amber-300"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-xl border border-cc-border bg-cc-surface p-3.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-cc-subtle">{label}</p>
                <p className={cn("mt-2 text-2xl font-semibold", color)}>{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-cc-border bg-cc-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-cc-text">Executive summary</p>
                <p className="mt-2 text-xs leading-5 text-cc-muted">
                  Authorization and abuse-prevention gaps should be addressed before
                  production release. Start with the upload route and exposed secret.
                </p>
              </div>
              <ShieldAlert className="hidden h-8 w-8 shrink-0 text-amber-300 sm:block" />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-cc-subtle">
              Prioritized findings
            </p>
            {findings.map((finding, index) => (
              <div
                key={finding.title}
                className="flex items-center gap-3 rounded-lg border border-cc-border bg-white/[0.025] px-3 py-3"
              >
                <span className="text-[10px] tabular-nums text-cc-subtle">0{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-cc-text">
                  {finding.title}
                </span>
                <RiskBadge tone={finding.tone}>{finding.tone}</RiskBadge>
              </div>
            ))}
          </div>
        </div>

        <aside className="border-t border-cc-border bg-[#151515] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <RiskBadge tone="critical">Critical</RiskBadge>
              <h4 className="mt-3 text-sm font-semibold text-cc-text">
                Missing server-side authorization
              </h4>
            </div>
            <span className="rounded-md border border-cc-border p-1.5 text-cc-subtle">
              <FileSearch className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="mt-4 rounded-lg border border-cc-border bg-[#0d0d0d]">
            <div className="border-b border-cc-border px-3 py-2 font-mono text-[10px] text-cc-subtle">
              src/app/api/upload/route.ts
            </div>
            <pre className="overflow-x-auto p-3 text-[10px] leading-5 text-cc-muted">
              <code>
                <span className="text-cc-subtle">18</span>{"  "}
                <span className="text-violet-300">export async function</span>{" "}
                POST(req) {"{"}{"\n"}
                <span className="text-cc-subtle">19</span>{"    "}
                <span className="text-violet-300">const</span> body = await req.json(){"\n"}
                <span className="text-cc-subtle">20</span>{"    "}return upload(body){"\n"}
                <span className="text-cc-subtle">21</span>{"  }"}
              </code>
            </pre>
          </div>
          <div className="mt-4 rounded-lg border border-violet-400/15 bg-violet-400/[0.05] p-3">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-violet-200">
              <Sparkles className="h-3 w-3" />
              Agent-ready fix prompt
            </div>
            <p className="mt-2 text-xs leading-5 text-cc-muted">
              Add server-side authorization, validate input, and rate-limit this route.
            </p>
            <span className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-cc-border-strong bg-cc-surface-raised text-[11px] font-medium text-cc-text">
              <Clipboard className="h-3 w-3" />
              Copy for Cursor/Codex
            </span>
          </div>
          <p className="mt-3 text-[10px] leading-4 text-cc-subtle">
            Example content shown to demonstrate the product workflow.
          </p>
        </aside>
      </div>
    </DemoWindow>
  );
}

function ProductStorySection({
  number,
  eyebrow,
  title,
  description,
  bullets,
  visual,
  reverse = false,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets?: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="border-t border-cc-border py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-6 lg:grid-cols-2 lg:gap-20">
        <div className={cn(reverse && "lg:order-2")}>
          <div className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-cc-subtle">
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-cc-border-strong text-cc-muted">
              {number}
            </span>
            {eyebrow}
          </div>
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-cc-text sm:text-4xl">
            {title}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-cc-muted">{description}</p>
          {bullets ? (
            <ul className="mt-7 space-y-3">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-sm text-cc-muted">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-cc-text" />
                  {bullet}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className={cn(reverse && "lg:order-1")}>{visual}</div>
      </div>
    </section>
  );
}

function ConnectionVisual() {
  return (
    <DemoWindow title="GitHub connection">
      <div className="p-5 sm:p-7">
        <div className="rounded-xl border border-cc-border bg-cc-surface p-5">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cc-border-strong bg-cc-surface-raised">
              <GithubIcon className="h-5 w-5 text-cc-text" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-cc-text">GitHub connected</p>
                <RiskBadge tone="safe">Read only</RiskBadge>
              </div>
              <p className="mt-1 text-xs text-cc-subtle">@demo-builder · example account</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-cc-border pt-5">
            {[
              [Eye, "Read repository contents"],
              [GitBranch, "Review the selected branch"],
              [Lock, "No write or push permissions"],
            ].map(([Icon, label]) => {
              const ItemIcon = Icon as typeof Eye;
              return (
                <div key={label as string} className="flex items-center gap-3 text-sm text-cc-muted">
                  <ItemIcon className="h-4 w-4 text-cc-text" />
                  <span className="flex-1">{label as string}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DemoWindow>
  );
}

function ScanVisual() {
  const files = [
    ["app/api/auth/route.ts", "Authorization"],
    ["app/api/upload/route.ts", "Input + abuse"],
    ["lib/supabase/server.ts", "Data access"],
    [".env.example", "Secrets"],
  ];
  return (
    <DemoWindow title="Repository review">
      <div className="p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-cc-text">Reviewing demo/saas-app</p>
            <p className="mt-1 text-xs text-cc-subtle">Analyzing security boundaries</p>
          </div>
          <RiskBadge tone="neutral">Example scan</RiskBadge>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-cc-surface-raised">
          <div className="h-full w-[72%] rounded-full bg-cc-text" />
        </div>
        <div className="mt-5 space-y-2">
          {files.map(([path, check], index) => (
            <div key={path} className="flex items-center gap-3 rounded-lg border border-cc-border bg-cc-surface px-3 py-3">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-md border border-cc-border", index < 3 ? "text-emerald-300" : "text-cc-subtle")}>
                {index < 3 ? <Check className="h-3.5 w-3.5" /> : <CircleDot className="h-3.5 w-3.5" />}
              </span>
              <code className="min-w-0 flex-1 truncate text-[11px] text-cc-muted">{path}</code>
              <span className="hidden text-[10px] text-cc-subtle sm:block">{check}</span>
            </div>
          ))}
        </div>
      </div>
    </DemoWindow>
  );
}

function SystemTestingVisual() {
  const activity = [
    { label: "Homepage loaded", tone: "safe" as const, icon: Check },
    { label: "Sign-in page opened", tone: "safe" as const, icon: Check },
    { label: "Console error detected", tone: "medium" as const, icon: AlertTriangle },
    { label: "Failed API request", tone: "high" as const, icon: AlertTriangle },
    { label: "Pricing navigation completed", tone: "safe" as const, icon: Check },
  ];

  return (
    <DemoWindow title="System Testing · demo-app.example" label="Illustrative test run">
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 border-b border-cc-border pb-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <RiskBadge tone="neutral">Example product view</RiskBadge>
              <RiskBadge tone="medium">Needs attention</RiskBadge>
            </div>
            <p className="text-lg font-semibold text-cc-text">System Testing</p>
            <p className="mt-1 text-xs text-cc-subtle">demo-app.example · safe browser check</p>
          </div>
          <RiskBadge tone="safe">Test complete</RiskBadge>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {[
            ["Pages checked", "6"],
            ["Workflows", "2"],
            ["Findings", "4"],
            ["Status", "Review"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-cc-border bg-cc-surface p-3.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-cc-subtle">{label}</p>
              <p className="mt-2 truncate text-lg font-semibold text-cc-text">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="rounded-xl border border-cc-border bg-cc-surface p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle">
              Browser activity
            </p>
            <div className="mt-4 space-y-2">
              {activity.map(({ label, tone, icon: Icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg border border-cc-border bg-white/[0.025] px-3 py-2.5">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border",
                      tone === "safe" && "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
                      tone === "medium" && "border-amber-500/20 bg-amber-500/10 text-amber-300",
                      tone === "high" && "border-orange-500/20 bg-orange-500/10 text-orange-300"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-cc-muted">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-orange-500/20 bg-orange-500/[0.04] p-4">
            <RiskBadge tone="high">High</RiskBadge>
            <h3 className="mt-3 text-sm font-semibold text-cc-text">
              Failed pricing API request
            </h3>
            <p className="mt-2 text-xs leading-5 text-cc-muted">
              GET /api/pricing returned 500 during the pricing workflow.
            </p>
            <div className="mt-4 rounded-lg border border-cc-border bg-[#0d0d0d] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle">
                Evidence
              </p>
              <dl className="mt-3 space-y-2 text-[11px] text-cc-muted">
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-cc-subtle">Page</dt>
                  <dd className="min-w-0 truncate">/pricing</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-cc-subtle">Request</dt>
                  <dd className="min-w-0 truncate">GET /api/pricing</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-14 shrink-0 text-cc-subtle">Status</dt>
                  <dd>500</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </DemoWindow>
  );
}

function ReportVisual() {
  return (
    <DemoWindow title="Security Officer Report">
      <div className="p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <RiskBadge tone="medium">Needs attention</RiskBadge>
            <p className="mt-3 text-lg font-semibold text-cc-text">Production readiness</p>
            <p className="mt-1 text-xs text-cc-subtle">Example report · demo/saas-app</p>
          </div>
          <p className="text-3xl font-semibold tracking-tight text-cc-text">
            64<span className="text-sm text-cc-subtle"> / 100</span>
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {[
            ["Business impact", "Unauthorized uploads could expose storage and increase abuse costs."],
            ["Quick win", "Require a verified session before parsing the request body."],
            ["Top risk", "The upload route trusts all incoming requests."],
            ["Next step", "Protect the route, add validation, then rescan."],
          ].map(([title, copy]) => (
            <div key={title} className="rounded-xl border border-cc-border bg-cc-surface p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cc-subtle">{title}</p>
              <p className="mt-2 text-xs leading-5 text-cc-muted">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </DemoWindow>
  );
}

function FindingVisual() {
  return (
    <DemoWindow title="Finding detail">
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge tone="critical">Critical</RiskBadge>
          <span className="text-xs text-cc-subtle">Authorization · line 18</span>
        </div>
        <h3 className="mt-4 text-base font-semibold text-cc-text">
          Missing server-side authorization
        </h3>
        <div className="mt-5 overflow-hidden rounded-xl border border-cc-border bg-[#0d0d0d]">
          <div className="flex items-center justify-between border-b border-cc-border px-4 py-2.5">
            <code className="min-w-0 truncate text-[10px] text-cc-subtle">
              src/app/api/upload/route.ts
            </code>
            <span className="text-[10px] text-cc-subtle">18–21</span>
          </div>
          <pre className="overflow-x-auto p-4 text-[11px] leading-6 text-cc-muted">
            <code>
              <span className="text-cc-subtle">18</span>{"  "}
              <span className="text-violet-300">export async function</span> POST(req) {"{"}{"\n"}
              <span className="text-cc-subtle">19</span>{"    "}
              <span className="text-violet-300">const</span> body = await req.json(){"\n"}
              <span className="text-cc-subtle">20</span>{"    "}return upload(body){"\n"}
              <span className="text-cc-subtle">21</span>{"  }"}
            </code>
          </pre>
        </div>
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-orange-500/15 bg-orange-500/[0.04] p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-orange-300" />
          <p className="text-xs leading-5 text-cc-muted">
            Any unauthenticated caller can reach the upload handler.
          </p>
        </div>
      </div>
    </DemoWindow>
  );
}

function FixPromptVisual() {
  return (
    <DemoWindow title="AI-ready remediation">
      <div className="p-5 sm:p-7">
        <div className="rounded-xl border border-violet-400/15 bg-violet-400/[0.04] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-200" />
              <p className="text-xs font-semibold text-cc-text">Fix prompt</p>
            </div>
            <RiskBadge tone="neutral">Example</RiskBadge>
          </div>
          <p className="mt-5 text-sm leading-7 text-cc-muted">
            Protect the upload route with server-side session validation. Reject
            unauthenticated requests before parsing input, validate the payload against
            an explicit schema, and add per-user rate limiting. Preserve the current
            response shape and include tests for unauthorized and malformed requests.
          </p>
          <span className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-cc-text px-4 text-xs font-semibold text-cc-bg">
            <Clipboard className="h-3.5 w-3.5" />
            Copy for Cursor/Codex
          </span>
        </div>
      </div>
    </DemoWindow>
  );
}

const coverage = [
  { icon: ShieldAlert, title: "Security risks" },
  { icon: Lock, title: "Auth and access control" },
  { icon: Server, title: "API and route safety" },
  { icon: KeyRound, title: "Secrets and environment handling" },
  { icon: Database, title: "Database, RLS, and data exposure" },
  { icon: Gauge, title: "Rate limits and abuse prevention" },
  { icon: Network, title: "Architecture weaknesses" },
  { icon: ShieldCheck, title: "Production readiness and reliability risks" },
  {
    icon: FileSearch,
    title: "Live application testing",
    description: "Browser behavior, failed requests, runtime errors, and safe workflow checks.",
  },
  { icon: TerminalSquare, title: "AI-ready remediation prompts" },
];

export function LandingPage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-cc-border">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.075),transparent_62%)]" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-[0.22] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-24 text-center sm:px-6 sm:pb-28 sm:pt-32 lg:pt-40">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-cc-border-strong bg-white/[0.035] px-3 py-1.5 text-xs font-medium text-cc-muted">
            <ShieldCheck className="h-3.5 w-3.5 text-cc-text" />
            AI Security Officer for code and live apps
          </div>
          <h1 className="mx-auto mt-8 max-w-5xl text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.06em] text-cc-text sm:text-6xl lg:text-[5.5rem]">
            Review your code
            <span className="block text-cc-muted">before attackers do.</span>
          </h1>
          <p className="mx-auto mt-7 max-w-3xl text-balance text-base leading-7 text-cc-muted sm:text-lg">
            CtrlCode reviews your GitHub repository and tests your deployed application
            to uncover security risks, broken workflows, runtime failures, and
            production-readiness issues. Get prioritized findings and focused fix
            prompts for Cursor or Codex.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/login" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-cc-text px-6 text-sm font-semibold text-cc-bg transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:w-auto">
              Start review <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#how-it-works" className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-cc-border-strong bg-white/[0.025] px-6 text-sm font-medium text-cc-text transition-colors hover:bg-cc-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:w-auto">
              <Play className="h-3.5 w-3.5" /> See how it works
            </Link>
          </div>
          <div className="mx-auto mt-8 flex max-w-xl flex-col items-center justify-center gap-3 text-xs text-cc-subtle sm:flex-row sm:gap-6">
            <span className="flex items-center gap-2"><Eye className="h-3.5 w-3.5" /> Read-only access</span>
            <span className="flex items-center gap-2"><Code2 className="h-3.5 w-3.5" /> No code modifications</span>
            <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5" /> Private scan results</span>
          </div>
        </div>
        <div id="product" className="relative mx-auto max-w-[1440px] px-3 pb-16 sm:px-6 sm:pb-24">
          <HeroProductDemo />
        </div>
      </section>

      <section id="how-it-works" className="py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionIntro
            eyebrow="From repository to remediation"
            title="One review loop. Every risk in context."
            description="CtrlCode connects high-level security posture to the exact code and runtime evidence that need attention, then helps your coding agent act on it."
            centered
          />
          <div className="mx-auto mt-14 grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-cc-border bg-cc-border sm:grid-cols-2 lg:grid-cols-5">
            {[
              [GithubIcon, "Connect GitHub"],
              [ScanLine, "Review code"],
              [Activity, "Test live app"],
              [FileSearch, "Inspect findings"],
              [TerminalSquare, "Fix and verify"],
            ].map(([Icon, label], index) => {
              const StepIcon = Icon as typeof ScanLine;
              return (
                <div key={label as string} className="bg-cc-secondary p-5">
                  <div className="flex items-center justify-between">
                    <StepIcon className="h-4 w-4 text-cc-text" />
                    <span className="text-[10px] tabular-nums text-cc-subtle">0{index + 1}</span>
                  </div>
                  <p className="mt-6 text-sm font-medium text-cc-text">{label as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <ProductStorySection number="01" eyebrow="Connect GitHub safely" title="Review code without giving up control." description="Connect the repository you want to assess. CtrlCode uses read-only repository access to review code without writing, pushing, or modifying files." bullets={["Choose the repository and branch you want reviewed.", "Repository access stays focused on analysis.", "Your code is never modified by the review."]} visual={<ConnectionVisual />} />
      <ProductStorySection number="02" eyebrow="Production-readiness review" title="Check the boundaries attackers look for." description="CtrlCode reviews authentication boundaries, API routes, environment handling, rate limits, data exposure, dependencies, and architecture risks." visual={<ScanVisual />} reverse />
      <ProductStorySection number="03" eyebrow="Live System Testing" title="Test what the code does in the real application." description="Run a controlled browser-based test against your deployed or staging application. CtrlCode checks real page behavior, runtime errors, failed requests, navigation, and supported workflows without performing destructive actions." bullets={["Observe real pages in a controlled browser session.", "Capture runtime, console, network, and navigation failures.", "Keep testing safe, same-origin, and non-destructive."]} visual={<SystemTestingVisual />} />
      <ProductStorySection number="04" eyebrow="Security Officer Report" title="See what matters before reading every finding." description="Start with the executive summary, business impact, technical risks, production readiness, top risks, quick wins, and remediation roadmap." visual={<ReportVisual />} reverse />
      <ProductStorySection number="05" eyebrow="Exact finding context" title="Move from posture to the vulnerable line." description="Inspect the affected file, available line context, evidence, impact, and a practical recommendation—without losing the bigger picture." visual={<FindingVisual />} />
      <ProductStorySection number="06" eyebrow="Agent-ready remediation" title="Give Cursor or Codex a focused fix brief." description="Copy a structured prompt with the issue, constraints, and expected outcome so your coding agent can implement a safer change." visual={<FixPromptVisual />} reverse />

      <section className="border-t border-cc-border bg-cc-secondary py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionIntro eyebrow="Review coverage" title="A production-readiness lens across your codebase." description="CtrlCode helps identify and prioritize risks across the surfaces that commonly decide whether an application is ready to ship." />
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-cc-border bg-cc-border sm:grid-cols-2 lg:grid-cols-5">
            {coverage.map(({ icon: Icon, title, description }) => (
              <div key={title} className="group min-h-40 bg-cc-bg p-5 transition-colors hover:bg-cc-surface">
                <Icon className="h-5 w-5 text-cc-muted transition-colors group-hover:text-cc-text" />
                <p className="mt-10 text-sm font-medium leading-5 text-cc-text">{title}</p>
                {description ? <p className="mt-2 text-xs leading-5 text-cc-subtle">{description}</p> : null}
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-cc-subtle">
            CtrlCode assists with code review, system testing, and prioritization; it does
            not guarantee that a repository or deployed application is free from issues.
          </p>
        </div>
      </section>

      <section className="border-t border-cc-border py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <SectionIntro eyebrow="The fix loop" title="Review. Fix. Rescan." description="Use each finding as a working loop with your coding agent: review the evidence, apply the focused fix, then rescan the repository or rerun the system test." centered />
          <div className="mx-auto mt-14 max-w-6xl rounded-2xl border border-cc-border-strong bg-cc-secondary p-4 sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-4 border-b border-cc-border pb-5">
              <div>
                <p className="text-sm font-medium text-cc-text">Example remediation flow</p>
                <p className="mt-1 text-xs text-cc-subtle">Illustrative scores, not a guaranteed outcome</p>
              </div>
              <RotateCcw className="h-4 w-4 text-cc-subtle" />
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] md:items-center">
              {[
                [ScanLine, "Review", "51 / 100"],
                [Activity, "Test", "Browser check"],
                [Clipboard, "Prioritize", "Evidence first"],
                [Code2, "Fix", "In your editor"],
                [RotateCcw, "Verify", "82 / 100"],
              ].map(([Icon, title, detail], index) => {
                const FlowIcon = Icon as typeof ScanLine;
                return (
                  <div key={title as string} className="contents">
                    <div className="rounded-xl border border-cc-border bg-cc-bg p-4">
                      <FlowIcon className="h-4 w-4 text-cc-text" />
                      <p className="mt-5 text-sm font-medium text-cc-text">{title as string}</p>
                      <p className="mt-1 text-[11px] text-cc-subtle">{detail as string}</p>
                    </div>
                    {index < 4 ? <ChevronRight className="mx-auto hidden h-4 w-4 text-cc-subtle md:block" /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-cc-border px-5 py-20 sm:px-6 sm:py-28">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-cc-border-strong bg-cc-surface px-6 py-16 text-center sm:px-12 sm:py-20">
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_65%)]" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cc-subtle">Ready for review</p>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.05em] text-cc-text sm:text-5xl">Ship safer code with CtrlCode.</h2>
            <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-cc-muted">Connect GitHub, review your code, test your deployed application, and get focused findings in minutes.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/login" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-cc-text px-6 text-sm font-semibold text-cc-bg hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
                Start review <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="inline-flex h-12 items-center justify-center rounded-lg border border-cc-border-strong px-6 text-sm font-medium text-cc-text transition-colors hover:bg-cc-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
                View pricing
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
