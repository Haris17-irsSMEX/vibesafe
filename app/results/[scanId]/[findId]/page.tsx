import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getScanById } from '@/lib/db/scans'
import { getScanResultById, getScanResultByIdFree } from '@/lib/db/scan-results'
import type { ScanResultRecord, FreeScanResultRecord } from '@/lib/db/scan-results'
import { getUserProfile, upsertUserProfile, isPaidPlan } from '@/lib/db/users'
import { isAdminEmail } from '@/lib/auth/admin'
import { SeverityBadge, type SeverityLevel } from '@/components/results/SeverityBadge'
import { CopyButton } from '@/components/results/CopyButton'
import { CopyFixPromptButton } from '@/components/results/copy-fix-prompt-button'
import { UpgradeCTA } from '@/components/results/UpgradeCTA'
import { ServerDashboardLayout } from '@/components/layout/server-dashboard-layout'
import { AppPageContainer } from '@/components/layout/app-page'
import { GlowCard, GlassPanel } from '@/components/ui/glow-card'
import { AlertTriangle, ArrowLeft, FileCode, Hash, Lock, ShieldAlert, ShieldCheck } from 'lucide-react'

interface FindingDetailPageProps {
  params: {
    scanId: string
    findId: string
  }
}

export default async function FindingDetailPage({ params }: FindingDetailPageProps) {
  const { scanId, findId } = params

  // 1. Verify user session
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // 2. Verify scan ownership (user cannot access another user's results)
  const scan = await getScanById(scanId, user.id)
  if (!scan) {
    return (
      <ServerDashboardLayout>
        <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8 text-center">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
            <h2 className="text-lg font-semibold text-red-400">Scan not found</h2>
            <Link href="/dashboard" className="text-red-400 hover:underline hover:text-red-300 mt-4 inline-block">
              Return to Dashboard
            </Link>
          </div>
        </div>
      </ServerDashboardLayout>
    )
  }

  // 3. Load user profile & detect plan
  let profile = await getUserProfile(user.id)
  if (!profile) {
    await upsertUserProfile(user.id, user.email ?? null)
    profile = await getUserProfile(user.id)
  }
  const userPlan = profile?.plan ?? 'free'
  const paid = isPaidPlan(userPlan)

  // Admin override — server-side only, never trusts client input
  const isAdmin = isAdminEmail(user.email)

  // canViewFull: admin gets full access regardless of plan
  const canViewFull = isAdmin || paid

  // 4. Fetch finding — GATED at DB level based on plan OR admin status.
  let paidFinding: ScanResultRecord | null = null
  let freeFinding: FreeScanResultRecord | null = null

  if (canViewFull) {
    paidFinding = await getScanResultById(findId, user.id)
    if (!paidFinding || paidFinding.scan_id !== scanId) {
      return (
        <ServerDashboardLayout>
          <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8 text-center">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-amber-500">Finding not found</h2>
              <Link href={`/results/${scanId}`} className="text-amber-400 hover:underline mt-4 inline-block">
                Return to Results
              </Link>
            </div>
          </div>
        </ServerDashboardLayout>
      )
    }
  } else {
    freeFinding = await getScanResultByIdFree(findId, user.id)
    if (!freeFinding || freeFinding.scan_id !== scanId) {
      return (
        <ServerDashboardLayout>
          <div className="mx-auto max-w-3xl py-12 px-4 sm:px-6 lg:px-8 text-center">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
              <h2 className="text-lg font-semibold text-amber-500">Finding not found</h2>
              <Link href={`/results/${scanId}`} className="text-amber-400 hover:underline mt-4 inline-block">
                Return to Results
              </Link>
            </div>
          </div>
        </ServerDashboardLayout>
      )
    }
  }

  // 5. Build a safe base object with fields common to both free & paid
  const baseFinding = canViewFull ? paidFinding! : freeFinding!

  return (
    <ServerDashboardLayout>
      <AppPageContainer size="narrow">
        {/* Back link */}
        <Link
          href={`/results/${scanId}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to results
        </Link>

        {/* ── Header — visible to all plans ─────────────────────────────── */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <SeverityBadge severity={baseFinding.severity as SeverityLevel} />
            <span className="inline-flex items-center rounded-md bg-white/5 border border-white/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              {baseFinding.category}
            </span>
            {baseFinding.cwe_id && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                <Hash className="h-3.5 w-3.5" />
                {baseFinding.cwe_id}
              </span>
            )}
            {/* Admin badge */}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border bg-violet-500/10 text-violet-400 border-violet-500/30">
                <ShieldAlert className="h-3 w-3" />
                Founder mode
              </span>
            )}
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-6">{baseFinding.check_name}</h1>

          <div className="flex items-center gap-3 text-sm text-zinc-400 bg-black/50 border border-white/5 rounded-xl px-5 py-3.5 max-w-full overflow-hidden shadow-inner">
            <FileCode className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate font-mono">{baseFinding.file_path}</span>
            {baseFinding.line_number && (
              <>
                <span className="text-white/20">|</span>
                <span className="shrink-0 font-mono text-zinc-500">line {baseFinding.line_number}</span>
              </>
            )}
          </div>
        </div>

        {/* ── FREE USER (non-admin): locked panels + upgrade CTA ──────────────── */}
        {!canViewFull && (
          <div className="space-y-6">
            <UpgradeCTA context="detail" className="mb-8" />

            {/* Description locked panel */}
            <GlassPanel className="p-0 overflow-hidden border-white/5">
              <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-zinc-500" />
                <h2 className="text-base font-semibold text-foreground">Issue Description</h2>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  <Lock className="h-3 w-3" />
                  Premium
                </span>
              </div>
              <div className="p-6 space-y-6 bg-card/50">
                <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40">
                  <p
                    className="select-none whitespace-pre-wrap text-zinc-600 blur-[6px] p-6 text-sm leading-relaxed"
                    aria-hidden="true"
                  >
                    This security issue has a detailed explanation covering root cause,
                    attack vectors, and real-world impact. The full description helps you
                    understand why this vulnerability exists and how it could be exploited
                    in your specific codebase context.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-2.5 rounded-full shadow-2xl">
                      <Lock className="h-4 w-4 text-zinc-400" />
                      <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Full description locked</p>
                    </div>
                  </div>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-white/5 bg-black/40">
                  <p
                    className="select-none text-sm text-zinc-600 blur-[6px] p-6 leading-relaxed"
                    aria-hidden="true"
                  >
                    Why it matters: This vulnerability can lead to serious security
                    consequences including data exposure, account takeover, or remote
                    code execution depending on the attack surface.
                  </p>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-2.5 rounded-full shadow-2xl">
                      <Lock className="h-4 w-4 text-zinc-400" />
                      <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Impact analysis locked</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* Code context locked panel */}
            <GlassPanel className="p-0 overflow-hidden border-white/5">
              <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center gap-3">
                <FileCode className="h-5 w-5 text-zinc-500" />
                <h2 className="text-base font-semibold text-foreground">Code Context &amp; Fix</h2>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  <Lock className="h-3 w-3" />
                  Premium
                </span>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 p-6 bg-card/50">
                <div className="rounded-xl border border-red-500/20 overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 text-[10px] font-bold text-red-400 uppercase tracking-wider">
                    Vulnerable Code
                  </div>
                  <div className="bg-black/60 p-6 min-h-[160px] flex items-center justify-center flex-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
                    <div className="text-center relative z-10">
                      <Lock className="h-6 w-6 text-zinc-600 mx-auto" />
                      <p className="text-[11px] font-bold text-zinc-500 mt-3 uppercase tracking-widest">Locked</p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-500/20 overflow-hidden shadow-sm flex flex-col">
                  <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    Suggested Fix
                  </div>
                  <div className="bg-black/60 p-6 min-h-[160px] flex items-center justify-center flex-1 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px]" />
                    <div className="text-center relative z-10">
                      <Lock className="h-6 w-6 text-zinc-600 mx-auto" />
                      <p className="text-[11px] font-bold text-zinc-500 mt-3 uppercase tracking-widest">Locked</p>
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>

            {/* AI Fix Prompt locked panel */}
            <GlassPanel className="p-0 overflow-hidden border-white/5">
              <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-zinc-500" />
                <h2 className="text-base font-semibold text-foreground">AI Fix Prompt</h2>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  <Lock className="h-3 w-3" />
                  Premium
                </span>
              </div>
              <div className="p-6 bg-card/50">
                <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5">
                  <div className="px-6 py-5">
                    <p
                      className="select-none text-sm text-primary/40 font-mono whitespace-pre-wrap blur-[6px] leading-relaxed"
                      aria-hidden="true"
                    >
                      Fix the security vulnerability in [FILE_PATH] at line [LINE].
                      The issue is [DESCRIPTION]. Apply the suggested fix and verify
                      that the change does not break existing functionality.
                    </p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-5 py-3 rounded-full shadow-2xl">
                      <Lock className="h-4 w-4 text-primary" />
                      <span className="text-[11px] font-bold text-zinc-300 uppercase tracking-wider">
                        Unlock copy-paste prompts
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* ── PAID/ADMIN USER: full finding detail ────────────────── */}
        {canViewFull && paidFinding && (
          <div className="space-y-8">
            {/* Description */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Issue Description
              </h2>
              <GlassPanel className="p-6">
                <p className="whitespace-pre-wrap text-zinc-300 leading-relaxed text-sm">{paidFinding.description}</p>
                
                {paidFinding.why_it_matters && (
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Why it matters</h3>
                    <p className="whitespace-pre-wrap text-sm text-zinc-400 leading-relaxed">{paidFinding.why_it_matters}</p>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-white/5">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Recommendation</h3>
                  <p className="whitespace-pre-wrap text-sm text-zinc-400 leading-relaxed">{paidFinding.recommendation}</p>
                </div>
              </GlassPanel>
            </section>

            {/* Code Diff / Snippets */}
            <section>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
                <FileCode className="h-5 w-5 text-primary" />
                Affected Code
              </h2>
              {(!paidFinding.vulnerable_code && !paidFinding.evidence_snippet) ? (
                <GlassPanel className="p-6">
                  <p className="text-sm text-zinc-400">
                    Exact line was not available for this finding. Review the affected file and recommendation below.
                  </p>
                </GlassPanel>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-1 gap-5">
                  <div className="rounded-xl border border-red-500/20 overflow-hidden shadow-sm flex flex-col bg-black/50">
                    <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2.5 text-[10px] font-bold text-red-400 uppercase tracking-wider flex justify-between items-center">
                      <span>{paidFinding.file_path}{paidFinding.line_number ? ` : Line ${paidFinding.line_number}` : ''}</span>
                      <CopyButton text={paidFinding.vulnerable_code || paidFinding.evidence_snippet || ''} className="hover:bg-red-500/20 hover:text-red-300 border-red-500/30" />
                    </div>
                    <div className="p-4 overflow-x-auto flex-1">
                      <pre className="text-[13px] text-red-300/80 font-mono leading-relaxed">
                        <code>{paidFinding.vulnerable_code || paidFinding.evidence_snippet}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Fix Prompt */}
            {paidFinding.fix_prompt && (
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    AI Fix Prompt
                  </h2>
                  <p className="text-sm text-zinc-400 hidden sm:block">Paste this into your AI coding agent to fix the issue safely.</p>
                </div>
                <GlowCard className="p-0 overflow-hidden border-primary/20 bg-primary/5">
                  <div className="px-6 py-5 flex flex-col justify-between items-start gap-4">
                    <div className="w-full flex justify-end">
                      <CopyFixPromptButton promptText={paidFinding.fix_prompt} />
                    </div>
                    <pre className="text-[13px] text-primary/80 font-mono whitespace-pre-wrap leading-relaxed w-full">
                      <code>{paidFinding.fix_prompt}</code>
                    </pre>
                  </div>
                </GlowCard>
              </section>
            )}
          </div>
        )}
      </AppPageContainer>
    </ServerDashboardLayout>
  )
}
