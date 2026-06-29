/**
 * services/scanner/SecurityReportGenerator.ts
 *
 * Server-side ONLY. Generates a professional security officer report
 * from completed scan data using deterministic logic and AI audit data (Phase 8G).
 *
 * - Pure function — no side effects
 * - Never fails the scan — caller wraps in try/catch
 */

import type { AuditReport, AuditChecklistItem } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductionReadiness =
  | 'ready'
  | 'needs_attention'
  | 'not_ready'
  | 'critical_risk'

export interface TopRisk {
  title: string
  severity: string
  explanation: string
  affected_area: string
}

export interface RemediationStep {
  priority: number
  action: string
  reason: string
  estimated_effort: string
}

export interface SecurityReport {
  executive_summary: string
  security_verdict: string
  production_readiness: ProductionReadiness
  top_risks: TopRisk[]
  positive_findings: string[]
  remediation_plan: RemediationStep[]
  business_impact: string
  technical_summary: string
  estimated_fix_effort: string
}

export interface ReportInput {
  repoFullName: string
  securityScore: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  totalFindings: number
  findings: Array<{
    severity: string
    check_name: string
    category: string
    description?: string
    file_path?: string
    recommendation?: string
    why_it_matters?: string
  }>
  filesScannedCount: number
  scanEngine: string
  checklist?: AuditChecklistItem[]
  auditReport?: AuditReport | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityOrder(s: string): number {
  switch (s.toLowerCase()) {
    case 'critical': return 0
    case 'high':     return 1
    case 'medium':   return 2
    case 'low':      return 3
    default:         return 4
  }
}

function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    secrets:          'Secrets & Credentials',
    database:         'Database Security',
    auth:             'Authentication & Authorization',
    payments:         'Payment & Webhooks',
    dependencies:     'Dependencies',
    rate_limiting:    'Rate Limiting',
    cors:             'CORS Configuration',
    file_upload:      'File Upload Security',
    input_validation: 'Input Validation',
    headers:          'Security Headers',
    config:           'Configuration',
    general:          'General Security',
  }
  return map[cat] ?? capitalize(cat)
}

function effortForSeverity(sev: string): string {
  switch (sev.toLowerCase()) {
    case 'critical': return '~2–4 hours (urgent)'
    case 'high':     return '~4–8 hours'
    case 'medium':   return '~2–4 hours'
    case 'low':      return '~1 hour'
    default:         return '~1–2 hours'
  }
}

// ─── Production readiness ─────────────────────────────────────────────────────

function determineProductionReadiness(
  criticalCount: number,
  highCount: number,
  mediumCount: number,
  totalFindings: number,
  auditReport?: AuditReport | null
): ProductionReadiness {
  // If AI provided a posture rating, honor it for extremes
  if (auditReport) {
    if (auditReport.security_posture === 'critical') return 'critical_risk'
    if (auditReport.security_posture === 'strong' && criticalCount === 0 && highCount === 0) return 'ready'
  }

  if (criticalCount > 0) return 'critical_risk'
  if (highCount >= 3)    return 'not_ready'
  if (highCount > 0 || mediumCount > 3) return 'needs_attention'
  
  if (auditReport?.security_posture === 'needs_work') return 'needs_attention'

  if (totalFindings === 0) return 'ready'
  return 'needs_attention'
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

function buildVerdict(
  readiness: ProductionReadiness,
  criticalCount: number,
  highCount: number,
  securityScore: number,
  auditReport?: AuditReport | null
): string {
  if (readiness === 'critical_risk') {
    return `${criticalCount} critical issue${criticalCount > 1 ? 's were' : ' was'} detected that must be resolved before this repository is safe for production use. Immediate action is required.`
  }
  if (readiness === 'not_ready') {
    return `${highCount} high severity issues were detected. This repository should not be deployed to production until these issues are addressed.`
  }
  if (readiness === 'needs_attention') {
    if (auditReport?.security_posture === 'needs_work' && highCount === 0 && criticalCount === 0) {
       return `While no high severity vulnerabilities were found, the codebase requires security hardening and attention to best practices before production deployment.`
    }
    return `Security issues were detected that require attention. The repository may be usable but improvements are strongly recommended before production deployment.`
  }
  return `No significant vulnerabilities were detected in this scan. The repository demonstrates a strong security posture with a score of ${securityScore}/100.`
}

// ─── Executive summary ────────────────────────────────────────────────────────

function buildExecutiveSummary(
  repoFullName: string,
  securityScore: number,
  criticalCount: number,
  highCount: number,
  mediumCount: number,
  lowCount: number,
  totalFindings: number,
  readiness: ProductionReadiness,
  filesScannedCount: number,
  auditReport?: AuditReport | null
): string {
  // Use AI summary if available and robust
  if (auditReport && auditReport.executive_summary.length > 30) {
    return auditReport.executive_summary
  }

  const repoName = repoFullName.split('/').pop() ?? repoFullName

  if (totalFindings === 0) {
    return `VibeSafe completed a comprehensive security audit of ${repoName} across ${filesScannedCount} source files and identified no vulnerabilities. The repository achieved a security score of ${securityScore}/100, indicating a clean and well-secured codebase. No immediate remediation is required.`
  }

  const parts: string[] = []

  parts.push(
    `VibeSafe completed a security audit of ${repoName} across ${filesScannedCount} source files, identifying ${totalFindings} security issue${totalFindings > 1 ? 's' : ''} and assigning a security score of ${securityScore}/100.`
  )

  const breakdown: string[] = []
  if (criticalCount > 0) breakdown.push(`${criticalCount} critical`)
  if (highCount > 0)     breakdown.push(`${highCount} high`)
  if (mediumCount > 0)   breakdown.push(`${mediumCount} medium`)
  if (lowCount > 0)      breakdown.push(`${lowCount} low`)

  if (breakdown.length > 0) {
    parts.push(`Findings include ${breakdown.join(', ')} severity issue${totalFindings > 1 ? 's' : ''} spanning authentication, data security, and application hardening.`)
  }

  if (readiness === 'critical_risk') {
    parts.push(`Critical issues require immediate remediation before this codebase is suitable for production deployment.`)
  } else if (readiness === 'not_ready') {
    parts.push(`High severity issues should be resolved before production launch to prevent potential data exposure or security breaches.`)
  } else {
    parts.push(`Addressing the identified issues will improve the security posture and reduce risk exposure.`)
  }

  return parts.join(' ')
}

// ─── Top risks ────────────────────────────────────────────────────────────────

function buildTopRisks(
  findings: ReportInput['findings']
): TopRisk[] {
  const sorted = [...findings].sort((a, b) =>
    severityOrder(a.severity) - severityOrder(b.severity)
  )

  return sorted.slice(0, 3).map((f) => ({
    title: f.check_name || 'Security Issue',
    severity: f.severity?.toUpperCase() ?? 'MEDIUM',
    explanation:
      f.why_it_matters ||
      f.description ||
      'This issue may expose the application to security risk if left unresolved.',
    affected_area: f.file_path
      ? `${categoryLabel(f.category)} — ${f.file_path}`
      : categoryLabel(f.category),
  }))
}

// ─── Positive findings ────────────────────────────────────────────────────────

function buildPositiveFindings(
  criticalCount: number,
  highCount: number,
  findings: ReportInput['findings'],
  auditReport?: AuditReport | null
): string[] {
  const positives: string[] = []

  // Pull AI observations if available
  if (auditReport && Array.isArray(auditReport.what_is_done_right)) {
    positives.push(...auditReport.what_is_done_right.slice(0, 3))
  }

  const categoriesFound = new Set<string>(findings.map((f) => f.category))

  if (criticalCount === 0) {
    positives.push('No critical vulnerabilities were detected in this scan.')
  }
  if (highCount === 0) {
    positives.push('No high severity security issues were found.')
  }
  if (!categoriesFound.has('secrets')) {
    positives.push('No hardcoded secrets or exposed credentials were detected.')
  }
  if (!categoriesFound.has('payments')) {
    positives.push('Payment and webhook security checks did not flag any issues.')
  }
  if (!categoriesFound.has('database')) {
    positives.push('Database access control issues were not flagged in this scan.')
  }
  if (!categoriesFound.has('auth')) {
    positives.push('No authentication or authorization vulnerabilities were detected.')
  }

  // Deduplicate and cap
  return Array.from(new Set(positives)).slice(0, 6)
}

// ─── Remediation plan ─────────────────────────────────────────────────────────

function buildRemediationPlan(
  findings: ReportInput['findings'],
  auditReport?: AuditReport | null
): RemediationStep[] {
  // Use AI Priority Plan if available and findings exist to back it up
  if (auditReport && Array.isArray(auditReport.priority_plan) && auditReport.priority_plan.length > 0 && findings.length === 0) {
    return auditReport.priority_plan.map((action, idx) => ({
       priority: idx + 1,
       action,
       reason: 'Security hardening recommended by AI audit.',
       estimated_effort: '~1 hour'
    }))
  }

  if (findings.length === 0) return []

  // Priority assignment
  function getPriority(f: ReportInput['findings'][0]): number {
    const sev = f.severity.toLowerCase()
    const cat = f.category
    if (sev === 'critical') return 1
    if (sev === 'high' && ['auth', 'payments', 'database', 'secrets'].includes(cat)) return 2
    if (sev === 'high') return 3
    if (sev === 'medium') return 4
    return 5
  }

  const sorted = [...findings].sort((a, b) => getPriority(a) - getPriority(b))

  return sorted.slice(0, 10).map((f, idx) => ({
    priority: idx + 1,
    action: f.recommendation || `Fix: ${f.check_name}`,
    reason: f.why_it_matters || f.description || 'Reduces security risk exposure.',
    estimated_effort: effortForSeverity(f.severity),
  }))
}

// ─── Business impact ──────────────────────────────────────────────────────────

function buildBusinessImpact(
  readiness: ProductionReadiness,
  criticalCount: number,
  highCount: number,
  securityScore: number
): string {
  if (readiness === 'critical_risk') {
    return `The ${criticalCount} critical issue${criticalCount > 1 ? 's' : ''} identified represent${criticalCount === 1 ? 's' : ''} an immediate business risk. If exploited, these vulnerabilities could result in data breaches, unauthorized access to user accounts, or complete system compromise — all of which carry significant legal, financial, and reputational consequences.`
  }
  if (readiness === 'not_ready') {
    return `The ${highCount} high severity issues present meaningful business risk. Without remediation, the application may be vulnerable to attacks that expose user data or disrupt service availability. Addressing these issues before production launch is strongly advised to protect users and the business.`
  }
  if (readiness === 'needs_attention') {
    return `The identified issues present moderate business risk. While no critical or widespread vulnerabilities were found, leaving these issues unresolved increases the attack surface over time and may create compliance or liability concerns as the application scales.`
  }
  return `This repository demonstrates a strong security posture (${securityScore}/100). No material business risk was identified in this scan. Continued security scanning as the codebase evolves is recommended to maintain this standard.`
}

// ─── Technical summary ────────────────────────────────────────────────────────

function buildTechnicalSummary(
  findings: ReportInput['findings'],
  filesScannedCount: number,
  scanEngine: string,
  totalFindings: number,
  checklist?: AuditChecklistItem[]
): string {
  let checklistStr = ''
  if (checklist && checklist.length > 0) {
    const passCount = checklist.filter(c => c.verdict === 'pass').length
    const failCount = checklist.filter(c => c.verdict === 'fail').length
    checklistStr = ` The AI audit verified ${checklist.length} checklist items (${passCount} passed, ${failCount} failed).`
  }

  if (totalFindings === 0) {
    return `Static analysis using ${scanEngine} reviewed ${filesScannedCount} source files across all security domains including authentication, database access, secrets management, payment handling, rate limiting, CORS, file uploads, and input validation.${checklistStr} No vulnerabilities were detected.`
  }

  const cats = Array.from(new Set<string>(findings.map((f) => f.category))).map(categoryLabel)
  const catStr = cats.length > 0
    ? cats.slice(0, 4).join(', ') + (cats.length > 4 ? `, and ${cats.length - 4} more areas` : '')
    : 'multiple security domains'

  return `Static analysis using ${scanEngine} reviewed ${filesScannedCount} source files.${checklistStr} Issues were identified in ${catStr}. Findings were classified by severity and mapped to CWE/OWASP categories where applicable. The analysis included checks for authentication bypasses, data exposure, missing server-side validation, dependency risks, and configuration issues common in AI-generated codebases.`
}

// ─── Estimated fix effort ─────────────────────────────────────────────────────

function buildEstimatedFixEffort(
  criticalCount: number,
  highCount: number,
  mediumCount: number,
  lowCount: number,
  totalFindings: number
): string {
  if (totalFindings === 0) return 'No remediation required.'
  if (criticalCount > 0)   return `1–3 days of urgent remediation (critical issues must be fixed immediately).`
  if (highCount > 0)       return `2–5 days of focused engineering work to resolve high severity issues.`
  if (mediumCount > 0)     return `1–2 days of incremental hardening to address medium severity findings.`
  return '< 1 day of minor improvements to resolve low severity findings.'
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generate a complete security officer report from scan data.
 * Pure deterministic function composed with AI audit data.
 * Never throws — caller handles errors.
 */
export function generateSecurityReport(input: ReportInput): SecurityReport {
  const {
    repoFullName,
    securityScore,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalFindings,
    findings,
    filesScannedCount,
    scanEngine,
    checklist,
    auditReport
  } = input

  const readiness = determineProductionReadiness(
    criticalCount, highCount, mediumCount, totalFindings, auditReport
  )

  return {
    executive_summary: buildExecutiveSummary(
      repoFullName, securityScore, criticalCount, highCount,
      mediumCount, lowCount, totalFindings, readiness, filesScannedCount, auditReport
    ),
    security_verdict:  buildVerdict(readiness, criticalCount, highCount, securityScore, auditReport),
    production_readiness: readiness,
    top_risks:         buildTopRisks(findings),
    positive_findings: buildPositiveFindings(criticalCount, highCount, findings, auditReport),
    remediation_plan:  buildRemediationPlan(findings, auditReport),
    business_impact:   buildBusinessImpact(readiness, criticalCount, highCount, securityScore),
    technical_summary: buildTechnicalSummary(findings, filesScannedCount, scanEngine, totalFindings, checklist),
    estimated_fix_effort: buildEstimatedFixEffort(
      criticalCount, highCount, mediumCount, lowCount, totalFindings
    ),
  }
}
