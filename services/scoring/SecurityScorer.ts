/**
 * services/scoring/SecurityScorer.ts
 *
 * Deterministic, AI-free security score calculation.
 *
 * Scoring model:
 *   Start at 100
 *   CRITICAL finding: -25 points
 *   HIGH    finding: -10 points
 *   MEDIUM  finding:  -4 points
 *   LOW     finding:  -1 point
 *   Clamped between 0 and 100
 *
 * This is intentionally deterministic — never uses AI-generated scores.
 */

import type { ScanFinding, SecurityScoreResult } from '@/lib/types'

// ─── Scorer ──────────────────────────────────────────────────────────────────

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

// ─── Score label ─────────────────────────────────────────────────────────────

/**
 * Returns a human-readable grade for a numeric score.
 *
 * 90–100: Strong
 *  70–89: Good
 *  50–69: Needs attention
 *  30–49: Risky
 *   0–29: High risk
 */
export function scoreToLabel(score: number): string {
  if (score >= 90) return 'Strong'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Needs attention'
  if (score >= 30) return 'Risky'
  return 'High risk'
}

/**
 * Returns a Tailwind color class for a score.
 */
export function scoreToColor(score: number): string {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 70) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  if (score >= 30) return 'text-orange-600'
  return 'text-red-600'
}
