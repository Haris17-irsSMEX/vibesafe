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
  // If there's a code block anywhere, extract its contents.
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) {
    return fenceMatch[1].trim()
  }
  return raw.trim()
}

// ─── Extraction Fallbacks ─────────────────────────────────────────────────────

function extractObject(raw: string): string | null {
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) {
    return raw.slice(first, last + 1)
  }
  return null
}

function extractArray(raw: string): string | null {
  const first = raw.indexOf('[')
  const last = raw.lastIndexOf(']')
  if (first !== -1 && last !== -1 && last > first) {
    return raw.slice(first, last + 1)
  }
  return null
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
  let severityRaw = optionalString(raw.severity)?.toUpperCase()
  const category = optionalString(raw.category) || 'general'
  const file_path = optionalString(raw.file_path)
  const description = optionalString(raw.description)
  const recommendation = optionalString(raw.recommendation)

  if (!check_name || !file_path || !description || !recommendation) {
    return null
  }

  // Fallback severity to MEDIUM if unknown
  if (!isSeverity(severityRaw)) {
    severityRaw = 'MEDIUM'
  }
  const severity = severityRaw as Severity

  // Optional fields
  const line_number = optionalNumber(raw.line_number)
  const cwe_id = optionalString(raw.cwe_id) || optionalString(raw.cwe)
  const owasp = optionalString(raw.owasp) || optionalString(raw.owasp_category)
  const evidence_snippet = optionalString(raw.evidence_snippet)
  const vulnerable_code = optionalString(raw.vulnerable_code)
  const why_it_matters = optionalString(raw.why_it_matters)
  const fix_prompt = optionalString(raw.fix_prompt)
  
  let confidenceRaw = optionalString(raw.confidence)?.toLowerCase()
  if (confidenceRaw !== 'high' && confidenceRaw !== 'medium' && confidenceRaw !== 'low') {
    confidenceRaw = 'medium'
  }
  const confidence = confidenceRaw as 'high' | 'medium' | 'low'

  const finding: ScanFinding = {
    check_name,
    severity,
    category,
    file_path,
    description,
    recommendation,
    confidence,
  }

  if (line_number !== undefined) finding.line_number = line_number
  if (cwe_id !== undefined) finding.cwe_id = cwe_id
  if (owasp !== undefined) finding.owasp = owasp
  if (evidence_snippet !== undefined) finding.evidence_snippet = evidence_snippet
  if (vulnerable_code !== undefined) finding.vulnerable_code = vulnerable_code
  if (why_it_matters !== undefined) finding.why_it_matters = why_it_matters
  if (fix_prompt !== undefined) finding.fix_prompt = fix_prompt

  return finding
}

// ─── Safe Logging Helper ──────────────────────────────────────────────────────

function getSafeLogSnippet(raw: string): string {
  let snippet = raw.slice(0, 300)
  // Redact potential secrets
  snippet = snippet.replace(/sk_[a-zA-Z0-9]+/g, 'sk_...REDACTED')
  snippet = snippet.replace(/ghp_[a-zA-Z0-9]+/g, 'ghp_...REDACTED')
  snippet = snippet.replace(/ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT REDACTED]')
  snippet = snippet.replace(/(?:api_key|password|secret)["']?\s*:\s*["'][^"']+["']/gi, '"REDACTED"')
  return snippet
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
  if (cleaned === '' || cleaned === '[]' || cleaned === '{"findings":[]}') {
    return {
      findings: [],
      skippedCount: 0,
      parseError: false,
    }
  }

  // 3. Attempt JSON parse with fallbacks
  let parsed: unknown = null

  const tryParse = (str: string) => {
    try {
      return JSON.parse(str)
    } catch (e) {
      return null
    }
  }

  parsed = tryParse(cleaned)

  // Fallback 1: Extract JSON Object
  if (!parsed) {
    const objStr = extractObject(cleaned)
    if (objStr) parsed = tryParse(objStr)
  }

  // Fallback 2: Extract JSON Array
  if (!parsed) {
    const arrStr = extractArray(cleaned)
    if (arrStr) {
      const arrParsed = tryParse(arrStr)
      if (Array.isArray(arrParsed)) {
        parsed = { findings: arrParsed }
      }
    }
  }

  if (!parsed) {
    const snippet = getSafeLogSnippet(rawText)
    const hasFence = rawText.includes('\`\`\`')
    const hasBraces = rawText.includes('{') || rawText.includes('[')
    console.warn(`[FindingParser] Response parsing failed. Length: ${rawText.length}, hasFence: ${hasFence}, hasBraces: ${hasBraces}. Snippet: ${snippet}`)
    
    return {
      findings: [],
      skippedCount: 0,
      parseError: true,
      parseErrorMessage: 'Failed to parse AI response. The response was not valid JSON.',
    }
  }

  // 4. Extract findings array
  let findingsArray: unknown = parsed
  if (isRecord(parsed) && Array.isArray(parsed.findings)) {
    findingsArray = parsed.findings
  } else if (isRecord(parsed) && optionalString(parsed.check_name)) {
    // If object itself looks like a single finding, wrap it as one finding
    findingsArray = [parsed]
  }

  if (!Array.isArray(findingsArray)) {
    const snippet = getSafeLogSnippet(rawText)
    console.warn(`[FindingParser] Response was not a JSON array. Length: ${rawText.length}, Snippet: ${snippet}`)
    return {
      findings: [],
      skippedCount: 0,
      parseError: true,
      parseErrorMessage: 'Response was not a JSON array.',
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
