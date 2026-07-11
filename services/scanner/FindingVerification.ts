/**
 * Post-processing guardrail for AI findings. It is intentionally conservative:
 * unknown paths are removed, unverified locations are cleared, weak claims are
 * downgraded, and duplicates are collapsed before persistence/scoring.
 */

import type { FindingStatus, ScanFinding, Severity } from '@/lib/types'
import { extractCodeEvidence } from './CodeEvidenceExtractor'

export interface VerificationFile {
  path: string
  content: string
}

const severityRank: Record<Severity, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
const statusRank: Record<FindingStatus, number> = { confirmed: 3, potential: 2, needs_manual_verification: 1 }
const confidenceRank = { high: 3, medium: 2, low: 1 } as const

function normalizeStatus(value: ScanFinding['finding_status']): FindingStatus {
  return value === 'confirmed' || value === 'potential' || value === 'needs_manual_verification'
    ? value
    : 'needs_manual_verification'
}

function evidenceOccursInFile(evidence: string | undefined, content: string): boolean {
  if (!evidence) return false
  const firstMeaningfulLine = evidence.split('\n').map((line) => line.trim()).find((line) => line.length >= 6)
  if (!firstMeaningfulLine || /not observed|not found|missing/i.test(firstMeaningfulLine)) return false
  return content.includes(firstMeaningfulLine)
}

function capSeverity(
  severity: Severity,
  status: FindingStatus,
  confidence: 'high' | 'medium' | 'low',
  category: string,
  filePath?: string
): Severity {
  const sensitiveDomain = ['auth', 'payments', 'database', 'secrets'].includes(category.toLowerCase())
  const publicServerPath = /^(app\/api|pages\/api)\//i.test(filePath ?? '')

  if (status !== 'confirmed') {
    if (severity === 'CRITICAL') return 'HIGH'
    if (status === 'needs_manual_verification' && severity === 'HIGH') return 'MEDIUM'
    // A potential high risk needs both strong evidence and a plausible exposed,
    // sensitive boundary; otherwise keep it actionable but non-alarmist.
    if (status === 'potential' && severity === 'HIGH' && (!sensitiveDomain || !publicServerPath || confidence !== 'high')) return 'MEDIUM'
  }
  if (confidence === 'low' && severityRank[severity] > severityRank.MEDIUM) return 'MEDIUM'
  if (confidence !== 'high' && severity === 'CRITICAL') return 'HIGH'
  return severity
}

function defaultVerificationSteps(finding: ScanFinding): string[] {
  const location = finding.file_path
    ? `Review ${finding.file_path}${finding.line_number ? ` near line ${finding.line_number}` : ''}.`
    : 'Review the relevant code path.'
  return [location, 'Confirm whether untrusted input or an external actor can reach the identified behavior.']
}

function findingKey(finding: ScanFinding): string {
  return [finding.file_path ?? '', finding.category.toLowerCase(), finding.check_name.toLowerCase().replace(/[^a-z0-9]+/g, '')].join(':')
}

function stronger(a: ScanFinding, b: ScanFinding): ScanFinding {
  const aStatus = statusRank[normalizeStatus(a.finding_status)]
  const bStatus = statusRank[normalizeStatus(b.finding_status)]
  if (aStatus !== bStatus) return aStatus > bStatus ? a : b
  const aConfidence = confidenceRank[a.confidence ?? 'low']
  const bConfidence = confidenceRank[b.confidence ?? 'low']
  if (aConfidence !== bConfidence) return aConfidence > bConfidence ? a : b
  return severityRank[a.severity] >= severityRank[b.severity] ? a : b
}

export interface VerificationResult {
  findings: ScanFinding[]
  removed: number
  downgraded: number
}

export function verifyAndDeduplicateFindings(
  findings: ScanFinding[],
  files: VerificationFile[]
): VerificationResult {
  const byPath = new Map(files.map((file) => [file.path, file]))
  const verified: ScanFinding[] = []
  let removed = 0
  let downgraded = 0

  for (const rawFinding of findings) {
    const finding = { ...rawFinding }
    const file = finding.file_path ? byPath.get(finding.file_path) : undefined

    // A returned path must be one of the files actually supplied to the model.
    if (finding.file_path && !file) {
      removed++
      continue
    }

    const originalStatus = normalizeStatus(finding.finding_status)
    const originalSeverity = finding.severity
    let evidenceProven = Boolean(file && evidenceOccursInFile(finding.evidence ?? finding.evidence_snippet ?? finding.vulnerable_code, file.content))

    if (file && (!finding.line_number || !evidenceProven)) {
      const extracted = extractCodeEvidence(finding, files)
      if (extracted.line_number && extracted.vulnerable_code) {
        finding.line_number = extracted.line_number
        finding.line_end = extracted.line_number + Math.max(0, extracted.vulnerable_code.split('\n').length - 1)
        finding.vulnerable_code = extracted.vulnerable_code
        finding.evidence = finding.evidence ?? extracted.vulnerable_code
        evidenceProven = true
      } else if (finding.line_number && finding.line_number > file.content.split('\n').length) {
        delete finding.line_number
        delete finding.line_end
      }
    }

    if (!evidenceProven) {
      finding.finding_status = originalStatus === 'confirmed' ? 'potential' : originalStatus
      finding.confidence = finding.confidence === 'high' ? 'medium' : 'low'
      finding.false_positive_risk = finding.false_positive_risk ?? 'Evidence could not be independently located in the scanned file; manual verification is required.'
    } else {
      finding.finding_status = originalStatus === 'needs_manual_verification' ? 'potential' : originalStatus
      finding.false_positive_risk = finding.false_positive_risk ?? (finding.finding_status === 'confirmed'
        ? 'Low: the reported evidence was located in the scanned source; reachability still depends on application flow.'
        : 'Moderate: the evidence exists, but exploitability or reachability requires manual review.')
    }

    finding.verification_steps = finding.verification_steps?.filter(Boolean).slice(0, 5) || defaultVerificationSteps(finding)
    finding.severity = capSeverity(
      finding.severity,
      finding.finding_status,
      finding.confidence ?? 'low',
      finding.category,
      finding.file_path
    )

    if (finding.finding_status !== originalStatus || finding.severity !== originalSeverity) downgraded++
    verified.push(finding)
  }

  const merged = new Map<string, ScanFinding>()
  for (const finding of verified) {
    const key = findingKey(finding)
    const existing = merged.get(key)
    merged.set(key, existing ? stronger(existing, finding) : finding)
  }

  return { findings: Array.from(merged.values()), removed, downgraded }
}
