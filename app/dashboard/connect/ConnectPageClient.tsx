"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle,
  Clock,
  ExternalLink,
  FileSearch,
  GitBranch,
  GitFork,
  Loader2,
  Lock,
  Play,
  RefreshCw,
  Search,
  Shield,
  Unlock,
} from "lucide-react";
import type { SafeRepo } from "@/services/github/RepoFetcher";
import {
  AppPageContainer,
  AppPageHeader,
  AppSectionHeader,
} from "@/components/layout/app-page";
import { SurfaceCard } from "@/components/dashboard/dashboard-ui";
import { formatSafeDate } from "@/lib/date";
import { cn } from "@/lib/utils";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.418-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.468-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  github_denied: "GitHub authorization was denied. Please try again.",
  invalid_callback: "Invalid callback parameters. Please try again.",
  state_mismatch: "Security validation failed. Please start the connection again.",
  token_exchange_failed:
    "Failed to complete GitHub authorization. Please try again.",
  token_save_failed:
    "GitHub token was received but could not be saved. Please try again.",
  github_not_configured:
    "GitHub repository connection is not configured. Please contact support.",
};

const REPO_ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "GitHub connection expired. Reconnect to refresh access.",
  rate_limited:
    "GitHub rate limit reached. Please try again in a few minutes.",
  network_error:
    "Unable to reach GitHub. Please check your connection and try again.",
  unknown: "Unable to load repositories. Please try reconnecting GitHub.",
};

interface ConnectPageClientProps {
  connected: boolean;
  githubLogin: string | null;
  connectedAt: string | null;
  repositories: SafeRepo[];
  repoError:
    | "invalid_token"
    | "rate_limited"
    | "network_error"
    | "unknown"
    | null;
  successParam: string | null;
  errorParam: string | null;
  scanUsage: {
    used: number;
    limit: number;
    remaining: number;
    allowed: boolean;
    resetAt: string;
    planLabel: string;
    isAdmin: boolean;
    upgradeUrl: string;
  };
}

function WorkflowSteps({ connected }: { connected: boolean }) {
  const steps = [
    {
      label: "Connect GitHub",
      detail: "Authorize repository access.",
      icon: GithubIcon,
      complete: connected,
    },
    {
      label: "Select repository",
      detail: "Choose the codebase to review.",
      icon: GitFork,
      complete: false,
    },
    {
      label: "Run CtrlCode review",
      detail: "Inspect security and readiness.",
      icon: FileSearch,
      complete: false,
    },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <div
            key={step.label}
            className="flex items-start gap-3 rounded-xl border border-cc-border bg-cc-bg-secondary p-4"
          >
            <span
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                step.complete
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-cc-border-strong bg-cc-surface-raised text-cc-muted"
              )}
            >
              {step.complete ? (
                <Check className="h-4 w-4" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
            </span>
            <div>
              <p className="text-xs font-medium text-cc-subtle">
                Step {index + 1}
              </p>
              <p className="mt-1 text-sm font-semibold text-cc-text">
                {step.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-cc-muted">
                {step.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RepositoryCard({ repo, scanUsage }: { repo: SafeRepo; scanUsage: ConnectPageClientProps["scanUsage"] }) {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  async function handleStartScan() {
    if (isScanning || !scanUsage.allowed) return;
    setIsScanning(true);
    setScanError(null);

    try {
      const res = await fetch("/api/scans/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: repo.id,
          repoName: repo.name,
          repoFullName: repo.full_name,
          repoUrl: repo.html_url,
          defaultBranch: repo.default_branch,
        }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        setScanError(
          typeof json.error === "string"
            ? json.error
            : "Unable to create scan. Please try again."
        );
        return;
      }

      router.push(`/scan/${json.scanId}`);
    } catch {
      setScanError("Network error. Please try again.");
    } finally {
      setIsScanning(false);
    }
  }

  return (
    <article className="group flex min-w-0 flex-col rounded-2xl border border-cc-border bg-cc-surface p-5 transition-colors hover:border-cc-border-strong hover:bg-cc-surface-raised">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cc-border bg-cc-bg-secondary text-cc-muted group-hover:text-cc-text">
            <GitFork className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-cc-text">
              {repo.name}
            </h3>
            <p className="mt-1 truncate text-xs text-cc-subtle">
              {repo.full_name}
            </p>
          </div>
        </div>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${repo.full_name} on GitHub`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-cc-subtle outline-none transition-colors hover:bg-cc-surface-hover hover:text-cc-text focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]",
            repo.private
              ? "border-amber-500/20 bg-amber-500/10 text-amber-400"
              : "border-cc-border-strong bg-cc-bg-secondary text-cc-muted"
          )}
        >
          {repo.private ? (
            <Lock className="h-3 w-3" />
          ) : (
            <Unlock className="h-3 w-3" />
          )}
          {repo.private ? "Private" : "Public"}
        </span>
        <span className="inline-flex min-w-0 items-center gap-1 rounded-full border border-cc-border bg-cc-bg-secondary px-2 py-0.5 text-[10px] text-cc-muted">
          <GitBranch className="h-3 w-3 shrink-0" />
          <span className="max-w-32 truncate">{repo.default_branch}</span>
        </span>
      </div>

      <div className="mt-5 border-t border-cc-border pt-4">
        <div className="flex items-center gap-2 text-xs text-cc-subtle">
          <Clock className="h-3.5 w-3.5" />
          GitHub updated {formatSafeDate(repo.updated_at)}
        </div>
        <p className="mt-2 text-xs text-cc-muted">
          Review history is available after the first scan.
        </p>
      </div>

      {!scanUsage.allowed && (
        <div
          role="status"
          className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2.5"
        >
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
          <p className="text-xs leading-5 text-amber-100">
            Daily scan limit reached. <a href={scanUsage.upgradeUrl} className="font-semibold text-cc-text underline decoration-white/20 underline-offset-4">Upgrade</a> to run more reviews.
          </p>
        </div>
      )}

      {scanError && (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2.5"
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
          <p className="text-xs leading-5 text-red-300">{scanError}</p>
        </div>
      )}

      <button
        type="button"
        onClick={handleStartScan}
        disabled={isScanning || !scanUsage.allowed}
        className="mt-5 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-cc-text px-4 py-2.5 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-cc-surface disabled:pointer-events-none disabled:opacity-50"
      >
        {isScanning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating review…
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Start review
          </>
        )}
      </button>
    </article>
  );
}

function ConnectionCard({
  connected,
  githubLogin,
  connectedAt,
  repositoryCount,
  isDisconnecting,
  isPending,
  onDisconnect,
}: {
  connected: boolean;
  githubLogin: string | null;
  connectedAt: string | null;
  repositoryCount: number;
  isDisconnecting: boolean;
  isPending: boolean;
  onDisconnect: () => void;
}) {
  return (
    <SurfaceCard className="overflow-hidden">
      {connected ? (
        <div className="p-6 sm:p-7">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                <GithubIcon className="h-5 w-5" />
                <CheckCircle className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-cc-surface text-emerald-400" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-cc-text">
                    GitHub connected
                  </h2>
                  <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                    Active
                  </span>
                </div>
                <p className="mt-1.5 truncate text-sm text-cc-muted">
                  {githubLogin ? (
                    <>
                      Authorized as{" "}
                      <a
                        href={`https://github.com/${githubLogin}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-cc-text underline-offset-4 hover:underline"
                      >
                        @{githubLogin}
                      </a>
                    </>
                  ) : (
                    "Repository authorization is active."
                  )}
                </p>
              </div>
            </div>

            <div className="flex w-full gap-2 sm:w-auto">
              <a
                id="reconnect-github-btn"
                href="/api/auth/github"
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-4 text-sm font-medium text-cc-text outline-none transition-colors hover:bg-cc-surface-hover focus-visible:ring-2 focus-visible:ring-white/20 sm:flex-none"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </a>
              <button
                id="disconnect-github-btn"
                type="button"
                onClick={onDisconnect}
                disabled={isDisconnecting || isPending}
                className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 text-sm font-medium text-red-400 outline-none transition-colors hover:bg-red-500/15 focus-visible:ring-2 focus-visible:ring-red-400/30 disabled:pointer-events-none disabled:opacity-50 sm:flex-none"
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                Disconnect
              </button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-cc-subtle">
                Authorized scope
              </p>
              <code className="mt-2 block text-xs text-cc-text">
                repo, read:user
              </code>
            </div>
            <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-cc-subtle">
                Connected
              </p>
              <p className="mt-2 text-xs text-cc-text">
                {formatSafeDate(connectedAt)}
              </p>
            </div>
            <div className="rounded-xl border border-cc-border bg-cc-bg-secondary p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-cc-subtle">
                Accessible repositories
              </p>
              <p className="mt-2 text-xs text-cc-text">{repositoryCount}</p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-3.5">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <p className="text-xs leading-5 text-cc-muted">
              <strong className="font-medium text-cc-text">Read-only review:</strong>{" "}
              CtrlCode reads authorized repository content for analysis. It does
              not write, push, or modify your code.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center sm:py-14">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-cc-border-strong bg-cc-surface-raised text-cc-text">
            <GithubIcon className="h-5 w-5" />
          </span>
          <h2 className="mt-5 text-xl font-semibold text-cc-text">
            Connect your GitHub account
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-cc-muted">
            Authorize repository access, choose a codebase, and start a
            production-readiness security review.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-cc-muted">
            {[
              "Read-only repository access",
              "No code modifications",
              "Private scan results",
            ].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                {item}
              </span>
            ))}
          </div>
          <a
            id="connect-github-btn"
            href="/api/auth/github"
            className="mt-7 inline-flex min-h-11 items-center gap-2.5 rounded-lg bg-cc-text px-5 py-2.5 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-2 focus-visible:ring-offset-cc-surface"
          >
            <GithubIcon className="h-4 w-4" />
            Connect GitHub
            <ArrowRight className="h-4 w-4" />
          </a>
          <p className="mt-3 text-xs text-cc-subtle">
            You will be redirected to GitHub to authorize access.
          </p>
        </div>
      )}
    </SurfaceCard>
  );
}

export function ConnectPageClient({
  connected,
  githubLogin,
  connectedAt,
  repositories,
  repoError,
  successParam,
  errorParam,
  scanUsage,
}: ConnectPageClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);
  const [disconnectSuccess, setDisconnectSuccess] = useState(false);
  const [query, setQuery] = useState("");

  const oauthError = errorParam
    ? (OAUTH_ERROR_MESSAGES[errorParam] ?? "An error occurred.")
    : null;
  const repoErrorMessage = repoError ? REPO_ERROR_MESSAGES[repoError] : null;
  const justConnected = successParam === "true";
  const filteredRepositories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return repositories;
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(normalized) ||
        repo.full_name.toLowerCase().includes(normalized)
    );
  }, [query, repositories]);

  async function handleDisconnect() {
    if (isDisconnecting) return;
    setIsDisconnecting(true);
    setDisconnectError(null);

    try {
      const res = await fetch("/api/auth/github/disconnect", { method: "POST" });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setDisconnectError(
          typeof json.error === "string"
            ? json.error
            : "Failed to disconnect GitHub account."
        );
        return;
      }
      setDisconnectSuccess(true);
      startTransition(() => {
        router.push("/dashboard/connect?disconnected=true");
        router.refresh();
      });
    } catch {
      setDisconnectError("Network error. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <AppPageContainer size="wide">
        <AppPageHeader
        title="Connect GitHub"
        description="Connect a repository and start a production-readiness security review."
      />

      <div className="space-y-4">
        {oauthError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm leading-6 text-red-300">{oauthError}</p>
          </div>
        )}
        {disconnectError && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm leading-6 text-red-300">
              {disconnectError}
            </p>
          </div>
        )}
        {justConnected && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
          >
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <p className="text-sm leading-6 text-emerald-300">
              GitHub connected. Your authorized repositories are ready to review.
            </p>
          </div>
        )}
        {disconnectSuccess && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-cc-border-strong bg-cc-surface-raised p-4"
          >
            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-cc-muted" />
            <p className="text-sm leading-6 text-cc-text">
              GitHub disconnected successfully.
            </p>
          </div>
        )}
      </div>

      {connected && repoError === "invalid_token" && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-300">
                GitHub connection expired
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-300/80">
                Reconnect to restore repository access and resume scanning.
              </p>
            </div>
          </div>
          <a
            id="reconnect-github-expired-btn"
            href="/api/auth/github"
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-amber-400 px-4 text-sm font-semibold text-amber-950 transition-colors hover:bg-amber-300"
          >
            <RefreshCw className="h-4 w-4" />
            Reconnect GitHub
          </a>
        </div>
      )}

      {repoErrorMessage && repoError !== "invalid_token" && (
        <div
          role="alert"
          className="mt-6 flex flex-col gap-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-300">
                Repositories unavailable
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-300/80">
                {repoErrorMessage}
              </p>
            </div>
          </div>
          <a
            href="/api/auth/github"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/15"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh connection
          </a>
        </div>
      )}

      <div className="mt-8">
        <ConnectionCard
          connected={connected}
          githubLogin={githubLogin}
          connectedAt={connectedAt}
          repositoryCount={repositories.length}
          isDisconnecting={isDisconnecting}
          isPending={isPending}
          onDisconnect={handleDisconnect}
        />

        <SurfaceCard className="mt-5 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-cc-text">{scanUsage.planLabel} scan usage</p>
              <p className="mt-1 text-xs leading-5 text-cc-muted">
                {scanUsage.isAdmin
                  ? "Admin access: usage limits bypassed."
                  : `${scanUsage.used} / ${scanUsage.limit} AI Security Scans used today. Resets at ${new Date(scanUsage.resetAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })}.`}
              </p>
            </div>
            {!scanUsage.allowed && (
              <a href={scanUsage.upgradeUrl} className="inline-flex min-h-9 items-center justify-center rounded-lg bg-cc-text px-3 py-2 text-xs font-semibold text-cc-bg outline-none hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30">
                Upgrade
              </a>
            )}
          </div>
        </SurfaceCard>
      </div>

      <div className="mt-6">
        <WorkflowSteps connected={connected} />
      </div>

      {connected && !repoError && repositories.length > 0 && (
        <div className="mt-10">
          <AppSectionHeader
            title="Authorized repositories"
            description={`${repositories.length} ${repositories.length === 1 ? "repository" : "repositories"} available for review.`}
            action={
              <label className="relative block w-full sm:w-64">
                <span className="sr-only">Filter repositories</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cc-subtle" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Filter repositories…"
                  className="h-10 w-full rounded-lg border border-cc-border bg-cc-bg-secondary pl-9 pr-3 text-sm text-cc-text outline-none placeholder:text-cc-subtle focus:border-cc-border-strong focus:ring-2 focus:ring-white/10"
                />
              </label>
            }
          />

          {filteredRepositories.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredRepositories.map((repo) => (
                <RepositoryCard key={repo.id} repo={repo} scanUsage={scanUsage} />
              ))}
            </div>
          ) : (
            <SurfaceCard className="px-6 py-12 text-center">
              <Search className="mx-auto h-6 w-6 text-cc-subtle" />
              <h3 className="mt-4 text-sm font-semibold text-cc-text">
                No matching repositories
              </h3>
              <p className="mt-2 text-sm text-cc-muted">
                Try a different repository name.
              </p>
            </SurfaceCard>
          )}
        </div>
      )}

      {connected && !repoError && repositories.length === 0 && (
        <SurfaceCard className="mt-10 px-6 py-12 text-center">
          <GitFork className="mx-auto h-7 w-7 text-cc-subtle" />
          <h3 className="mt-4 text-base font-semibold text-cc-text">
            No repositories found
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-cc-muted">
            No repositories are available with the current authorization. Check
            GitHub permissions and refresh the connection.
          </p>
          <a
            href="/api/auth/github"
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg border border-cc-border-strong bg-cc-surface-raised px-4 text-sm font-medium text-cc-text transition-colors hover:bg-cc-surface-hover"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh connection
          </a>
        </SurfaceCard>
      )}
    </AppPageContainer>
  );
}
