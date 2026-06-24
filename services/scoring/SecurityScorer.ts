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

// ─── Severity weights ────────────────────────────────────────────────────────

const SEVERITY_WEIGHTS = {
  CRITICAL: 25,
  HIGH:     15,
  MEDIUM:   7,
  LOW:      2,
} as const

// ─── Scorer ──────────────────────────────────────────────────────────────────

/**
 * Calculate a deterministic security score from a list of findings.
 *
 * Score starts at 100 and is reduced by severity weights.
 * Clamped to [0, 100].
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

  let penalty =
    criticalCount * SEVERITY_WEIGHTS.CRITICAL +
    highCount     * SEVERITY_WEIGHTS.HIGH     +
    mediumCount   * SEVERITY_WEIGHTS.MEDIUM   +
    lowCount      * SEVERITY_WEIGHTS.LOW

  let score = Math.max(0, 100 - penalty)

  if (criticalCount > 0) {
    score = Math.min(score, 55)
  } else if (highCount >= 3) {
    score = Math.min(score, 70)
  } else if (mediumCount >= 5) {
    score = Math.min(score, 85)
  }

  score = Math.max(0, Math.min(100, score))

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
 * 90–100: Excellent
 *  75–89: Good
 *  50–74: Needs Improvement
 *  25–49: At Risk
 *   0–24: Critical
 */
export function scoreToLabel(score: number): string {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 50) return 'Needs Improvement'
  if (score >= 25) return 'At Risk'
  return 'Critical'
}

/**
 * Returns a Tailwind color class for a score.
 */
export function scoreToColor(score: number): string {
  if (score >= 90) return 'text-emerald-600'
  if (score >= 75) return 'text-green-600'
  if (score >= 50) return 'text-amber-600'
  if (score >= 25) return 'text-orange-600'
  return 'text-red-600'
}
