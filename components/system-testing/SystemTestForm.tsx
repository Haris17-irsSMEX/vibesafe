"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Loader2 } from "lucide-react";

export function SystemTestForm() {
  const router = useRouter();
  const [targetUrl, setTargetUrl] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsRunning(true);
    try {
      const response = await fetch("/api/system-tests/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUrl }),
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
    <form onSubmit={submit} className="space-y-4" noValidate>
      <label className="block">
        <span className="text-sm font-medium text-cc-text">Live or staging URL</span>
        <span className="mt-1 block text-xs leading-5 text-cc-subtle">Use a public http(s) URL. Localhost is supported only during local development.</span>
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
      {error && <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-sm text-red-300">{error}</p>}
      <button
        type="submit"
        disabled={isRunning || !targetUrl.trim()}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-cc-text px-4 py-2.5 text-sm font-semibold text-cc-bg outline-none transition-colors hover:bg-white focus-visible:ring-2 focus-visible:ring-white/30 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
        {isRunning ? "System test is running…" : "Run System Test"}
        {!isRunning && <ArrowRight className="h-4 w-4" />}
      </button>
    </form>
  );
}
