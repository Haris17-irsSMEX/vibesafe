import { ScanFinding } from '@/lib/types'

export interface ExtractedEvidence {
  line_number: number | null
  vulnerable_code: string | null
}

export function extractCodeEvidence(
  finding: ScanFinding,
  scanFiles: { path: string; content: string }[]
): ExtractedEvidence {
  const file = scanFiles.find((f) => f.path === finding.file_path)
  if (!file || !file.content) {
    return { line_number: null, vulnerable_code: null }
  }

  const lines = file.content.split('\n')

  let foundLineIndex = -1
  let snippet: string | null = null

  // 1. Try to find exact evidence_snippet
  if (finding.evidence_snippet) {
    // Take the first line of the snippet to search for
    const firstSnippetLine = finding.evidence_snippet.split('\n')[0].trim()
    if (firstSnippetLine.length > 5) {
      foundLineIndex = lines.findIndex((l) => l.includes(firstSnippetLine))
    }
  }

  // 2. Fallback to keywords based on category/check_name
  if (foundLineIndex === -1) {
    const keywords = [
      'console.error',
      'console.log',
      'eval',
      'dangerouslySetInnerHTML',
      'Access-Control-Allow-Origin',
      'service_role',
      'token',
      'secret',
      'api_key',
      'password',
      'webhook',
      'signature'
    ]

    const searchTarget = (finding.check_name + ' ' + finding.description).toLowerCase()
    
    // Select keywords that might be relevant
    const relevantKeywords = keywords.filter(k => 
      searchTarget.includes(k.toLowerCase()) || 
      finding.category === 'secrets' && ['token', 'secret', 'api_key', 'password'].includes(k)
    )

    if (relevantKeywords.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        if (relevantKeywords.some(k => line.includes(k))) {
          foundLineIndex = i
          break
        }
      }
    }
  }

  // 3. Extract small snippet
  if (foundLineIndex !== -1) {
    const start = Math.max(0, foundLineIndex - 1)
    const end = Math.min(lines.length, foundLineIndex + 2)
    const rawSnippet = lines.slice(start, end).join('\n')
    
    // Redact secrets
    snippet = rawSnippet
      .replace(/sk_[a-zA-Z0-9]+/g, 'sk_...REDACTED')
      .replace(/ghp_[a-zA-Z0-9]+/g, 'ghp_...REDACTED')
      .replace(/ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[JWT REDACTED]')
      .replace(/(?:api_key|password|secret)["']?\s*:\s*["'][^"']+["']/gi, '"REDACTED"')

    return {
      line_number: foundLineIndex + 1,
      vulnerable_code: snippet
    }
  }

  return { line_number: null, vulnerable_code: null }
}
