/**
 * lib/types/index.ts
 *
 * Shared application-level types.
 * All severity values are UPPERCASE to match DeepSeek response schema.
 */

// ─── Plans ───────────────────────────────────────────────────────────────────

export type UserPlan = 'free' | 'pro' | 'enterprise'

// ─── Scan lifecycle ──────────────────────────────────────────────────────────

/** Canonical scan status — kept in sync with lib/db/scans.ts ScanStatus */
export type ScanStatus =
  | 'pending'
  | 'fetching'
  | 'scanning'
  | 'complete'
  | 'completed'
  | 'failed'

// ─── Severity ────────────────────────────────────────────────────────────────

/** Uppercase severity values as required by DeepSeek prompt schema */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

/** Lowercase alias kept for backward compatibility */
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low'

/** Maps uppercase Severity → lowercase SeverityLevel */
export function severityToLevel(s: Severity): SeverityLevel {
  return s.toLowerCase() as SeverityLevel
}

/** Maps lowercase SeverityLevel → uppercase Severity */
export function levelToSeverity(l: SeverityLevel): Severity {
  return l.toUpperCase() as Severity
}

// ─── Findings ────────────────────────────────────────────────────────────────

/**
 * A single security finding returned by the AI scanner.
 * All fields are required except line_number, cwe_id, vulnerable_code,
 * fix_code, and effort_minutes (optional — not always determinable).
 */
export interface ScanFinding {
  /** Short, unique check name, e.g. "hardcoded-api-key" */
  check_name: string

  /** Severity level (uppercase) */
  severity: Severity

  /** Security category matching FileRouter sections */
  category: string

  /** Relative file path within the repository */
  file_path: string

  /** Line number in the file (1-indexed, optional) */
  line_number?: number

  /** CWE identifier, e.g. "CWE-798" (optional) */
  cwe_id?: string

  /** One-sentence description of the issue */
  description: string

  /** Why this matters from a security perspective */
  why_it_matters: string

  /** Excerpt of the problematic code (optional) */
  vulnerable_code?: string

  /** Suggested fixed version of the code (optional) */
  fix_code?: string

  /** Estimated fix effort in minutes (optional) */
  effort_minutes?: number
}

// ─── Parser metadata ─────────────────────────────────────────────────────────

/** Result of parsing a DeepSeek response for one section */
export interface ParseResult {
  findings: ScanFinding[]
  /** Number of raw objects that were skipped due to validation failures */
  skippedCount: number
  /** True if the raw response was not valid JSON or not an array */
  parseError: boolean
  /** Safe error description (never raw stack trace) */
  parseErrorMessage?: string
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

export interface SecurityScoreResult {
  score: number           // 0–100
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  totalFindings: number
}
