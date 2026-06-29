/**
 * services/scanner/FindingParser.ts
 *
 * Safely parses the raw text response from DeepSeek into typed ScanFinding[],
 * and optionally extracts checklist + report data for strict audit mode (Phase 8G).
 *
 * Rules:
 * - Accepts only JSON arrays or objects
 * - Validates each finding against the schema
 * - Skips malformed findings rather than failing entirely
 * - Never throws unhandled exceptions
 * - Returns parse error metadata alongside valid findings
 */

import type { ScanFinding, Severity, ParseResult, AuditChecklistItem, ChecklistVerdict, AuditReport, SecurityPosture, FullParseResult } from '@/lib/types'

// ─── Constants ───────────────────────────────────────────────────────────────

const VALID_SEVERITIES = new Set<Severity>(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
const VALID_VERDICTS = new Set<ChecklistVerdict>(['pass', 'fail', 'partial', 'na'])
const VALID_POSTURES = new Set<SecurityPosture>(['critical', 'needs_work', 'acceptable', 'strong'])

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

function validateFinding(raw: unknown): ScanFinding | null {
  if (!isRecord(raw)) return null

  const check_name = optionalString(raw.check_name)
  let severityRaw = optionalString(raw.severity)?.toUpperCase()
  const category = optionalString(raw.category) || 'general'
  const file_path = optionalString(raw.file_path)
  const description = optionalString(raw.description)
  const recommendation = optionalString(raw.recommendation)

  if (!check_name || !file_path || !description || !recommendation) {
    return null
  }

  if (!isSeverity(severityRaw)) {
    severityRaw = 'MEDIUM'
  }
  const severity = severityRaw as Severity

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

// ─── Validate a single checklist item ─────────────────────────────────────────

function validateChecklistItem(raw: unknown): AuditChecklistItem | null {
  if (!isRecord(raw)) return null

  const id = optionalString(raw.id)
  const section = optionalString(raw.section)
  const check = optionalString(raw.check)
  const verdictRaw = optionalString(raw.verdict)?.toLowerCase()

  if (!id || !section || !check) return null

  const verdict: ChecklistVerdict = (verdictRaw && VALID_VERDICTS.has(verdictRaw as ChecklistVerdict))
    ? (verdictRaw as ChecklistVerdict)
    : 'partial'

  const evidence = optionalString(raw.evidence) || ''
  const file_path = optionalString(raw.file_path) || null

  return { id, section, check, verdict, evidence, file_path }
}

// ─── Validate audit report ────────────────────────────────────────────────────

function validateAuditReport(raw: unknown): AuditReport | null {
  if (!isRecord(raw)) return null

  const postureRaw = optionalString(raw.security_posture)?.toLowerCase()
  const security_posture: SecurityPosture = (postureRaw && VALID_POSTURES.has(postureRaw as SecurityPosture))
    ? (postureRaw as SecurityPosture)
    : 'needs_work'

  const executive_summary = optionalString(raw.executive_summary) || ''
  const quick_wins = Array.isArray(raw.quick_wins)
    ? (raw.quick_wins as unknown[]).map(s => typeof s === 'string' ? s : '').filter(Boolean)
    : []
  const what_is_done_right = Array.isArray(raw.what_is_done_right)
    ? (raw.what_is_done_right as unknown[]).map(s => typeof s === 'string' ? s : '').filter(Boolean)
    : []
  const priority_plan = Array.isArray(raw.priority_plan)
    ? (raw.priority_plan as unknown[]).map(s => typeof s === 'string' ? s : '').filter(Boolean)
    : []

  if (!executive_summary) return null

  return { security_posture, executive_summary, quick_wins, what_is_done_right, priority_plan }
}

// ─── Safe Logging Helper ──────────────────────────────────────────────────────

function getSafeLogSnippet(raw: string): string {
  let snippet = raw.slice(0, 300)
  snippet = snippet.replace(/sk_[a-zA-Z0-9]+/g, 'sk_...REDACTED')
  snippet = snippet.replace(/ghp_[a-zA-Z0-9]+/g, 'ghp_...REDACTED')
  snippet = snippet.replace(/ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT REDACTED]')
  snippet = snippet.replace(/(?:api_key|password|secret)["']?\s*:\s*["'][^"']+["']/gi, '"REDACTED"')
  return snippet
}

// ─── JSON parsing helpers ─────────────────────────────────────────────────────

function tryParse(str: string): unknown {
  try {
    return JSON.parse(str)
  } catch {
    return null
  }
}

function attemptParse(rawText: string): unknown {
  const cleaned = stripMarkdownFences(rawText)

  if (cleaned === '' || cleaned === '[]' || cleaned === '{"findings":[]}') {
    return { findings: [] }
  }

  let parsed = tryParse(cleaned)

  if (!parsed) {
    const objStr = extractObject(cleaned)
    if (objStr) parsed = tryParse(objStr)
  }

  if (!parsed) {
    const arrStr = extractArray(cleaned)
    if (arrStr) {
      const arrParsed = tryParse(arrStr)
      if (Array.isArray(arrParsed)) {
        parsed = { findings: arrParsed }
      }
    }
  }

  return parsed
}

// ─── Main parser (backward compatible) ────────────────────────────────────────

/**
 * Parse the raw text response from DeepSeek into typed findings.
 * Always returns a ParseResult — never throws.
 */
export function parseFindings(rawText: string): ParseResult {
  const parsed = attemptParse(rawText)

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

  let findingsArray: unknown = parsed
  if (isRecord(parsed) && Array.isArray(parsed.findings)) {
    findingsArray = parsed.findings
  } else if (isRecord(parsed) && optionalString(parsed.check_name)) {
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

// ─── Full audit parser (Phase 8G) ─────────────────────────────────────────────

/**
 * Parse the raw text response from DeepSeek into findings + checklist + report.
 *
 * Always returns a FullParseResult — never throws.
 * If checklist or report is missing/malformed, returns empty checklist and null report
 * but still preserves valid findings.
 */
export function parseFullAuditResponse(rawText: string): FullParseResult {
  const parsed = attemptParse(rawText)

  if (!parsed) {
    const snippet = getSafeLogSnippet(rawText)
    console.warn(`[FindingParser] Full audit JSON parse failed, attempting aggressive fallback. Length: ${rawText.length}. Snippet: ${snippet}`)
  }

  // ── Extract findings ────────────────────────────────────────────────────
  let findingsArray: unknown[] = []
  if (isRecord(parsed) && Array.isArray(parsed.findings)) {
    findingsArray = parsed.findings as unknown[]
  } else if (Array.isArray(parsed)) {
    findingsArray = parsed
  } else if (isRecord(parsed) && optionalString(parsed.check_name)) {
    findingsArray = [parsed]
  } else if (!parsed) {
    // Aggressive fallback to extract just the findings array if full JSON fails
    const cleaned = stripMarkdownFences(rawText)
    const findingsMatch = cleaned.match(/"findings"\s*:\s*(\[[\s\S]*?\])\s*(?:,\s*"checklist"|,\s*"report"|\})/i)
    if (findingsMatch) {
      const arrStr = findingsMatch[1]
      try {
        const arrParsed = JSON.parse(arrStr)
        if (Array.isArray(arrParsed)) findingsArray = arrParsed
      } catch (e) {
        // Fallback to extractArray if regex fails to yield valid JSON
        const arrStr2 = extractArray(cleaned)
        if (arrStr2) {
          try {
            const arrParsed2 = JSON.parse(arrStr2)
            if (Array.isArray(arrParsed2)) findingsArray = arrParsed2
          } catch {}
        }
      }
    }
  }

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

  // ── Extract checklist ───────────────────────────────────────────────────
  const checklist: AuditChecklistItem[] = []
  if (isRecord(parsed) && Array.isArray(parsed.checklist)) {
    for (const item of parsed.checklist as unknown[]) {
      const ci = validateChecklistItem(item)
      if (ci) checklist.push(ci)
    }
  }

  // ── Extract report ──────────────────────────────────────────────────────
  let report: AuditReport | null = null
  if (isRecord(parsed) && isRecord(parsed.report)) {
    report = validateAuditReport(parsed.report)
  }

  console.log(`[FindingParser] Full audit parsed: findings=${findings.length}, checklist=${checklist.length}, report=${report ? 'yes' : 'no'}`)

  return {
    findings,
    skippedCount,
    parseError: false,
    checklist,
    report,
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
