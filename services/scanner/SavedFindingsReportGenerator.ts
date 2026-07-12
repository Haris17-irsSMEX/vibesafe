/**
 * Generates a Security Officer Report from persisted scan data only.
 * Provider prose is optional: deterministic saved-finding data always remains
 * the authority for risks, severity, remediation order, and affected areas.
 */

import type { ScanRecord } from '@/lib/db/scans'
import type { ScanResultRecord } from '@/lib/db/scan-results'
import type { AuditChecklistItem, AuditReport } from '@/lib/types'
import { runSectionScan } from './DeepSeekScanner'
import { generateSecurityReport, type ProductionReadiness, type SecurityReport } from './SecurityReportGenerator'

export interface SavedFindingsReportInput {
  scan: ScanRecord
  findings: ScanResultRecord[]
  filesScannedCount: number
}

export type SavedFindingsReportResult =
  | { ok: true; report: SecurityReport }
  | { ok: false; error: string }

const REPORT_SYSTEM_PROMPT = `You write concise Security Officer Report prose for CtrlCode.
Use only the supplied saved findings, saved metadata, and analysis limitations.
Do not discover, infer, or add vulnerabilities. Do not create findings. Do not name files or line numbers not present in the supplied findings. Do not say the repository is fully secure. If analysis limitations are supplied, explicitly state that coverage was partial and never make a full-readiness claim. If no findings are supplied, say no confirmed findings were detected in this scan.
Return JSON only, with no markdown or commentary.`

const REPORT_FIELD_ALIASES = {
  executive_summary: ['executiveSummary', 'executive_summary', 'summary'],
  security_verdict: ['securityVerdict', 'security_verdict', 'verdict'],
  production_readiness: ['productionReadiness', 'production_readiness', 'readiness'],
  top_risks: ['topRisks', 'top_risks', 'risks'],
  remediation_plan: ['remediationPlan', 'remediation_plan', 'action_plan'],
  business_impact: ['businessImpact', 'business_impact', 'impact'],
  technical_summary: ['technicalSummary', 'technical_summary'],
  estimated_fix_effort: ['estimatedFixEffort', 'estimated_fix_effort', 'fix_effort'],
} as const

type ProviderReport = Partial<Record<keyof typeof REPORT_FIELD_ALIASES, string | unknown[]>> & {
  referencedFindingIds?: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asText(value: unknown, maxLength = 2_000): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, maxLength) : null
}

function firstAliasText(record: Record<string, unknown>, aliases: readonly string[], maxLength = 2_000): string | null {
  for (const alias of aliases) {
    const value = asText(record[alias], maxLength)
    if (value) return value
  }
  return null
}

function firstAliasValue(record: Record<string, unknown>, aliases: readonly string[]): unknown {
  for (const alias of aliases) if (record[alias] !== undefined) return record[alias]
  return undefined
}

function hasMarkdownFence(rawText: string): boolean {
  return /```(?:json)?/i.test(rawText)
}

function extractJson(rawText: string): { value: unknown | null; lookedLikeJson: boolean } {
  const trimmed = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const lookedLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[') || rawText.includes('```')
  try {
    return { value: JSON.parse(trimmed), lookedLikeJson }
  } catch {
    const first = trimmed.indexOf('{')
    const last = trimmed.lastIndexOf('}')
    if (first < 0 || last <= first) return { value: null, lookedLikeJson }
    try {
      return { value: JSON.parse(trimmed.slice(first, last + 1)), lookedLikeJson: true }
    } catch {
      return { value: null, lookedLikeJson: true }
    }
  }
}

function readChecklist(value: unknown): AuditChecklistItem[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is AuditChecklistItem => (
    isRecord(item)
    && typeof item.id === 'string'
    && typeof item.section === 'string'
    && typeof item.check === 'string'
    && typeof item.verdict === 'string'
    && typeof item.evidence === 'string'
  ))
}

function readAuditReport(scan: ScanRecord): AuditReport | null {
  const posture = scan.security_posture
  if (posture !== 'critical' && posture !== 'needs_work' && posture !== 'acceptable' && posture !== 'strong') return null
  return {
    security_posture: posture,
    executive_summary: '',
    quick_wins: Array.isArray(scan.quick_wins) ? scan.quick_wins.filter((item): item is string => typeof item === 'string') : [],
    what_is_done_right: Array.isArray(scan.what_is_done_right) ? scan.what_is_done_right.filter((item): item is string => typeof item === 'string') : [],
    priority_plan: Array.isArray(scan.priority_plan) ? scan.priority_plan.filter((item): item is string => typeof item === 'string') : [],
  }
}

function matchesSavedLocations(text: string, findings: ScanResultRecord[]): boolean {
  const allowedPaths = new Set(findings.map((finding) => finding.file_path).filter(Boolean))
  const allowedLines = new Set(findings.map((finding) => finding.line_number).filter((line): line is number => typeof line === 'number'))
  const pathPattern = /(?:^|[\s`'"(])([A-Za-z0-9_@./-]+\.(?:[cm]?[jt]sx?|py|rb|php|java|go|rs|cs|json|ya?ml))(?:$|[\s`'"),.:;])/g
  let match: RegExpExecArray | null
  while ((match = pathPattern.exec(text)) !== null) if (!allowedPaths.has(match[1])) return false
  const linePattern = /\bline\s+(\d+)\b/gi
  while ((match = linePattern.exec(text)) !== null) if (!allowedLines.has(Number(match[1]))) return false
  return true
}

function usesOnlySavedSeverities(text: string, findings: ScanResultRecord[]): boolean {
  const allowed = new Set(findings.map((finding) => finding.severity.toLowerCase()))
  const mentioned = text.toLowerCase().match(/\b(critical|high|medium|low)\b/g) ?? []
  return mentioned.every((severity) => allowed.has(severity))
}

function normalizeProviderReport(value: unknown): ProviderReport | null {
  if (!isRecord(value)) return null
  const normalized: ProviderReport = {}
  for (const [field, aliases] of Object.entries(REPORT_FIELD_ALIASES) as Array<[keyof typeof REPORT_FIELD_ALIASES, readonly string[]]>) {
    const raw = firstAliasValue(value, aliases)
    if (field === 'top_risks' || field === 'remediation_plan') {
      if (Array.isArray(raw)) normalized[field] = raw
      continue
    }
    const text = firstAliasText(value, aliases, field === 'estimated_fix_effort' ? 500 : 2_000)
    if (text) normalized[field] = text
  }
  const ids = firstAliasValue(value, ['referencedFindingIds', 'referenced_finding_ids', 'findingIds', 'finding_ids'])
  if (Array.isArray(ids)) normalized.referencedFindingIds = ids.filter((id): id is string => typeof id === 'string')
  return Object.keys(normalized).length ? normalized : null
}

function isValidReadiness(value: unknown): value is ProductionReadiness {
  return value === 'ready' || value === 'needs_attention' || value === 'not_ready' || value === 'critical_risk'
}

function withWarning(text: string, warnings: string[]): string {
  return warnings.length ? `${text} ${warnings.join(' ')}` : text
}

function applyPartialCoverage(report: SecurityReport, warnings: string[]): SecurityReport {
  if (!warnings.length) return report
  return {
    ...report,
    executive_summary: `Partial coverage: this report is based only on completed analysis passes and saved evidence. ${withWarning(report.executive_summary, warnings)}`,
    security_verdict: `Partial coverage: remaining areas are not marked clean. ${warnings.join(' ')}`,
    production_readiness: 'needs_attention',
  }
}

function fallbackReport(base: SecurityReport, warnings: string[], reason: string): SecurityReport {
  const fallbackNote = reason === 'unsupported_response'
    ? 'This fallback report was generated from saved findings because the AI report provider returned an unsupported response.'
    : 'This fallback report was generated from saved findings because the AI report provider could not complete the requested summary.'
  return applyPartialCoverage({ ...base, executive_summary: `${base.executive_summary} ${fallbackNote}` }, warnings)
}

function makeRepairPrompt(savedFindings: Array<Record<string, unknown>>, warnings: string[]): string {
  return JSON.stringify({
    instruction: 'Return one valid JSON object only. Use only these saved findings. Do not add findings, file paths, line numbers, technologies, or severities.',
    partialAnalysisWarnings: warnings,
    savedFindings,
    responseSchema: {
      executiveSummary: 'string', businessImpact: 'string', technicalSummary: 'string', estimatedFixEffort: 'string', referencedFindingIds: ['saved finding id'],
    },
  })
}

/**
 * Build a report from rows already persisted in scan_results. This function
 * deliberately receives no repository file contents and cannot create results.
 */
export async function generateSavedFindingsReport(input: SavedFindingsReportInput): Promise<SavedFindingsReportResult> {
  const { scan, findings, filesScannedCount } = input
  const warnings = Array.isArray(scan.analysis_warnings)
    ? scan.analysis_warnings.filter((warning): warning is string => typeof warning === 'string' && Boolean(warning.trim()))
    : []
  const baseReport = generateSecurityReport({
    repoFullName: scan.repo_full_name,
    securityScore: scan.security_score ?? 0,
    criticalCount: scan.critical_count,
    highCount: scan.high_count,
    mediumCount: scan.medium_count,
    lowCount: scan.low_count,
    totalFindings: scan.total_findings,
    findings: findings.map((finding) => ({
      severity: finding.severity, check_name: finding.check_name, category: finding.category,
      description: finding.description, file_path: finding.file_path || undefined,
      recommendation: finding.recommendation, why_it_matters: finding.why_it_matters,
      finding_status: finding.finding_status ?? 'needs_manual_verification', confidence: finding.confidence ?? 'low', evidence: finding.evidence ?? undefined,
    })),
    filesScannedCount,
    scanEngine: scan.scan_engine ?? 'deepseek',
    checklist: readChecklist(scan.audit_checklist),
    auditReport: readAuditReport(scan),
  })

  const savedFindingSummaries = findings.map((finding) => ({
    id: finding.id, title: finding.check_name, severity: finding.severity,
    status: finding.finding_status ?? 'needs_manual_verification', confidence: finding.confidence ?? 'low',
    category: finding.category, affectedFile: finding.file_path || null, lineStart: finding.line_number,
    lineEnd: finding.line_end, evidence: finding.evidence ?? finding.evidence_snippet ?? null,
    whyItMatters: finding.why_it_matters, recommendation: finding.recommendation,
  }))
  const reportInput = makeRepairPrompt(savedFindingSummaries, warnings)
  const startedAt = Date.now()
  let repairAttempted = false
  let fallbackReason: 'provider_failure' | 'unsupported_response' | null = null

  const aiResult = await runSectionScan('security_officer_report', reportInput, REPORT_SYSTEM_PROMPT, {
    scanId: scan.id, selectedFiles: 0, sourceChars: 0, promptChars: reportInput.length,
  })
  if (!aiResult.ok) {
    console.warn('[SavedFindingsReportGenerator] provider unavailable; using deterministic fallback', { scanId: scan.id, findingsCount: findings.length, reason: aiResult.reason, repairAttempted })
    return { ok: true, report: fallbackReport(baseReport, warnings, 'provider_failure') }
  }

  const initialRawText = aiResult.rawText
  let rawText = initialRawText
  let extracted = extractJson(rawText)
  console.info('[SavedFindingsReportGenerator] response diagnostics', {
    scanId: scan.id,
    findingsCount: findings.length,
    responseLength: rawText.length,
    lookedLikeJson: extracted.lookedLikeJson,
    markdownFences: hasMarkdownFence(rawText),
    parsedJson: extracted.value !== null,
    repairAttempted,
  })

  let normalized = normalizeProviderReport(extracted.value)
  if (!normalized) {
    repairAttempted = true
    const repairInput = makeRepairPrompt(savedFindingSummaries.map(({ id, title, severity, status, affectedFile, lineStart }) => ({ id, title, severity, status, affectedFile, lineStart })), warnings)
    const repair = await runSectionScan(
      'security_officer_report_repair',
      repairInput,
      `${REPORT_SYSTEM_PROMPT}\nThe previous response was not usable. Return the compact response schema exactly.`,
      { scanId: scan.id, selectedFiles: 0, sourceChars: 0, promptChars: repairInput.length }
    )
    if (repair.ok) {
      rawText = repair.rawText
      extracted = extractJson(rawText)
      normalized = normalizeProviderReport(extracted.value)
      console.info('[SavedFindingsReportGenerator] repair diagnostics', {
        scanId: scan.id, findingsCount: findings.length, responseLength: rawText.length,
        lookedLikeJson: extracted.lookedLikeJson, markdownFences: hasMarkdownFence(rawText), parsedJson: extracted.value !== null,
        repairAttempted,
      })
    } else {
      console.warn('[SavedFindingsReportGenerator] repair provider failure', { scanId: scan.id, findingsCount: findings.length, reason: repair.reason, repairAttempted })
    }
  }

  console.info('[SavedFindingsReportGenerator] report timing', { scanId: scan.id, durationMs: Date.now() - startedAt, providerUsable: Boolean(normalized), repairAttempted })
  if (!normalized) {
    const prose = asText(initialRawText)
    const referencesSavedFinding = findings.length === 0
      ? prose !== null
      : Boolean(prose && findings.some((finding) => finding.check_name.length > 3 && prose.toLowerCase().includes(finding.check_name.toLowerCase())))
    if (prose && warnings.length === 0 && referencesSavedFinding && matchesSavedLocations(prose, findings) && usesOnlySavedSeverities(prose, findings)) {
      console.info('[SavedFindingsReportGenerator] accepted safe plain-prose summary', { scanId: scan.id, findingsCount: findings.length, responseLength: initialRawText.length, repairAttempted })
      return { ok: true, report: { ...baseReport, executive_summary: prose } }
    }
    console.warn('[SavedFindingsReportGenerator] unsupported response; using deterministic fallback', { scanId: scan.id, findingsCount: findings.length, responseLength: rawText.length, repairAttempted, validationFailure: 'no_supported_report_fields' })
    return { ok: true, report: fallbackReport(baseReport, warnings, 'unsupported_response') }
  }

  const savedIds = new Set(findings.map((finding) => finding.id))
  const referencedIds = normalized.referencedFindingIds ?? []
  const hasUnsupportedReferences = referencedIds.some((id) => !savedIds.has(id))
  const texts = [
    normalized.executive_summary, normalized.security_verdict, normalized.business_impact,
    normalized.technical_summary, normalized.estimated_fix_effort,
  ].filter((text): text is string => typeof text === 'string')
  const narrativesSafe = texts.every((text) => matchesSavedLocations(text, findings) && usesOnlySavedSeverities(text, findings))
  const referencesAreSufficient = findings.length === 0 ? referencedIds.length === 0 : referencedIds.length > 0
  if (hasUnsupportedReferences || !referencesAreSufficient || !narrativesSafe) {
    console.warn('[SavedFindingsReportGenerator] unsupported normalized response; using deterministic fallback', {
      scanId: scan.id,
      findingsCount: findings.length,
      responseLength: rawText.length,
      repairAttempted,
      validationFailure: hasUnsupportedReferences ? 'unknown_finding_reference' : !referencesAreSufficient ? 'missing_finding_references' : 'unsupported_path_line_or_severity',
    })
    return { ok: true, report: fallbackReport(baseReport, warnings, 'unsupported_response') }
  }

  // Top risks and remediation remain deterministic projections of saved rows.
  // Provider prose can improve only high-level fields after it passes location,
  // severity, and saved-finding reference checks.
  const report = { ...baseReport }
  if (warnings.length > 0) return { ok: true, report: applyPartialCoverage(baseReport, warnings) }
  const executiveSummary = asText(normalized.executive_summary)
  const securityVerdict = asText(normalized.security_verdict)
  const businessImpact = asText(normalized.business_impact)
  const technicalSummary = asText(normalized.technical_summary)
  const estimatedFixEffort = asText(normalized.estimated_fix_effort, 500)
  if (executiveSummary) report.executive_summary = executiveSummary
  if (securityVerdict) report.security_verdict = securityVerdict
  if (businessImpact) report.business_impact = businessImpact
  if (technicalSummary) report.technical_summary = technicalSummary
  if (estimatedFixEffort) report.estimated_fix_effort = estimatedFixEffort
  if (isValidReadiness(normalized.production_readiness)) report.production_readiness = normalized.production_readiness
  return { ok: true, report }
}
