/**
 * services/scanner/FindingParser.ts
 *
 * Safely parses the raw text response from DeepSeek into typed ScanFinding[].
 *
 * Rules:
 * - Accepts only JSON arrays
 * - Validates each finding against the schema
 * - Skips malformed findings rather than failing entirely
 * - Never throws unhandled exceptions
 * - Returns parse error metadata alongside valid findings
 */

import type { ScanFinding, Severity, ParseResult } from '@/lib/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_SEVERITIES = new Set<Severity>(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])

// ─── Type guard helpers ───────────────────────────────────────────────────────

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === 'object' && val !== null && !Array.isArray(val)
}

function optionalString(val: unknown): string | undefined {
  return typeof val === 'string' && val.trim().length > 0 ? val.trim() : undefined
}

function optionalNumber(val: unknown): number | undefined {
  return typeof val === 'number' && isFinite(val) && val > 0
    ? Math.round(val)
    : undefined
}

function isSeverity(val: unknown): val is Severity {
  return typeof val === 'string' && VALID_SEVERITIES.has(val as Severity)
}

// ─── Strip markdown fences ────────────────────────────────────────────────────

/**
 * DeepSeek sometimes wraps output in ```json ... ``` despite the system prompt.
 * Strip those fences before attempting JSON.parse().
 */
function stripMarkdownFences(raw: string): string {
  const fenceMatch = raw.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }
  return raw.trim()
}

// ─── Validate a single finding ────────────────────────────────────────────────

/**
 * Validates a raw object against the ScanFinding schema.
 * Returns a typed ScanFinding if valid, or null if it fails validation.
 */
function validateFinding(raw: unknown): ScanFinding | null {
  if (!isRecord(raw)) return null

  // Required fields
  const check_name = optionalString(raw.check_name)
  const severity = raw.severity
  const category = optionalString(raw.category)
  const file_path = optionalString(raw.file_path)
  const description = optionalString(raw.description)
  const why_it_matters = optionalString(raw.why_it_matters)

  if (!check_name || !category || !file_path || !description || !why_it_matters) {
    return null
  }

  if (!isSeverity(severity)) {
    return null
  }

  // Optional fields
  const line_number = optionalNumber(raw.line_number)
  const cwe_id = optionalString(raw.cwe_id)
  const vulnerable_code = optionalString(raw.vulnerable_code)
  const fix_code = optionalString(raw.fix_code)
  const effort_minutes = optionalNumber(raw.effort_minutes)

  return {
    check_name,
    severity,
    category,
    file_path,
    description,
    why_it_matters,
    ...(line_number !== undefined && { line_number }),
    ...(cwe_id !== undefined && { cwe_id }),
    ...(vulnerable_code !== undefined && { vulnerable_code }),
    ...(fix_code !== undefined && { fix_code }),
    ...(effort_minutes !== undefined && { effort_minutes }),
  }
}

// ─── Main parser ──────────────────────────────────────────────────────────────

/**
 * Parse the raw text response from DeepSeek into typed findings.
 *
 * Always returns a ParseResult — never throws.
 */
export function parseFindings(rawText: string): ParseResult {
  // 1. Strip markdown fences if present
  const cleaned = stripMarkdownFences(rawText)

  // 2. Handle empty response as empty findings (no error)
  if (cleaned === '' || cleaned === '[]') {
    return {
      findings: [],
      skippedCount: 0,
      parseError: false,
    }
  }

  // 3. Attempt JSON parse
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch (err) {
    return {
      findings: [],
      skippedCount: 0,
      parseError: true,
      parseErrorMessage: `JSON parse failed: ${err instanceof Error ? err.message : 'unknown error'}`,
    }
  }

  // 4. Must be an array
  if (!Array.isArray(parsed)) {
    return {
      findings: [],
      skippedCount: 0,
      parseError: true,
      parseErrorMessage: `Response was not a JSON array (got ${typeof parsed})`,
    }
  }

  // 5. Validate each element — skip malformed ones
  const findings: ScanFinding[] = []
  let skippedCount = 0

  for (const item of parsed) {
    const finding = validateFinding(item)
    if (finding !== null) {
      findings.push(finding)
    } else {
      skippedCount++
    }
  }

  return {
    findings,
    skippedCount,
    parseError: false,
  }
}

// ─── Deduplication ────────────────────────────────────────────────────────────

/**
 * Remove duplicate findings across sections by (check_name, file_path) key.
 * Keeps the first occurrence encountered.
 */
export function deduplicateFindings(findings: ScanFinding[]): ScanFinding[] {
  const seen = new Set<string>()
  return findings.filter((f) => {
    const key = `${f.check_name}::${f.file_path}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
