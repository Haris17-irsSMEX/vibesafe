/**
 * Normalizes useful provider finding shapes before the evidence verifier makes
 * the final trust decision. This layer never invents locations or evidence.
 */

import type { AuditChecklistItem, AuditReport, ChecklistVerdict, FullParseResult, ParseResult, ScanFinding, SecurityPosture, Severity } from '@/lib/types'

const VALID_SEVERITIES = new Set<Severity>(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
const VALID_VERDICTS = new Set<ChecklistVerdict>(['pass', 'fail', 'partial', 'na'])
const VALID_POSTURES = new Set<SecurityPosture>(['critical', 'needs_work', 'acceptable', 'strong'])
const FINDING_ARRAY_KEYS = ['findings', 'issues', 'vulnerabilities', 'results'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function optionalNumber(value: unknown): number | undefined {
  const number = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : NaN
  return Number.isFinite(number) && number > 0 ? Math.round(number) : undefined
}

function firstString(raw: Record<string, unknown>, aliases: readonly string[], detected?: Set<string>): string | undefined {
  for (const alias of aliases) {
    const value = optionalString(raw[alias])
    if (value) {
      detected?.add(alias)
      return value
    }
  }
  return undefined
}

function firstNumber(raw: Record<string, unknown>, aliases: readonly string[], detected?: Set<string>): number | undefined {
  for (const alias of aliases) {
    const value = optionalNumber(raw[alias])
    if (value !== undefined) {
      detected?.add(alias)
      return value
    }
  }
  return undefined
}

function stringList(raw: Record<string, unknown>, aliases: readonly string[], detected?: Set<string>): string[] | undefined {
  for (const alias of aliases) {
    const value = raw[alias]
    if (Array.isArray(value)) {
      const result = value.map(optionalString).filter((item): item is string => Boolean(item)).slice(0, 5)
      if (result.length) {
        detected?.add(alias)
        return result
      }
    }
    const single = optionalString(value)
    if (single) {
      detected?.add(alias)
      return [single]
    }
  }
  return undefined
}

function stripMarkdownFences(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  return fenced ? fenced[1].trim() : raw.trim()
}

function extractObject(raw: string): string | null {
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  return first !== -1 && last > first ? raw.slice(first, last + 1) : null
}

function extractArray(raw: string): string | null {
  const first = raw.indexOf('[')
  const last = raw.lastIndexOf(']')
  return first !== -1 && last > first ? raw.slice(first, last + 1) : null
}

function tryParse(raw: string): unknown {
  try { return JSON.parse(raw) } catch { return null }
}

function attemptParse(rawText: string): unknown {
  const cleaned = stripMarkdownFences(rawText)
  if (!cleaned || cleaned === '[]' || cleaned === '{"findings":[]}') return { findings: [] }
  return tryParse(cleaned) ?? (extractObject(cleaned) ? tryParse(extractObject(cleaned)!) : null) ?? (extractArray(cleaned) ? tryParse(extractArray(cleaned)!) : null)
}

function findingArrayFromParsed(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed
  if (!isRecord(parsed)) return []
  for (const key of FINDING_ARRAY_KEYS) if (Array.isArray(parsed[key])) return parsed[key] as unknown[]
  if (isRecord(parsed.data)) return findingArrayFromParsed(parsed.data)
  if (firstString(parsed, ['title', 'check_name', 'name', 'issue', 'vulnerability', 'finding', 'summary'])) return [parsed]
  return []
}

function fallbackFindingArray(rawText: string): unknown[] {
  const cleaned = stripMarkdownFences(rawText)
  for (const key of FINDING_ARRAY_KEYS) {
    const match = cleaned.match(new RegExp(`"${key}"\\s*:\\s*(\\[[\\s\\S]*?\\])\\s*(?:,\\s*"|\\})`, 'i'))
    if (match) {
      const value = tryParse(match[1])
      if (Array.isArray(value)) return value
    }
  }
  const array = extractArray(cleaned)
  const value = array ? tryParse(array) : null
  return Array.isArray(value) ? value : []
}

function normalizeLocation(value: string | undefined): { path?: string; line?: number; end?: number } {
  if (!value) return {}
  const match = value.match(/^(.+?):(\d+)(?:\s*(?:-|–|to)\s*(\d+))?$/)
  if (!match) return { path: value }
  return { path: match[1], line: Number(match[2]), end: match[3] ? Number(match[3]) : undefined }
}

function normalizeSeverity(value: string | undefined): Severity {
  const normalized = value?.toUpperCase()
  if (normalized === 'INFO' || normalized === 'INFORMATIONAL') return 'LOW'
  return normalized && VALID_SEVERITIES.has(normalized as Severity) ? normalized as Severity : 'MEDIUM'
}

function normalizeFinding(raw: unknown, aliasFields: Set<string>): { finding?: ScanFinding; discardReason?: string } {
  if (!isRecord(raw)) return { discardReason: 'not_object' }

  const title = firstString(raw, ['title', 'check_name', 'name', 'issue', 'vulnerability', 'finding', 'summary'], aliasFields)
  const description = firstString(raw, ['description', 'details', 'explanation', 'issue_description', 'why_it_matters', 'impact'], aliasFields)
  const evidence = firstString(raw, ['evidence', 'code', 'code_snippet', 'vulnerable_code', 'vulnerableCodeSnippet', 'snippet', 'proof'], aliasFields)
  const vulnerableCode = firstString(raw, ['vulnerableCodeSnippet', 'vulnerable_code', 'code_snippet', 'code', 'snippet'], aliasFields)
  const location = normalizeLocation(firstString(raw, ['affectedFile', 'affected_file', 'file', 'file_path', 'path', 'location', 'source_file'], aliasFields))
  const lineStart = firstNumber(raw, ['line', 'lineStart', 'line_start', 'start_line', 'line_number'], aliasFields) ?? location.line
  const lineEnd = firstNumber(raw, ['lineEnd', 'line_end', 'end_line'], aliasFields) ?? location.end
  const recommendation = firstString(raw, ['recommendation', 'fix', 'remediation', 'solution', 'suggested_fix', 'fix_recommendation'], aliasFields)
  const whyItMatters = firstString(raw, ['whyItMatters', 'why_it_matters', 'impact', 'explanation'], aliasFields)
  const attackScenario = firstString(raw, ['attackScenario', 'attack_scenario', 'exploit_scenario', 'abuse_case'], aliasFields)
  const falsePositiveRisk = firstString(raw, ['falsePositiveRisk', 'false_positive_risk', 'false_positive_notes'], aliasFields)
  const verificationSteps = stringList(raw, ['verificationSteps', 'verification_steps', 'steps_to_verify', 'reproduce', 'reproduction_steps'], aliasFields)
  const cwe = firstString(raw, ['cwe', 'cweId', 'cwe_id'], aliasFields)
  const owasp = firstString(raw, ['owasp', 'owaspCategory', 'owasp_category'], aliasFields)
  const rawStatus = firstString(raw, ['status', 'finding_status'], aliasFields)
  const status = rawStatus === 'confirmed' || rawStatus === 'potential' || rawStatus === 'needs_manual_verification'
    ? rawStatus
    : location.path && (evidence || vulnerableCode) ? 'potential' : 'needs_manual_verification'

  // A title alone is not useful analysis. Preserve a useful explanation/evidence
  // even when the provider omitted a recommendation or a precise location.
  if (!title && !description && !evidence) return { discardReason: 'missing_title_description_and_evidence' }
  const checkName = title || 'Security finding'
  const usefulDescription = description || evidence || `Review the reported security concern: ${checkName}.`
  const explicitConfidence = firstString(raw, ['confidence'], aliasFields)?.toLowerCase()
  const confidence: 'high' | 'medium' | 'low' = explicitConfidence === 'high' && location.path && (evidence || vulnerableCode)
    ? 'high'
    : description || evidence ? 'medium' : 'low'

  const finding: ScanFinding = {
    check_name: checkName,
    severity: normalizeSeverity(firstString(raw, ['severity'], aliasFields)),
    category: firstString(raw, ['category', 'type', 'domain'], aliasFields) || 'security',
    description: usefulDescription,
    recommendation: recommendation || 'Review the affected implementation and add the appropriate server-side security control.',
    confidence,
    finding_status: status,
    false_positive_risk: falsePositiveRisk || (status === 'needs_manual_verification' ? 'Location or evidence is limited; manual verification is required.' : undefined),
  }
  if (location.path) finding.file_path = location.path
  if (lineStart !== undefined) finding.line_number = lineStart
  if (lineEnd !== undefined && (!lineStart || lineEnd >= lineStart)) finding.line_end = lineEnd
  if (evidence) finding.evidence = evidence
  if (evidence) finding.evidence_snippet = evidence
  if (vulnerableCode) finding.vulnerable_code = vulnerableCode
  if (whyItMatters) finding.why_it_matters = whyItMatters
  if (attackScenario) finding.attack_scenario = attackScenario
  if (verificationSteps) finding.verification_steps = verificationSteps
  if (cwe && /^CWE-\d+$/i.test(cwe)) finding.cwe_id = cwe.toUpperCase()
  if (owasp) finding.owasp = owasp
  const fixPrompt = firstString(raw, ['fixPrompt', 'fix_prompt'], aliasFields)
  if (fixPrompt) finding.fix_prompt = fixPrompt
  return { finding }
}

function validateChecklistItem(raw: unknown): AuditChecklistItem | null {
  if (!isRecord(raw)) return null
  const id = optionalString(raw.id)
  const section = optionalString(raw.section)
  const check = optionalString(raw.check)
  if (!id || !section || !check) return null
  const verdict = optionalString(raw.verdict)?.toLowerCase()
  return { id, section, check, verdict: verdict && VALID_VERDICTS.has(verdict as ChecklistVerdict) ? verdict as ChecklistVerdict : 'partial', evidence: optionalString(raw.evidence) || '', file_path: optionalString(raw.file_path) || null }
}

function validateAuditReport(raw: unknown): AuditReport | null {
  if (!isRecord(raw)) return null
  const posture = optionalString(raw.security_posture)?.toLowerCase()
  const executive_summary = optionalString(raw.executive_summary) || ''
  if (!executive_summary) return null
  const list = (value: unknown) => Array.isArray(value) ? value.map(optionalString).filter((item): item is string => Boolean(item)) : []
  return {
    security_posture: posture && VALID_POSTURES.has(posture as SecurityPosture) ? posture as SecurityPosture : 'needs_work',
    executive_summary,
    quick_wins: list(raw.quick_wins),
    what_is_done_right: list(raw.what_is_done_right),
    priority_plan: list(raw.priority_plan),
  }
}

function getSafeLogSnippet(raw: string): string {
  return raw.slice(0, 300)
    .replace(/sk_[a-zA-Z0-9]+/g, 'sk_...REDACTED')
    .replace(/ghp_[a-zA-Z0-9]+/g, 'ghp_...REDACTED')
    .replace(/ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT REDACTED]')
    .replace(/(?:api_key|password|secret)["']?\s*:\s*["'][^"']+["']/gi, '"REDACTED"')
}

function normalizeRawFindings(rawItems: unknown[]): { findings: ScanFinding[]; skippedCount: number; aliasFields: string[]; discardReasons: Record<string, number> } {
  const findings: ScanFinding[] = []
  const aliases = new Set<string>()
  const discardReasons: Record<string, number> = {}
  for (const item of rawItems) {
    const result = normalizeFinding(item, aliases)
    if (result.finding) findings.push(result.finding)
    else {
      const reason = result.discardReason || 'invalid_finding'
      discardReasons[reason] = (discardReasons[reason] || 0) + 1
    }
  }
  return { findings, skippedCount: rawItems.length - findings.length, aliasFields: Array.from(aliases), discardReasons }
}

function logNormalization(rawCount: number, normalized: ReturnType<typeof normalizeRawFindings>, parseFailed: boolean) {
  console.info('[FindingParser] normalization summary', {
    rawFindingCount: rawCount,
    normalizedFindingCount: normalized.findings.length,
    discardedFindingCount: normalized.skippedCount,
    discardReasons: normalized.discardReasons,
    aliasFieldsDetected: normalized.aliasFields,
    parseFailed,
  })
}

export function parseFindings(rawText: string): ParseResult {
  const parsed = attemptParse(rawText)
  const rawItems = parsed ? findingArrayFromParsed(parsed) : fallbackFindingArray(rawText)
  const normalized = normalizeRawFindings(rawItems)
  const parseError = !parsed && rawItems.length === 0
  if (parseError) console.warn('[FindingParser] response parse failed', { length: rawText.length, snippet: getSafeLogSnippet(rawText) })
  logNormalization(rawItems.length, normalized, parseError)
  return { findings: normalized.findings, skippedCount: normalized.skippedCount, parseError, parseErrorMessage: parseError ? 'Failed to parse AI response.' : undefined }
}

export function parseFullAuditResponse(rawText: string): FullParseResult {
  const parsed = attemptParse(rawText)
  const rawItems = parsed ? findingArrayFromParsed(parsed) : fallbackFindingArray(rawText)
  const normalized = normalizeRawFindings(rawItems)
  const hasUsefulFindingShape = rawItems.length > 0 && normalized.findings.length > 0
  const hasAuditShape = Array.isArray(parsed) || (isRecord(parsed) && (
    FINDING_ARRAY_KEYS.some((key) => Array.isArray(parsed[key])) || Array.isArray(parsed.checklist) || isRecord(parsed.report) || hasUsefulFindingShape
  ))

  const checklist: AuditChecklistItem[] = []
  if (isRecord(parsed) && Array.isArray(parsed.checklist)) for (const item of parsed.checklist) {
    const checklistItem = validateChecklistItem(item)
    if (checklistItem) checklist.push(checklistItem)
  }
  const report = isRecord(parsed) && isRecord(parsed.report) ? validateAuditReport(parsed.report) : null
  const parseError = !hasAuditShape && !hasUsefulFindingShape
  if (parseError) console.warn('[FindingParser] full audit parse failed', { length: rawText.length, snippet: getSafeLogSnippet(rawText) })
  logNormalization(rawItems.length, normalized, parseError)
  return {
    findings: normalized.findings,
    skippedCount: normalized.skippedCount,
    parseError,
    parseErrorMessage: parseError ? 'Failed to parse a supported security audit response.' : undefined,
    checklist,
    report,
  }
}

export function deduplicateFindings(findings: ScanFinding[]): ScanFinding[] {
  const seen = new Set<string>()
  return findings.filter((finding) => {
    const key = `${finding.check_name}:${finding.file_path ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
