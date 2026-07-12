/**
 * Generates a Security Officer Report from persisted scan data only.
 *
 * This boundary must never inspect repository source or create findings. The
 * deterministic report structure remains anchored to saved findings; DeepSeek
 * is used only to make the approved summary fields easier to read.
 */

import type { ScanRecord } from '@/lib/db/scans'
import type { ScanResultRecord } from '@/lib/db/scan-results'
import type { AuditChecklistItem, AuditReport } from '@/lib/types'
import { runSectionScan, type ProviderFailureReason } from './DeepSeekScanner'
import { generateSecurityReport, type SecurityReport } from './SecurityReportGenerator'

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
Do not discover, infer, or add vulnerabilities. Do not create findings. Do not name files or line numbers not present in the supplied findings. Do not say the repository is fully secure. If no findings are supplied, say no confirmed findings were detected in this scan.
Return JSON only, with no markdown or commentary.`

function safeProviderMessage(reason: ProviderFailureReason): string {
  switch (reason) {
    case 'auth': return 'AI provider authentication failed. Please check configuration.'
    case 'rate_limit': return 'AI provider rate limit reached. Please retry shortly.'
    case 'provider_unavailable': return 'AI provider is temporarily unavailable. Please retry.'
    case 'timeout': return 'AI report generation timed out. Please retry.'
    case 'empty_response': return 'AI provider returned an empty response. Please retry.'
    case 'payload_too_large': return 'Report data was too large to summarize. Please retry.'
    default: return 'Security Officer Report generation failed. Please retry.'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asText(value: unknown, maxLength = 2_000): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text ? text.slice(0, maxLength) : null
}

function extractJson(rawText: string): unknown | null {
  const trimmed = rawText.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try {
    return JSON.parse(trimmed)
  } catch {
    const first = trimmed.indexOf('{')
    const last = trimmed.lastIndexOf('}')
    if (first < 0 || last <= first) return null
    try {
      return JSON.parse(trimmed.slice(first, last + 1))
    } catch {
      return null
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
  while ((match = pathPattern.exec(text)) !== null) {
    if (!allowedPaths.has(match[1])) return false
  }

  const linePattern = /\bline\s+(\d+)\b/gi
  while ((match = linePattern.exec(text)) !== null) {
    if (!allowedLines.has(Number(match[1]))) return false
  }
  return true
}

function withWarning(text: string, warnings: string[]): string {
  return warnings.length ? `${text} ${warnings.join(' ')}` : text
}

/**
 * Build a report from rows already persisted in scan_results. This function
 * deliberately receives no repository file contents and cannot create results.
 */
export async function generateSavedFindingsReport(
  input: SavedFindingsReportInput
): Promise<SavedFindingsReportResult> {
  const { scan, findings, filesScannedCount } = input
  const auditReport = readAuditReport(scan)
  const report = generateSecurityReport({
    repoFullName: scan.repo_full_name,
    securityScore: scan.security_score ?? 0,
    criticalCount: scan.critical_count,
    highCount: scan.high_count,
    mediumCount: scan.medium_count,
    lowCount: scan.low_count,
    totalFindings: scan.total_findings,
    findings: findings.map((finding) => ({
      severity: finding.severity,
      check_name: finding.check_name,
      category: finding.category,
      description: finding.description,
      file_path: finding.file_path || undefined,
      recommendation: finding.recommendation,
      why_it_matters: finding.why_it_matters,
      finding_status: finding.finding_status ?? 'needs_manual_verification',
      confidence: finding.confidence ?? 'low',
      evidence: finding.evidence ?? undefined,
    })),
    filesScannedCount,
    scanEngine: scan.scan_engine ?? 'deepseek',
    checklist: readChecklist(scan.audit_checklist),
    auditReport,
  })

  const warnings = Array.isArray(scan.analysis_warnings)
    ? scan.analysis_warnings.filter((warning): warning is string => typeof warning === 'string' && Boolean(warning.trim()))
    : []
  report.executive_summary = withWarning(report.executive_summary, warnings)
  report.security_verdict = withWarning(report.security_verdict, warnings)

  const savedFindingSummaries = findings.map((finding) => ({
    id: finding.id,
    title: finding.check_name,
    severity: finding.severity,
    status: finding.finding_status ?? 'needs_manual_verification',
    confidence: finding.confidence ?? 'low',
    category: finding.category,
    affectedFile: finding.file_path || null,
    lineStart: finding.line_number,
    lineEnd: finding.line_end,
    evidence: finding.evidence ?? finding.evidence_snippet ?? null,
    whyItMatters: finding.why_it_matters,
    recommendation: finding.recommendation,
  }))
  const reportInput = JSON.stringify({
    repo: scan.repo_full_name,
    score: scan.security_score,
    severityCounts: {
      critical: scan.critical_count,
      high: scan.high_count,
      medium: scan.medium_count,
      low: scan.low_count,
    },
    partialAnalysisWarnings: warnings,
    savedFindings: savedFindingSummaries,
    instructions: 'Write concise summaries only. Each summary must be based exclusively on the savedFindings array and must list referencedFindingIds.',
    responseSchema: {
      executiveSummary: 'string',
      businessImpact: 'string',
      technicalSummary: 'string',
      estimatedFixEffort: 'string',
      referencedFindingIds: ['saved finding id'],
    },
  })

  const startedAt = Date.now()
  const aiResult = await runSectionScan('security_officer_report', reportInput, REPORT_SYSTEM_PROMPT, {
    scanId: scan.id,
    repoFullName: scan.repo_full_name,
    selectedFiles: 0,
    sourceChars: 0,
    promptChars: reportInput.length,
  })
  console.info('[SavedFindingsReportGenerator] report timing', {
    scanId: scan.id,
    durationMs: Date.now() - startedAt,
    providerOk: aiResult.ok,
  })

  if (!aiResult.ok) return { ok: false, error: safeProviderMessage(aiResult.reason) }

  const parsed = extractJson(aiResult.rawText)
  if (!isRecord(parsed) || !Array.isArray(parsed.referencedFindingIds)) {
    return { ok: false, error: 'AI provider returned an invalid report response. Please retry.' }
  }
  const savedIds = new Set(findings.map((finding) => finding.id))
  const referencedIds = parsed.referencedFindingIds.filter((id): id is string => typeof id === 'string')
  if (
    referencedIds.some((id) => !savedIds.has(id))
    || (findings.length > 0 && referencedIds.length === 0)
    || (findings.length === 0 && referencedIds.length > 0)
  ) {
    return { ok: false, error: 'AI provider returned an unsupported report response. Please retry.' }
  }

  const executiveSummary = asText(parsed.executiveSummary)
  const businessImpact = asText(parsed.businessImpact)
  const technicalSummary = asText(parsed.technicalSummary)
  const estimatedFixEffort = asText(parsed.estimatedFixEffort, 500)
  const candidateTexts = [executiveSummary, businessImpact, technicalSummary, estimatedFixEffort].filter((text): text is string => Boolean(text))

  // Never persist provider prose that introduces an unrecorded file path or
  // line reference. Structured top risks and remediation remain deterministic.
  if (candidateTexts.every((text) => matchesSavedLocations(text, findings))) {
    if (executiveSummary) report.executive_summary = withWarning(executiveSummary, warnings)
    if (businessImpact) report.business_impact = businessImpact
    if (technicalSummary) report.technical_summary = technicalSummary
    if (estimatedFixEffort) report.estimated_fix_effort = estimatedFixEffort
  }

  return { ok: true, report }
}
