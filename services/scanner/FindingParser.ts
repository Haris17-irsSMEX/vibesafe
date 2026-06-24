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

// ─── Validate a single finding ────────────────────────────────────────────────

/**
 * Validates a raw object against the ScanFinding schema.
 * Returns a typed ScanFinding if valid, or null if it fails validation.
 */
function validateFinding(raw: unknown): ScanFinding | null {
  if (!isRecord(raw)) return null

  // Required fields
  const check_name = optionalString(raw.check_name)
  let severityRaw = optionalString(raw.severity)?.toUpperCase()
  let category = optionalString(raw.category) || 'general'
  const file_path = optionalString(raw.file_path)
  const description = optionalString(raw.description)
  const recommendation = optionalString(raw.recommendation)

  if (!check_name || !file_path || !description || !recommendation) {
    return null
  }

  if (!isSeverity(severityRaw)) {
    return null
  }
  const severity = severityRaw as Severity

  // Optional fields
  const line_number = optionalNumber(raw.line_number)
  const cwe_id = optionalString(raw.cwe_id) || optionalString(raw.cwe)
  const evidence_snippet = optionalString(raw.evidence_snippet)
  
  let confidenceRaw = optionalString(raw.confidence)?.toLowerCase()
  if (confidenceRaw !== 'high' && confidenceRaw !== 'medium' && confidenceRaw !== 'low') {
    confidenceRaw = 'medium'
  }
  const confidence = confidenceRaw as 'high' | 'medium' | 'low'

  return {
    check_name,
    severity,
    category,
    file_path,
    description,
    recommendation,
    ...(line_number !== undefined && { line_number }),
    ...(cwe_id !== undefined && { cwe_id }),
    ...(evidence_snippet !== undefined && { evidence_snippet }),
    confidence,
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

  // 4. Must be an array, or an object with a "findings" array
  let findingsArray: unknown = parsed
  if (isRecord(parsed) && Array.isArray(parsed.findings)) {
    findingsArray = parsed.findings
  }

  if (!Array.isArray(findingsArray)) {
    // Determine a safe snippet to log
    let snippet = cleaned.slice(0, 300)
    // Basic heuristic to avoid logging secrets in the response
    if (snippet.match(/(?:sk-|ghp_|ey[A-Za-z0-9-_=]+\.)/)) {
       snippet = 'response redacted'
    }
    console.warn(`[FindingParser] Response was not a JSON array. Length: ${cleaned.length}, Snippet: ${snippet}`)
    return {
      findings: [],
      skippedCount: 0,
      parseError: true,
      parseErrorMessage: `Response was not a JSON array.`,
    }
  }

  // 5. Validate each element — skip malformed ones
  const findings: ScanFinding[] = []
  let skippedCount = 0

  for (const item of findingsArray) {
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
