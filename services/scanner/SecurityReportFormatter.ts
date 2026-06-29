/**
 * services/scanner/SecurityReportFormatter.ts
 *
 * Converts a SecurityReport into a clean markdown document
 * suitable for copy/sharing by users.
 *
 * Server-side and client-safe (no environment variables used).
 */

import type { SecurityReport, TopRisk, RemediationStep } from './SecurityReportGenerator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanSummary {
  repo_full_name: string
  security_score: number | null
  completed_at: string | null
  critical_count: number
  high_count: number
  medium_count: number
  low_count: number
  total_findings: number
}

interface FindingSummary {
  severity: string
  check_name: string
  file_path?: string
  category?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return 'Unknown'
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function readinessLabel(r: string): string {
  switch (r) {
    case 'critical_risk':    return '🔴 CRITICAL RISK — Not Production Ready'
    case 'not_ready':        return '🟠 NOT READY — Requires Remediation'
    case 'needs_attention':  return '🟡 NEEDS ATTENTION — Improvements Recommended'
    case 'ready':            return '🟢 READY — Strong Security Posture'
    default:                 return r
  }
}

function severityEmoji(sev: string): string {
  switch (sev?.toLowerCase()) {
    case 'critical': return '🔴'
    case 'high':     return '🟠'
    case 'medium':   return '🟡'
    case 'low':      return '🔵'
    default:         return '⚪'
  }
}

// ─── Main formatter ───────────────────────────────────────────────────────────

import type { AuditChecklistItem } from '@/lib/types'

/**
 * Format a security report as clean markdown for copy/sharing.
 */
export function formatSecurityReportMarkdown(
  report: SecurityReport,
  scan: ScanSummary,
  findings: FindingSummary[],
  checklist: AuditChecklistItem[] = [],
  quickWins: string[] = []
): string {
  const lines: string[] = []

  // Header
  lines.push(`# VibeSafe Security Report`)
  lines.push(``)
  lines.push(`| Field               | Value                        |`)
  lines.push(`|---------------------|------------------------------|`)
  lines.push(`| **Repository**      | ${scan.repo_full_name}       |`)
  lines.push(`| **Security Score**  | ${scan.security_score ?? '—'}/100 |`)
  lines.push(`| **Production Readiness** | ${readinessLabel(report.production_readiness)} |`)
  lines.push(`| **Scan Date**       | ${formatDate(scan.completed_at)} |`)
  lines.push(`| **Total Findings**  | ${scan.total_findings}        |`)
  lines.push(``)

  // Verdict
  lines.push(`---`)
  lines.push(``)
  lines.push(`## Verdict`)
  lines.push(``)
  lines.push(`> ${report.security_verdict}`)
  lines.push(``)

  // Executive Summary
  lines.push(`## Executive Summary`)
  lines.push(``)
  lines.push(report.executive_summary)
  lines.push(``)

  // Quick Wins
  if (quickWins && quickWins.length > 0) {
    lines.push(`## Quick Wins (High ROI Fixes)`)
    lines.push(``)
    quickWins.forEach((win) => {
      lines.push(`- ⚡ ${win}`)
    })
    lines.push(``)
  }

  // Key Risks
  if (report.top_risks && report.top_risks.length > 0) {
    lines.push(`## Key Risks`)
    lines.push(``)
    report.top_risks.forEach((risk: TopRisk, i: number) => {
      lines.push(`### ${i + 1}. ${severityEmoji(risk.severity)} [${risk.severity}] ${risk.title}`)
      lines.push(``)
      lines.push(`**Area:** ${risk.affected_area}`)
      lines.push(``)
      lines.push(risk.explanation)
      lines.push(``)
    })
  }

  // Business Impact
  lines.push(`## Business Impact`)
  lines.push(``)
  lines.push(report.business_impact)
  lines.push(``)

  // Technical Summary
  lines.push(`## Technical Summary`)
  lines.push(``)
  lines.push(report.technical_summary)
  lines.push(``)

  // Remediation Plan
  if (report.remediation_plan && report.remediation_plan.length > 0) {
    lines.push(`## Remediation Plan`)
    lines.push(``)
    report.remediation_plan.forEach((step: RemediationStep) => {
      lines.push(`**${step.priority}. ${step.action}**`)
      lines.push(``)
      lines.push(`- **Reason:** ${step.reason}`)
      lines.push(`- **Estimated Effort:** ${step.estimated_effort}`)
      lines.push(``)
    })
  }

  // Positive Findings
  if (report.positive_findings && report.positive_findings.length > 0) {
    lines.push(`## What Looks Good`)
    lines.push(``)
    report.positive_findings.forEach((p: string) => {
      lines.push(`- ✅ ${p}`)
    })
    lines.push(``)
  }

  // Findings Breakdown Table
  lines.push(`## Findings Breakdown`)
  lines.push(``)
  lines.push(`| Severity | Count |`)
  lines.push(`|----------|-------|`)
  lines.push(`| 🔴 Critical | ${scan.critical_count} |`)
  lines.push(`| 🟠 High     | ${scan.high_count}     |`)
  lines.push(`| 🟡 Medium   | ${scan.medium_count}   |`)
  lines.push(`| 🔵 Low      | ${scan.low_count}      |`)
  lines.push(`| **Total**   | **${scan.total_findings}** |`)
  lines.push(``)

  if (findings.length > 0) {
    lines.push(`### Individual Findings`)
    lines.push(``)
    lines.push(`| Severity | Issue | File |`)
    lines.push(`|----------|-------|------|`)
    findings.slice(0, 20).forEach((f) => {
      const sev = `${severityEmoji(f.severity)} ${f.severity?.toUpperCase() ?? '—'}`
      const name = f.check_name || '—'
      const file = f.file_path || '—'
      lines.push(`| ${sev} | ${name} | \`${file}\` |`)
    })
    if (findings.length > 20) {
      lines.push(`| … | _${findings.length - 20} more findings_ | — |`)
    }
    lines.push(``)
  }

  // Security Checklist
  if (checklist && checklist.length > 0) {
    lines.push(`## Automated Security Checklist`)
    lines.push(``)
    lines.push(`| Status | Area | Check | Evidence |`)
    lines.push(`|--------|------|-------|----------|`)
    
    // Group by section, but for markdown a flat table is fine too. Let's do flat table.
    checklist.forEach((item) => {
      let statusEmoji = '❓'
      if (item.verdict === 'pass') statusEmoji = '✅'
      if (item.verdict === 'fail') statusEmoji = '❌'
      if (item.verdict === 'partial') statusEmoji = '⚠️'
      if (item.verdict === 'na') statusEmoji = '➖'
      
      const evidence = item.evidence ? item.evidence.replace(/\|/g, '-') : ''
      lines.push(`| ${statusEmoji} ${item.verdict.toUpperCase()} | ${item.section} | ${item.check} | ${evidence} |`)
    })
    lines.push(``)
  }

  // Estimated Fix Effort
  lines.push(`## Estimated Fix Effort`)
  lines.push(``)
  lines.push(report.estimated_fix_effort)
  lines.push(``)

  // Final Recommendation
  lines.push(`## Final Recommendation`)
  lines.push(``)
  if (report.production_readiness === 'ready') {
    lines.push(`This repository is in good security standing. Continue scanning regularly as the codebase evolves to maintain this posture.`)
  } else if (report.production_readiness === 'critical_risk') {
    lines.push(`**Do not deploy to production until all critical issues are resolved.** Use the fix prompts provided for each finding to guide remediation. Re-scan after fixes are applied.`)
  } else if (report.production_readiness === 'not_ready') {
    lines.push(`Address high severity issues before production launch. Use the prioritized remediation plan above as a guide. Re-scan to verify fixes.`)
  } else {
    lines.push(`Work through the remediation plan to improve the security score. These improvements will reduce risk exposure and prepare the application for production.`)
  }
  lines.push(``)

  // Footer
  lines.push(`---`)
  lines.push(``)
  lines.push(`*Generated by [VibeSafe](https://vibesafe.io) — AI-Powered Security Scanner for Vibe Coders*`)
  lines.push(`*Scan Date: ${formatDate(scan.completed_at)}*`)

  return lines.join('\n')
}
