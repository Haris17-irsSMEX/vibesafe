/**
 * services/scoring/SecurityScorer.ts
 *
 * Deterministic, AI-free security score calculation.
 *
 * Base scoring model:
 *   Start at 100
 *   CRITICAL finding: tier-based
 *   HIGH    finding: tier-based
 *   MEDIUM  finding: tier-based
 *   LOW     finding: tier-based
 *   Clamped between 0 and 100
 *
 * Audit-aware scoring (Phase 8G):
 *   Factors in checklist FAIL/PARTIAL counts and AI posture rating.
 *   100 now requires: zero findings, zero FAILs, ≤2 PARTIALs, strong/acceptable posture.
 */

import type { ScanFinding, SecurityScoreResult, AuditChecklistItem, AuditReport } from '@/lib/types'

// ─── Base Scorer ─────────────────────────────────────────────────────────────

/**
 * Calculate a deterministic security score from a list of findings.
 * Uses a calibrated risk-tier formula.
 */
export function calculateSecurityScore(
  findings: ScanFinding[]
): SecurityScoreResult {
  let criticalCount = 0
  let highCount     = 0
  let mediumCount   = 0
  let lowCount      = 0

  for (const finding of findings) {
    switch (finding.severity) {
      case 'CRITICAL': criticalCount++; break
      case 'HIGH':     highCount++;     break
      case 'MEDIUM':   mediumCount++;   break
      case 'LOW':      lowCount++;      break
    }
  }

  let score = 100

  if (criticalCount > 0) {
    const extraCritical = criticalCount - 1
    const penalty = extraCritical * 10 + highCount * 5 + mediumCount * 2 + lowCount * 0.5
    score = 55 - penalty
    score = Math.max(0, Math.min(55, score))
  } else if (highCount > 0) {
    const penalty = highCount * 7 + mediumCount * 2 + lowCount * 0.5
    score = 78 - penalty
    score = Math.max(30, Math.min(78, score))
  } else if (mediumCount > 0) {
    const penalty = mediumCount * 4 + lowCount * 1
    score = 90 - penalty
    score = Math.max(60, Math.min(90, score))
  } else if (lowCount > 0) {
    const penalty = lowCount * 2
    score = 100 - penalty
    score = Math.max(85, Math.min(100, score))
  }

  score = Math.round(score)

  return {
    score,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalFindings: findings.length,
  }
}

// ─── Audit-aware scorer (Phase 8G) ───────────────────────────────────────────

/** High-risk audit domains — FAILs here penalize more */
const HIGH_RISK_SECTIONS = new Set<string>([
  'secrets', 'Secrets', 'Secrets & Environment',
  'auth', 'Authentication', 'Authentication & Authorization',
  'payments', 'Payments', 'Payments & Webhooks',
  'database', 'Database', 'Database & Supabase RLS', 'Supabase & Database Security',
])

function isHighRiskSection(section: string): boolean {
  if (HIGH_RISK_SECTIONS.has(section)) return true
  const lower = section.toLowerCase()
  return lower.includes('secret') || lower.includes('auth') || lower.includes('payment') || lower.includes('database')
}

/**
 * Calculate a security score that factors in checklist verdicts and AI posture.
 * Composes the base findings-based score with checklist penalties and caps.
 */
export function calculateAuditAwareScore(
  findings: ScanFinding[],
  checklist: AuditChecklistItem[],
  auditReport: AuditReport | null
): SecurityScoreResult {
  const baseResult = calculateSecurityScore(findings)
  let score = baseResult.score

  let failCount = 0
  let partialCount = 0
  let highRiskFailCount = 0

  for (const item of checklist) {
    if (item.verdict === 'fail') {
      failCount++
      if (isHighRiskSection(item.section)) {
        highRiskFailCount++
        score -= 5
      } else {
        score -= 3
      }
    } else if (item.verdict === 'partial') {
      partialCount++
      if (isHighRiskSection(item.section)) {
        score -= 2
      } else {
        score -= 1
      }
    }
  }

  // Apply score caps based on checklist + posture
  if (auditReport) {
    if (auditReport.security_posture === 'critical') {
      score = Math.min(score, 55)
    } else if (auditReport.security_posture === 'needs_work') {
      score = Math.min(score, 85)
    }
  }

  if (failCount > 0) {
    score = Math.min(score, 85)
  }
  if (highRiskFailCount > 0) {
    score = Math.min(score, 75)
  }
  if (partialCount > 3) {
    score = Math.min(score, 90)
  }

  // 100 requires: zero findings, zero FAILs, ≤2 PARTIALs, strong/acceptable posture
  if (score >= 100) {
    const posture = auditReport?.security_posture
    const postureOk = !posture || posture === 'strong' || posture === 'acceptable'
    if (failCount > 0 || partialCount > 2 || !postureOk) {
      score = Math.min(score, 92)
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  return {
    ...baseResult,
    score,
  }
}

// ─── Score label ─────────────────────────────────────────────────────────────

export function scoreToLabel(score: number): string {
  if (score >= 90) return 'Strong'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Needs attention'
  if (score >= 30) return 'Risky'
  return 'High risk'
}

export function scoreToColor(score: number): string {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  if (score >= 30) return 'text-orange-600'
  return 'text-red-600'
}
