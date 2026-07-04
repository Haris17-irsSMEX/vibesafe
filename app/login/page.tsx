"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand/brand-logo";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function LoginForm() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "auth-callback-failed" 
      ? "Authentication failed. Please try again." 
      : searchParams.get("error")
  );
  const supabase = createClient();

  const handleGitHubLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred during sign in.'
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="flex flex-row items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <button 
        onClick={handleGitHubLogin}
        disabled={loading}
        className="cc-button-primary h-10 w-full gap-2 text-sm"
      >
        <GithubIcon className="h-4 w-4" />
        {loading ? "Signing in..." : "Sign in with GitHub"}
      </button>
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cc-bg p-6">
      <div className="w-full max-w-sm rounded-xl border border-cc-border bg-cc-surface p-8 shadow-2xl">
        <div className="mb-8 flex justify-center">
          <BrandLogo />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-cc-text">Welcome back</h1>
          <p className="mt-2 text-sm text-cc-muted">Sign in to your account to continue</p>
        </div>
        
        <div className="mt-6 flex flex-col gap-4">
          <Suspense fallback={<div className="h-10 w-full animate-pulse rounded-md bg-cc-surface-raised"></div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
