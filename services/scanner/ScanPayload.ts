/**
 * Security-first provider payload staging. File collection stays complete; only
 * AI requests are chunked so large repositories degrade into focused passes.
 * The returned chunks are stateless and can later be executed by a queue worker.
 */

import type { ScanFileRecord } from '@/lib/db/scan-files'

export const AI_MAX_TOTAL_SOURCE_CHARS = readLimit('AI_MAX_TOTAL_SOURCE_CHARS', 32_000)
export const AI_MAX_PER_FILE_CHARS = readLimit('AI_MAX_PER_FILE_CHARS', 5_000)
export const AI_MAX_FILES = readLimit('AI_MAX_FILES', 16)

export type SecurityZone =
  | 'project_overview'
  | 'auth_and_middleware'
  | 'api_and_server_actions'
  | 'database_and_data_access'
  | 'payments_and_webhooks'
  | 'admin_and_permissions'
  | 'uploads_and_file_handling'
  | 'environment_and_configuration'
  | 'integrations_and_background_work'
  | 'frontend_risky_flows'

export interface PreparedAiPayload {
  zone: SecurityZone
  files: Array<{ path: string; content: string; section: 'general' }>
  sourceChars: number
  skippedFiles: number
  truncatedFiles: number
}

function readLimit(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function isProviderIrrelevant(path: string, content: string): boolean {
  const lower = path.toLowerCase()
  if (/(^|\/)(node_modules|\.git|\.next|dist|build|coverage|vendor|__pycache__|\.turbo|\.vercel|\.cache|\.output)\//.test(lower)) return true
  if (/(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb)$/.test(lower)) return true
  if (/\.(png|jpe?g|gif|webp|ico|pdf|zip|gz|mp4|woff2?)$/.test(lower)) return true
  if (/\.min\.(js|css)$/.test(lower) || content.length > 20_000 && /(?:^|\n)[^\n]{3,}\{[^\n]{200,}/.test(content)) return true
  if (/(^|\/)(docs?|storybook|fixtures?|__tests__|tests?)\//.test(lower)) return true
  return false
}

function zoneFor(path: string): SecurityZone {
  const p = path.toLowerCase()
  if (/package\.json$|next\.config|vite\.config|tsconfig|\.env/.test(p)) return 'project_overview'
  if (/middleware|auth|session|oauth|login|jwt/.test(p)) return 'auth_and_middleware'
  if (/^(app\/api|pages\/api)\//.test(p) || /route\.(ts|js)$|server.?action/.test(p)) return 'api_and_server_actions'
  if (/supabase|database|\/db\/|prisma|drizzle|migration|model/.test(p)) return 'database_and_data_access'
  if (/webhook|payment|billing|checkout|paddle|stripe|subscription/.test(p)) return 'payments_and_webhooks'
  if (/admin|permission|role|access.?control/.test(p)) return 'admin_and_permissions'
  if (/upload|storage|file.?handl|multipart|attachment/.test(p)) return 'uploads_and_file_handling'
  if (/secret|credential|config|headers|cors|rate.?limit|validat|schema/.test(p)) return 'environment_and_configuration'
  if (/resend|email|openai|deepseek|queue|worker|cron|integration/.test(p)) return 'integrations_and_background_work'
  return 'frontend_risky_flows'
}

function priority(path: string, evidencePaths: Set<string>): number {
  const p = path.toLowerCase()
  if (evidencePaths.has(path)) return 1_000
  if (/^(app\/api|pages\/api)\//.test(p) || /route\.(ts|js)$/.test(p)) return 950
  if (/middleware|server.?action|auth|session|oauth|permission|role|admin/.test(p)) return 900
  if (/webhook|payment|billing|checkout|paddle|stripe/.test(p)) return 875
  if (/supabase|database|\/db\/|prisma|drizzle|migration/.test(p)) return 850
  if (/upload|storage|file|email|resend|openai|deepseek|integration/.test(p)) return 800
  if (/\.env|next\.config|vite\.config|config\.(ts|js)$/.test(p)) return 760
  if (/validat|schema|zod|yup|joi|rate.?limit|cors|secur/.test(p)) return 700
  if (/package\.json$/.test(p)) return 620
  if (/^(app|pages)\//.test(p)) return 400
  if (/\.(tsx|jsx|css)$/.test(p)) return 100
  return 250
}

function truncate(content: string, limit: number): { content: string; truncated: boolean } {
  if (content.length <= limit) return { content, truncated: false }
  const marker = '\n\n[TRUNCATED: remaining file content was omitted to keep this security pass within provider limits.]\n'
  return { content: content.slice(0, Math.max(0, limit - marker.length)) + marker, truncated: true }
}

function makePayload(zone: SecurityZone, candidates: ScanFileRecord[], allCount: number, compact = false): PreparedAiPayload {
  const maxFiles = compact ? Math.min(10, AI_MAX_FILES) : AI_MAX_FILES
  const perFile = compact ? Math.min(2_500, AI_MAX_PER_FILE_CHARS) : AI_MAX_PER_FILE_CHARS
  const totalLimit = compact ? Math.min(16_000, AI_MAX_TOTAL_SOURCE_CHARS) : AI_MAX_TOTAL_SOURCE_CHARS
  const files: PreparedAiPayload['files'] = []
  let sourceChars = 0
  let truncatedFiles = 0

  for (const file of candidates) {
    if (files.length >= maxFiles || sourceChars >= totalLimit) break
    const { content, truncated } = truncate(file.content, Math.min(perFile, totalLimit - sourceChars))
    if (!content) break
    files.push({ path: file.file_path, content, section: 'general' })
    sourceChars += content.length
    if (truncated) truncatedFiles++
  }

  return { zone, files, sourceChars, skippedFiles: Math.max(0, allCount - files.length), truncatedFiles }
}

export function prepareAiPayloadChunks(allFiles: ScanFileRecord[], evidencePaths: Iterable<string> = []): PreparedAiPayload[] {
  const evidenceSet = new Set(Array.from(evidencePaths))
  const eligible = allFiles.filter((file) => !isProviderIrrelevant(file.file_path, file.content))
  const grouped = new Map<SecurityZone, ScanFileRecord[]>()

  for (const file of eligible) {
    const zone = zoneFor(file.file_path)
    const current = grouped.get(zone) ?? []
    current.push(file)
    grouped.set(zone, current)
  }

  const orderedZones: SecurityZone[] = [
    'project_overview', 'auth_and_middleware', 'api_and_server_actions', 'database_and_data_access',
    'payments_and_webhooks', 'admin_and_permissions', 'uploads_and_file_handling',
    'environment_and_configuration', 'integrations_and_background_work', 'frontend_risky_flows',
  ]
  const chunks: PreparedAiPayload[] = []

  for (const zone of orderedZones) {
    const zoneFiles = (grouped.get(zone) ?? []).sort((a, b) => priority(b.file_path, evidenceSet) - priority(a.file_path, evidenceSet))
    while (zoneFiles.length) {
      const payload = makePayload(zone, zoneFiles, eligible.length)
      if (!payload.files.length) break
      chunks.push(payload)
      const sent = new Set(payload.files.map((file) => file.path))
      const remaining = zoneFiles.filter((file) => !sent.has(file.file_path))
      zoneFiles.splice(0, zoneFiles.length, ...remaining)
    }
  }

  return chunks
}

export function compactAiPayload(payload: PreparedAiPayload): PreparedAiPayload {
  const sourceFiles = payload.files.map((file, index) => ({
    id: String(index), scan_id: '', section: 'general', file_path: file.path, content: file.content, created_at: '',
  })) as ScanFileRecord[]
  return makePayload(payload.zone, sourceFiles, payload.files.length, true)
}
