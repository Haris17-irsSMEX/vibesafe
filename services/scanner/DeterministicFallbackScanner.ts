import { ScanFinding, Severity } from '@/lib/types'
import { ScanFileRecord } from '@/lib/db/scan-files'
import { generateFixPrompt } from './FixPromptGenerator'

export function runDeterministicFallbackScan(files: ScanFileRecord[]): ScanFinding[] {
  const findings: ScanFinding[] = []

  // Helper to add a finding
  const addFinding = (finding: Omit<ScanFinding, 'confidence' | 'fix_prompt'>) => {
    if (findings.length >= 25) return
    const key = `${finding.check_name}::${finding.file_path}`
    if (!findings.some(f => `${f.check_name}::${f.file_path}` === key)) {
      const newFinding: ScanFinding = {
        ...finding,
        confidence: 'high',
      }
      try {
        newFinding.fix_prompt = generateFixPrompt(newFinding)
      } catch {
        newFinding.fix_prompt = 'Please fix this issue manually.'
      }
      findings.push(newFinding)
    }
  }

  for (const file of files) {
    const content = file.content || ''
    const path = file.file_path

    // 1. Hardcoded secret patterns
    const secretRegex = /(api_key|secret|token|password|private_key)\s*[:=]\s*['"][^'"]{8,}['"]|sk_(live|test)_[a-zA-Z0-9]+|Bearer\s+[a-zA-Z0-9\-\._~+\/]+=*/i
    if (secretRegex.test(content)) {
      addFinding({
        severity: 'HIGH',
        check_name: 'Hardcoded Secret',
        category: 'secrets',
        description: 'A hardcoded secret, API key, or token was found in the source code.',
        file_path: path,
        recommendation: 'Move the secret to environment variables and use a secrets manager.',
        evidence_snippet: '... REDACTED SECRET ...'
      })
    }

    // 2. NEXT_PUBLIC secret exposure
    const nextPublicRegex = /NEXT_PUBLIC_[A-Z0-9_]*(SECRET|TOKEN|API_KEY|PRIVATE|SERVICE_ROLE|DATABASE)/i
    if (nextPublicRegex.test(content)) {
      addFinding({
        severity: 'HIGH',
        check_name: 'Exposed NEXT_PUBLIC Secret',
        category: 'secrets',
        description: 'A secret is exposed to the browser via NEXT_PUBLIC_ prefix.',
        file_path: path,
        recommendation: 'Remove NEXT_PUBLIC_ prefix to keep the secret server-side only.',
        evidence_snippet: content.match(nextPublicRegex)?.[0] || 'NEXT_PUBLIC_...REDACTED'
      })
    }

    // 3. Service role exposure
    const serviceRoleRegex = /SUPABASE_SERVICE_ROLE_KEY|service_role|sb_secret/i
    if (serviceRoleRegex.test(content)) {
       const isClientFile = path.includes('client') || path.includes('public') || path.includes('components') || (path.includes('pages') && !path.includes('api'))
       addFinding({
        severity: isClientFile ? 'CRITICAL' : 'HIGH',
        check_name: 'Service Role Exposure',
        category: 'secrets',
        description: 'Supabase service role key pattern detected. This bypasses RLS and grants full database access.',
        file_path: path,
        recommendation: 'Ensure service role keys are never used in client-side code.',
        evidence_snippet: '... SUPABASE_SERVICE_ROLE_KEY ...'
      })
    }

    // 4. Missing webhook verification
    if (/webhook|paddle|stripe/i.test(path)) {
      if (!/(signature|verify|webhook secret|svix|constructEvent)/i.test(content)) {
        addFinding({
          severity: 'HIGH',
          check_name: 'Missing Webhook Verification',
          category: 'payments',
          description: 'Webhook handler does not appear to verify the payload signature.',
          file_path: path,
          recommendation: 'Verify the incoming webhook signature using the provider SDK before processing.',
          evidence_snippet: 'Missing signature verification'
        })
      }
    }

    // 5. Unsafe file upload patterns
    if (/upload/i.test(path) || /upload/i.test(content)) {
      if (!/(size|type|mime|validation|ext)/i.test(content)) {
        addFinding({
          severity: 'MEDIUM',
          check_name: 'Unsafe File Upload',
          category: 'file_upload',
          description: 'File upload logic lacks visible size or MIME type validation.',
          file_path: path,
          recommendation: 'Validate file type, enforce size limits, and rename uploaded files safely.',
          evidence_snippet: 'Missing validation checks'
        })
      }
    }

    // 6. Dangerous eval patterns
    if (/eval\(|new Function\(|dangerouslySetInnerHTML/i.test(content)) {
      const match = content.match(/eval\(|new Function\(|dangerouslySetInnerHTML/i)?.[0]
      addFinding({
        severity: match?.toLowerCase().includes('eval') || match?.toLowerCase().includes('function') ? 'HIGH' : 'MEDIUM',
        check_name: 'Dangerous Execution Pattern',
        category: 'input_validation',
        description: 'Use of eval, new Function, or dangerouslySetInnerHTML can lead to XSS or code execution.',
        file_path: path,
        recommendation: 'Avoid dynamic code execution and sanitize any HTML input using DOMPurify.',
        evidence_snippet: match || 'Dangerous pattern detected'
      })
    }

    // 7. SQL injection patterns
    if (/raw\s*\(|query\s*\(\s*`[^`]*\$\{/i.test(content)) {
      addFinding({
        severity: 'HIGH',
        check_name: 'Potential SQL Injection',
        category: 'database',
        description: 'Raw SQL query with string interpolation detected.',
        file_path: path,
        recommendation: 'Use parameterized queries or ORM methods instead of string interpolation.',
        evidence_snippet: 'Raw SQL query with interpolation'
      })
    }

    // 8. Missing auth check on API routes
    if ((path.includes('app/api') || path.includes('pages/api')) && !path.includes('webhook')) {
      if (!/(auth|getUser|getSession|requireAuth|user\.id|auth\.uid)/i.test(content)) {
        addFinding({
          severity: 'MEDIUM',
          check_name: 'Missing API Authentication',
          category: 'auth',
          description: 'API route lacks apparent user authentication checks.',
          file_path: path,
          recommendation: 'Require a valid user session or token before processing the request.',
          evidence_snippet: 'No authentication check found'
        })
      }
    }

    // 9. Weak CORS
    if (/Access-Control-Allow-Origin:\s*\*|origin:\s*['"]\*['"]|credentials:\s*true/i.test(content)) {
      addFinding({
        severity: 'HIGH',
        check_name: 'Overly Permissive CORS',
        category: 'cors',
        description: 'Wildcard CORS origin detected, potentially combined with credentials.',
        file_path: path,
        recommendation: 'Restrict CORS origins to specific trusted domains.',
        evidence_snippet: 'Access-Control-Allow-Origin: *'
      })
    }

    // 10. Missing rate limit indicators
    if (/(scan|checkout|upload|auth|ai|webhook)/i.test(path) && (path.includes('app/api') || path.includes('pages/api'))) {
      if (!/(rate limit|upstash|redis|limiter|throttle)/i.test(content)) {
        addFinding({
          severity: 'LOW',
          check_name: 'Missing Rate Limiting',
          category: 'rate_limiting',
          description: 'Sensitive API route lacks rate limiting.',
          file_path: path,
          recommendation: 'Implement rate limiting (e.g. Upstash Redis) to prevent abuse.',
          evidence_snippet: 'No rate limiting logic found'
        })
      }
    }
  }

  return findings
}
