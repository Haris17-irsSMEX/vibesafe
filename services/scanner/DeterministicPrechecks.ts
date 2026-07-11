/**
 * Lightweight, evidence-only prechecks. These emit candidates for the AI to
 * review, not final vulnerabilities. A candidate must still pass the
 * post-AI verifier before it can be persisted as a finding.
 */

import type { ScanFinding } from '@/lib/types'

export interface PrecheckFile {
  path: string
  content: string
}

function redact(value: string): string {
  return value
    .replace(/(sk|pk)_(?:live|test)_[A-Za-z0-9_-]+/g, '$1_…REDACTED')
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, 'gh_…REDACTED')
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, '$1…REDACTED')
    .replace(/(['"])([^'"\n]{8,})(\1)/g, '$1…REDACTED$3')
}

function locationFor(content: string, pattern: RegExp): { line: number; snippet: string } | null {
  const lines = content.split('\n')
  for (let index = 0; index < lines.length; index++) {
    if (pattern.test(lines[index])) return { line: index + 1, snippet: redact(lines[index].trim()) }
  }
  return null
}

function candidate(input: Omit<ScanFinding, 'confidence' | 'finding_status' | 'false_positive_risk' | 'verification_steps'>): ScanFinding {
  return {
    ...input,
    confidence: 'low',
    finding_status: 'needs_manual_verification',
    false_positive_risk: 'This is a deterministic pattern match and requires code-path review.',
    verification_steps: ['Review the referenced code path and confirm whether untrusted input can reach the matched pattern.'],
  }
}

export function runDeterministicPrechecks(files: PrecheckFile[]): ScanFinding[] {
  const candidates: ScanFinding[] = []
  const add = (finding: ScanFinding) => {
    const key = `${finding.check_name}:${finding.file_path}:${finding.line_number ?? 0}`
    if (!candidates.some((item) => `${item.check_name}:${item.file_path}:${item.line_number ?? 0}` === key)) candidates.push(finding)
  }

  for (const file of files) {
    const path = file.path
    const content = file.content
    const apiRoute = /^(app\/api|pages\/api)\//i.test(path)

    const hardcodedSecret = locationFor(content, /(?:api[_-]?key|secret|token|password|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}['"]/i)
    if (hardcodedSecret) add(candidate({
      check_name: 'Possible hardcoded credential', severity: 'HIGH', category: 'secrets', file_path: path,
      line_number: hardcodedSecret.line, description: 'A credential-like literal was found in source code.',
      evidence: hardcodedSecret.snippet, evidence_snippet: hardcodedSecret.snippet, vulnerable_code: hardcodedSecret.snippet,
      why_it_matters: 'Credentials committed to source can be exposed through repository access or build artifacts.',
      recommendation: 'Confirm the value is a real credential. If so, remove it from source, rotate it, and load it only from a server-side environment variable.',
    }))

    const publicSecret = locationFor(content, /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE|SERVICE_ROLE|DATABASE)/i)
    if (publicSecret) add(candidate({
      check_name: 'Possible public environment secret exposure', severity: 'HIGH', category: 'secrets', file_path: path,
      line_number: publicSecret.line, description: 'A sensitive-looking NEXT_PUBLIC_ variable name was referenced.',
      evidence: publicSecret.snippet, evidence_snippet: publicSecret.snippet, vulnerable_code: publicSecret.snippet,
      why_it_matters: 'NEXT_PUBLIC_ values are bundled for browser access in Next.js.',
      recommendation: 'Confirm the variable does not contain a secret. Move any secret value to a server-only environment variable.',
    }))

    const dangerousExecution = locationFor(content, /\beval\s*\(|\bnew\s+Function\s*\(|dangerouslySetInnerHTML/i)
    if (dangerousExecution) add(candidate({
      check_name: 'Dynamic execution or HTML injection sink', severity: 'HIGH', category: 'input_validation', file_path: path,
      line_number: dangerousExecution.line, description: 'A dynamic execution or HTML injection sink was found.',
      evidence: dangerousExecution.snippet, evidence_snippet: dangerousExecution.snippet, vulnerable_code: dangerousExecution.snippet,
      why_it_matters: 'If untrusted input reaches this sink, it can enable code execution or cross-site scripting.',
      recommendation: 'Trace data reaching this sink. Remove dynamic execution and sanitize untrusted HTML before rendering.',
    }))

    const wildcardCors = locationFor(content, /Access-Control-Allow-Origin\s*[:=]\s*['"]\*|origin\s*:\s*['"]\*['"]/i)
    if (wildcardCors) add(candidate({
      check_name: 'Overly broad CORS origin', severity: 'MEDIUM', category: 'cors', file_path: path,
      line_number: wildcardCors.line, description: 'A wildcard CORS origin was found.',
      evidence: wildcardCors.snippet, evidence_snippet: wildcardCors.snippet, vulnerable_code: wildcardCors.snippet,
      why_it_matters: 'Permissive cross-origin access can expose responses when applied to sensitive endpoints.',
      recommendation: 'Restrict CORS to known trusted origins and verify whether this route returns authenticated data.',
    }))

    if (/webhook/i.test(path)) {
      const signatureCheck = /signature|verify|webhook.?secret|constructEvent|hmac/i.test(content)
      if (!signatureCheck) add(candidate({
        check_name: 'Webhook signature verification not observed', severity: 'HIGH', category: 'payments', file_path: path,
        description: 'This webhook-named handler did not contain an obvious signature verification signal in the scanned source.',
        evidence: `No signature verification indicator was found in ${path}.`,
        why_it_matters: 'An unsigned webhook endpoint may accept forged provider events.',
        recommendation: 'Verify provider signatures before processing events and ensure replay/idempotency handling is present.',
      }))
    }

    if (apiRoute) {
      const authObserved = /getUser\(|getSession\(|requireAuth|auth\.uid\(|verify.*token|authorization/i.test(content)
      if (!authObserved && !/webhook/i.test(path)) add(candidate({
        check_name: 'Authentication check not observed on API route', severity: 'MEDIUM', category: 'auth', file_path: path,
        description: 'No obvious server-side authentication signal was found in this API route.',
        evidence: `No common auth helper or authorization header check was found in ${path}.`,
        why_it_matters: 'Publicly reachable mutating routes can allow unauthorized access if they rely on external middleware or client checks only.',
        recommendation: 'Trace the route and its middleware. Add a server-side session and authorization check if the endpoint is not intentionally public.',
      }))

      const bodyRead = /request\.json\(|req\.body|formData\(/i.test(content)
      const validationObserved = /safeParse|\.parse\(|z\.object|validate|schema/i.test(content)
      if (bodyRead && !validationObserved) add(candidate({
        check_name: 'Input validation not observed on API route', severity: 'MEDIUM', category: 'input_validation', file_path: path,
        description: 'The route reads request input without an obvious schema or validation check in the scanned source.',
        evidence: `Request input is read in ${path}, but no common validation signal was found.`,
        why_it_matters: 'Unvalidated input can lead to unsafe state changes or unexpected downstream behavior.',
        recommendation: 'Confirm validation is not performed by a shared helper. Validate the request shape and authorize the action server-side.',
      }))
    }
  }

  return candidates.slice(0, 30)
}

export function formatPrecheckCandidates(candidates: ScanFinding[]): string {
  if (!candidates.length) return 'No deterministic evidence candidates were produced.'
  return candidates.slice(0, 12).map((item) => [
    `- ${item.check_name}`,
    `  file: ${item.file_path ?? 'unknown'}${item.line_number ? `:${item.line_number}` : ''}`,
    `  evidence: ${(item.evidence ?? item.evidence_snippet ?? 'not available').slice(0, 260)}`,
    '  disposition: candidate only; confirm, downgrade, or discard based on the provided source.',
  ].join('\n')).join('\n')
}
