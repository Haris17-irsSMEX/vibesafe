/**
 * Security-first AI scan planning. File collection and deterministic checks
 * always cover the complete repository; this module only bounds DeepSeek work.
 */

import type { ScanFileRecord } from '@/lib/db/scan-files'

export const AI_MAX_TOTAL_SOURCE_CHARS = readLimit('AI_MAX_TOTAL_SOURCE_CHARS', 32_000)
export const AI_MAX_PER_FILE_CHARS = readLimit('AI_MAX_PER_FILE_CHARS', 5_000)
export const AI_MAX_FILES = readLimit('AI_MAX_FILES', 16)
export const AI_MAX_CONCURRENT_ZONE_SCANS = readLimit('AI_MAX_CONCURRENT_ZONE_SCANS', 2)

const SMALL_MAX_FILES = readLimit('AI_SMALL_REPO_MAX_FILES', 18)
const SMALL_MAX_SOURCE_CHARS = readLimit('AI_SMALL_REPO_MAX_SOURCE_CHARS', AI_MAX_TOTAL_SOURCE_CHARS)
const MEDIUM_MAX_FILES = readLimit('AI_MEDIUM_REPO_MAX_FILES', 60)
const MEDIUM_MAX_SOURCE_CHARS = readLimit('AI_MEDIUM_REPO_MAX_SOURCE_CHARS', 240_000)

export type SecurityZone =
  | 'consolidated_security_review'
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

export type ScanPlanSize = 'small' | 'medium' | 'large'
export type PayloadPriority = 'critical' | 'high' | 'normal' | 'low'

export interface PreparedAiPayload {
  zone: SecurityZone
  files: Array<{ path: string; content: string; section: 'general' }>
  sourceChars: number
  skippedFiles: number
  truncatedFiles: number
  priority: PayloadPriority
}

export interface ScanPlan {
  size: ScanPlanSize
  payloads: PreparedAiPayload[]
  eligibleFiles: number
  totalSourceChars: number
  highRiskFiles: number
  detectedZones: number
  selectedZones: SecurityZone[]
  skippedZones: Array<{ zone: SecurityZone; reason: string }>
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

function zonePriority(zone: SecurityZone): PayloadPriority {
  if (zone === 'auth_and_middleware' || zone === 'api_and_server_actions' || zone === 'payments_and_webhooks' || zone === 'admin_and_permissions') return 'critical'
  if (zone === 'database_and_data_access' || zone === 'uploads_and_file_handling' || zone === 'environment_and_configuration') return 'high'
  if (zone === 'integrations_and_background_work' || zone === 'project_overview' || zone === 'consolidated_security_review') return 'normal'
  return 'low'
}

function priorityWeight(priorityValue: PayloadPriority): number {
  return { critical: 0, high: 1, normal: 2, low: 3 }[priorityValue]
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

  return { zone, files, sourceChars, skippedFiles: Math.max(0, allCount - files.length), truncatedFiles, priority: zonePriority(zone) }
}

function sorted(files: ScanFileRecord[], evidencePaths: Set<string>): ScanFileRecord[] {
  return [...files].sort((a, b) => priority(b.file_path, evidencePaths) - priority(a.file_path, evidencePaths))
}

function containsRiskyFrontend(files: ScanFileRecord[], evidencePaths: Set<string>): boolean {
  return files.some((file) => evidencePaths.has(file.file_path) || /\b(fetch|axios|dangerouslySetInnerHTML|localStorage|window\.location)\b/.test(file.content))
}

function addPayloads(
  payloads: PreparedAiPayload[],
  skippedZones: ScanPlan['skippedZones'],
  zone: SecurityZone,
  candidates: ScanFileRecord[],
  eligibleCount: number,
  reasonWhenEmpty: string
) {
  if (!candidates.length) {
    skippedZones.push({ zone, reason: reasonWhenEmpty })
    return
  }
  let remaining = candidates
  while (remaining.length) {
    const payload = makePayload(zone, remaining, eligibleCount)
    if (!payload.files.length) {
      skippedZones.push({ zone, reason: 'No payload-safe files were available.' })
      return
    }
    payloads.push(payload)
    // Every provider-eligible file stays in a planned pass. Per-file content
    // limits are a transport boundary, not a reason to drop a security area.
    remaining = remaining.slice(payload.files.length)
  }
}

/** Plan DeepSeek passes without reducing deterministic or evidence verification coverage. */
export function planAiSecurityScan(allFiles: ScanFileRecord[], evidencePaths: Iterable<string> = []): ScanPlan {
  const evidenceSet = new Set(Array.from(evidencePaths))
  const eligible = allFiles.filter((file) => !isProviderIrrelevant(file.file_path, file.content))
  const totalSourceChars = eligible.reduce((total, file) => total + file.content.length, 0)
  const groups = new Map<SecurityZone, ScanFileRecord[]>()
  for (const file of eligible) {
    const zone = zoneFor(file.file_path)
    groups.set(zone, [...(groups.get(zone) ?? []), file])
  }
  groups.forEach((files, zone) => groups.set(zone, sorted(files, evidenceSet)))

  const highRiskZones: SecurityZone[] = [
    'auth_and_middleware', 'api_and_server_actions', 'database_and_data_access',
    'payments_and_webhooks', 'admin_and_permissions', 'uploads_and_file_handling',
    'environment_and_configuration', 'integrations_and_background_work',
  ]
  const highRiskFiles = highRiskZones.reduce((total, zone) => total + (groups.get(zone)?.length ?? 0), 0)
  const detectedZones = groups.size
  const needsLargePlan = eligible.length > MEDIUM_MAX_FILES
    || totalSourceChars > MEDIUM_MAX_SOURCE_CHARS
    || highRiskFiles > 32
    || detectedZones > 8
  const skippedZones: ScanPlan['skippedZones'] = []
  const payloads: PreparedAiPayload[] = []
  let size: ScanPlanSize

  if (eligible.length <= SMALL_MAX_FILES && totalSourceChars <= SMALL_MAX_SOURCE_CHARS) {
    size = 'small'
    addPayloads(payloads, skippedZones, 'consolidated_security_review', sorted(eligible, evidenceSet), eligible.length, 'No provider-eligible source files were found.')
  } else if (!needsLargePlan) {
    size = 'medium'
    const access = [
      ...(groups.get('auth_and_middleware') ?? []),
      ...(groups.get('api_and_server_actions') ?? []),
      ...(groups.get('admin_and_permissions') ?? []),
    ]
    const dataAndIntegrations = [
      ...(groups.get('database_and_data_access') ?? []),
      ...(groups.get('payments_and_webhooks') ?? []),
      ...(groups.get('environment_and_configuration') ?? []),
      ...(groups.get('integrations_and_background_work') ?? []),
      ...(groups.get('project_overview') ?? []),
    ]
    const frontend = groups.get('frontend_risky_flows') ?? []
    const boundaries = [
      ...(groups.get('uploads_and_file_handling') ?? []),
      ...(containsRiskyFrontend(frontend, evidenceSet) ? frontend : []),
    ]
    addPayloads(payloads, skippedZones, 'auth_and_middleware', sorted(access, evidenceSet), eligible.length, 'No auth, API, or permission files were detected.')
    addPayloads(payloads, skippedZones, 'database_and_data_access', sorted(dataAndIntegrations, evidenceSet), eligible.length, 'No data, payment, integration, or configuration files were detected.')
    addPayloads(payloads, skippedZones, 'uploads_and_file_handling', sorted(boundaries, evidenceSet), eligible.length, 'No upload or risky frontend flow files were detected.')
    if (frontend.length && !containsRiskyFrontend(frontend, evidenceSet)) {
      skippedZones.push({ zone: 'frontend_risky_flows', reason: 'Only low-risk UI/static frontend files were detected.' })
    }
  } else {
    size = 'large'
    const orderedZones: SecurityZone[] = [
      'auth_and_middleware', 'api_and_server_actions', 'payments_and_webhooks', 'admin_and_permissions',
      'database_and_data_access', 'uploads_and_file_handling', 'environment_and_configuration',
      'integrations_and_background_work', 'project_overview', 'frontend_risky_flows',
    ]
    for (const zone of orderedZones) {
      const zoneFiles = groups.get(zone) ?? []
      if (!zoneFiles.length) {
        skippedZones.push({ zone, reason: 'No relevant files were detected.' })
        continue
      }
      if (zone === 'frontend_risky_flows' && !containsRiskyFrontend(zoneFiles, evidenceSet)) {
        skippedZones.push({ zone, reason: 'Only low-risk UI/static frontend files were detected.' })
        continue
      }
      addPayloads(payloads, skippedZones, zone, zoneFiles, eligible.length, 'No payload-safe files were available.')
    }
  }

  payloads.sort((a, b) => priorityWeight(a.priority) - priorityWeight(b.priority))
  return {
    size,
    payloads,
    eligibleFiles: eligible.length,
    totalSourceChars,
    highRiskFiles,
    detectedZones,
    selectedZones: payloads.map((payload) => payload.zone),
    skippedZones,
  }
}

/** Backward-compatible alias for callers that only need staged payloads. */
export function prepareAiPayloadChunks(allFiles: ScanFileRecord[], evidencePaths: Iterable<string> = []): PreparedAiPayload[] {
  return planAiSecurityScan(allFiles, evidencePaths).payloads
}

export function compactAiPayload(payload: PreparedAiPayload): PreparedAiPayload {
  const sourceFiles = payload.files.map((file, index) => ({
    id: String(index), scan_id: '', section: 'general', file_path: file.path, content: file.content, created_at: '',
  })) as ScanFileRecord[]
  return makePayload(payload.zone, sourceFiles, payload.files.length, true)
}
