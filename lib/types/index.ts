/**
 * lib/types/index.ts
 *
 * Shared application-level types.
 * All severity values are UPPERCASE to match DeepSeek response schema.
 */

// ─── Plans ───────────────────────────────────────────────────────────────────

export type UserPlan = 'free' | 'starter' | 'builder' | 'pro'

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

/** How strongly the repository evidence supports a finding. */
export type FindingStatus = 'confirmed' | 'potential' | 'needs_manual_verification'

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

  /** Relative file path within the repository. Omitted when the source cannot prove one. */
  file_path?: string

  /** Line number in the file (1-indexed, optional) */
  line_number?: number

  /** Last affected line when the evidence spans more than one line. */
  line_end?: number

  /** CWE identifier, e.g. "CWE-798" (optional) */
  cwe_id?: string

  /** OWASP category (optional) */
  owasp?: string

  /** One-sentence description of the issue */
  description: string

  /** How to fix this vulnerability */
  recommendation: string

  /** Excerpt of the problematic code (optional) */
  evidence_snippet?: string

  /** Exact vulnerable line or smallest relevant snippet (optional) */
  vulnerable_code?: string

  /** Why this issue is risky (optional) */
  why_it_matters?: string

  /** AI confidence level (optional) */
  confidence?: 'high' | 'medium' | 'low'

  /** Evidence-based disposition. This is separate from the finding lifecycle status. */
  finding_status?: FindingStatus

  /** Short, redacted evidence statement tied to the scanned repository. */
  evidence?: string

  /** Plausible consequence only when the code supports one. */
  attack_scenario?: string

  /** What a developer can do to prove or disprove a non-confirmed finding. */
  verification_steps?: string[]

  /** Calibrated explanation of why this could be a false positive. */
  false_positive_risk?: string

  /** AI generated fix prompt (optional) */
  fix_prompt?: string

  /** Timestamp when fix prompt was generated (optional) */
  fix_prompt_generated_at?: string

  /** AI model used to generate fix prompt (optional) */
  fix_prompt_model?: string
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

// ─── Audit Checklist ─────────────────────────────────────────────────────────

/** Verdict for a single checklist audit item */
export type ChecklistVerdict = 'pass' | 'fail' | 'partial' | 'na'

/** Overall security posture rating from the AI audit */
export type SecurityPosture = 'critical' | 'needs_work' | 'acceptable' | 'strong'

/** A single item from the structured security audit checklist */
export interface AuditChecklistItem {
  id: string
  section: string
  check: string
  verdict: ChecklistVerdict
  evidence: string
  file_path?: string | null
}

/** The structured report returned by the AI alongside findings */
export interface AuditReport {
  security_posture: SecurityPosture
  executive_summary: string
  quick_wins: string[]
  what_is_done_right: string[]
  priority_plan: string[]
}

/** Extended parse result that includes checklist and report data */
export interface FullParseResult extends ParseResult {
  checklist: AuditChecklistItem[]
  report: AuditReport | null
}
