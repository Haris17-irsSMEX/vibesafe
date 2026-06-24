/**
 * services/scanner/FixPromptGenerator.ts
 *
 * Generates deterministic, high-quality, copy-paste ready "Fix Prompts"
 * for vibe coders to use in AI agents (Cursor, Codex, Claude, etc.).
 */

import type { ScanFinding } from '@/lib/types'

// ─── Secret Redaction ───────────────────────────────────────────────────────

/**
 * Basic heuristics to mask common secrets in the vulnerable code snippet
 * so they are not accidentally leaked into the AI prompt or external logs.
 */
function redactSecrets(code: string): string {
  // Simple regex to catch common string assignments that look like keys
  return code.replace(
    /(['"])(?:sk-[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{36}|xox[baprs]-[a-zA-Z0-9]{10,})\1/g,
    "'[REDACTED_SECRET]'"
  )
}

// ─── Specific Vulnerability Advice ──────────────────────────────────────────

function getCategorySpecificAdvice(finding: ScanFinding): string {
  const checkName = finding.check_name.toLowerCase()
  const cat = finding.category.toLowerCase()
  
  if (cat.includes('secret') || checkName.includes('hardcod')) {
    return `
Specific advice for secrets:
- Move the hardcoded secret to an environment variable (e.g. process.env.SECRET_NAME).
- Update the .env.example file to document the new variable without its value.
- If this secret was committed to the repository, ensure it is rotated immediately.
- Ensure .env is listed in .gitignore.
`
  }

  if (cat.includes('auth') || cat.includes('access') || checkName.includes('auth')) {
    return `
Specific advice for Authentication/Authorization:
- Add robust server-side authorization checks.
- Do not trust client-provided user IDs for access control; use the session/token.
- Preserve the existing login and session logic.
`
  }

  if (checkName.includes('sql') || cat.includes('injection')) {
    return `
Specific advice for SQL Injection:
- Refactor the query to use parameterized queries or prepared statements.
- Avoid string interpolation or concatenation for SQL queries.
- Validate and sanitize all user input before passing it to the database.
`
  }

  if (checkName.includes('xss') || cat.includes('cross-site')) {
    return `
Specific advice for Cross-Site Scripting (XSS):
- Ensure untrusted content is escaped or sanitized before rendering.
- Avoid dangerouslySetInnerHTML in React unless the HTML is strictly sanitized (e.g. DOMPurify).
`
  }

  if (cat.includes('file') || checkName.includes('upload')) {
    return `
Specific advice for File Uploads:
- Validate the file type and size on the server side.
- Store files safely and prevent path traversal by not trusting the original filename.
`
  }

  if (cat.includes('dependency') || checkName.includes('cve')) {
    return `
Specific advice for Vulnerable Dependencies:
- Upgrade the package to a safe version.
- Check for any breaking changes in the newer version and update usage accordingly.
- Run the test suite and build step to verify compatibility.
`
  }

  if (cat.includes('cors')) {
    return `
Specific advice for CORS:
- Restrict origins to trusted domains rather than using a wildcard (*).
- Avoid allowing credentials with wildcard origins.
`
  }

  if (cat.includes('rate') || checkName.includes('limit')) {
    return `
Specific advice for Rate Limiting:
- Implement route-level rate limits to prevent abuse.
- Ensure the limits are reasonable and do not block normal authenticated usage.
`
  }

  if (cat.includes('payment') || cat.includes('webhook')) {
    return `
Specific advice for Payments/Webhooks:
- Always verify incoming webhook signatures.
- Process webhooks idempotently.
- Do not trust client-side state for plan upgrades or payment confirmation.
`
  }

  if (cat.includes('header') || checkName.includes('header')) {
    return `
Specific advice for Security Headers:
- Add proper security headers (e.g. in next.config.js or middleware).
- Avoid weakening the Content-Security-Policy (CSP) unnecessarily.
`
  }

  return ''
}

// ─── Main Generator ─────────────────────────────────────────────────────────

export function generateFixPrompt(finding: ScanFinding): string {
  const safeCode = finding.evidence_snippet ? redactSecrets(finding.evidence_snippet) : 'N/A'
  const specificAdvice = getCategorySpecificAdvice(finding)

  return `You are fixing a security vulnerability in this codebase.

Issue:
${finding.check_name}

Severity:
${finding.severity}

Category:
${finding.category}

Affected file:
${finding.file_path}${finding.line_number ? `\nLine number:\n${finding.line_number}` : ''}

Problem:
${finding.description}

Security risk:
${finding.recommendation}

${finding.evidence_snippet ? `\nEvidence snippet:\n\`\`\`\n${safeCode}\n\`\`\`\n` : ''}
Fix instructions:
1. Analyze the context of the vulnerability in the affected file.
2. Implement the safest possible code change to resolve the issue.
3. Ensure you follow the specific advice and constraints below.
${specificAdvice}
Constraints:
* Do not change unrelated files.
* Do not remove existing business logic.
* Do not expose secrets.
* Do not weaken authentication or authorization.
* Keep TypeScript/build passing.
* Add or update tests if the project already has tests.
* Update environment variable examples if needed.
* Explain the files changed after the fix.

Acceptance criteria:
* Vulnerability is removed.
* Existing behavior still works.
* No new secrets are committed.
* Build/lint/tests pass if available.

Generate the minimal safe code changes required.`
}
