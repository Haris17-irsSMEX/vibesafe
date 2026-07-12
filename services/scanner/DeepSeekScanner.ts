/** Server-only DeepSeek boundary with bounded retries and safe diagnostics. */

import OpenAI from 'openai'
import { SYSTEM_PROMPT } from './prompts/systemPrompt'

export const AI_PROVIDER_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
export const AI_PROVIDER_TIMEOUT_MS = readLimit('AI_PROVIDER_TIMEOUT_MS', 75_000)
export const AI_RETRY_COUNT = readLimit('AI_RETRY_COUNT', 1)
const TEMPERATURE = 0.1
const MAX_TOKENS = readLimit('AI_MAX_OUTPUT_TOKENS', 4_500)
const RETRY_DELAY_MS = 1_500

export type ProviderFailureReason =
  | 'auth'
  | 'rate_limit'
  | 'provider_unavailable'
  | 'payload_too_large'
  | 'timeout'
  | 'empty_response'
  | 'invalid_request'
  | 'insufficient_balance'
  | 'unknown'

export interface ScanDiagnostics {
  scanId?: string
  repoFullName?: string
  selectedFiles?: number
  skippedFiles?: number
  truncatedFiles?: number
  sourceChars?: number
  promptChars?: number
  /** Optional per-call cap for latency-sensitive core scan passes. */
  timeoutMs?: number
}

export type ScanSectionResult =
  | { ok: true; rawText: string; attempts: number }
  | { ok: false; reason: ProviderFailureReason; attempts: number; providerStatus?: number; providerCode?: string; responseEmpty?: boolean }

function readLimit(name: string, fallback: number): number {
  const value = Number(process.env[name])
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback
}

function createDeepSeekClient(timeoutMs = AI_PROVIDER_TIMEOUT_MS): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('missing_provider_key')
  return new OpenAI({ apiKey, baseURL: 'https://api.deepseek.com', timeout: timeoutMs, maxRetries: 0 })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function classifyFailure(error: unknown): { reason: ProviderFailureReason; status?: number; code?: string } {
  const record = isRecord(error) ? error : {}
  const status = typeof record.status === 'number' ? record.status : undefined
  const code = typeof record.code === 'string' ? record.code : undefined
  const message = error instanceof Error ? error.message.toLowerCase() : ''

  if (status === 401 || status === 403 || message.includes('missing_provider_key')) return { reason: 'auth', status, code }
  if (status === 429) return { reason: 'rate_limit', status, code }
  if (status === 413 || /context length|context.?window|token limit|request too large|payload too large|max(?:imum)? .*tokens/i.test(message)) return { reason: 'payload_too_large', status, code }
  if ([500, 502, 503, 504].includes(status ?? 0)) return { reason: 'provider_unavailable', status, code }
  if (status === 400 || status === 404 || /invalid model|invalid request|malformed/i.test(message)) return { reason: 'invalid_request', status, code }
  if (status === 402 || /insufficient balance|payment required|billing error/i.test(message)) return { reason: 'insufficient_balance', status, code }
  if (/timeout|etimedout|aborterror|network error|fetch failed|econnreset|enotfound/i.test(message)) return { reason: 'timeout', status, code }
  return { reason: 'unknown', status, code }
}

function retryable(reason: ProviderFailureReason): boolean {
  return reason === 'rate_limit' || reason === 'provider_unavailable' || reason === 'timeout' || reason === 'empty_response' || reason === 'unknown'
}

function logProviderFailure(
  sectionName: string,
  attempt: number,
  reason: ProviderFailureReason,
  diagnostics: ScanDiagnostics,
  details: { providerStatus?: number; providerCode?: string; responseEmpty?: boolean }
) {
  // Deliberately log shape/metadata only—never prompts, source, or provider bodies.
  console.warn('[DeepSeekScanner] provider attempt failed', {
    scanId: diagnostics.scanId,
    repoFullName: diagnostics.repoFullName,
    model: AI_PROVIDER_MODEL,
    sectionName,
    attempt,
    selectedFiles: diagnostics.selectedFiles,
    skippedFiles: diagnostics.skippedFiles,
    truncatedFiles: diagnostics.truncatedFiles,
    sourceChars: diagnostics.sourceChars,
    promptChars: diagnostics.promptChars,
    providerTimeoutMs: diagnostics.timeoutMs ?? AI_PROVIDER_TIMEOUT_MS,
    providerStatus: details.providerStatus,
    providerCode: details.providerCode,
    safeProviderMessage: details.providerStatus ? `Provider HTTP ${details.providerStatus}` : `Provider failure: ${reason}`,
    responseEmpty: details.responseEmpty ?? false,
    reason,
  })
}

export async function runSectionScan(
  sectionName: string,
  sectionPrompt: string,
  customSystemPrompt?: string,
  diagnostics: ScanDiagnostics = {}
): Promise<ScanSectionResult> {
  const promptDiagnostics = { ...diagnostics, promptChars: diagnostics.promptChars ?? sectionPrompt.length }
  return attemptScan(sectionName, customSystemPrompt || SYSTEM_PROMPT, sectionPrompt, 1, promptDiagnostics)
}

export async function runSinglePassCall(
  systemPrompt: string,
  userPrompt: string,
  diagnostics: ScanDiagnostics = {}
): Promise<ScanSectionResult> {
  return attemptScan('single_pass', systemPrompt, userPrompt, 1, { ...diagnostics, promptChars: diagnostics.promptChars ?? userPrompt.length })
}

async function attemptScan(
  sectionName: string,
  systemPrompt: string,
  userPrompt: string,
  attempt: number,
  diagnostics: ScanDiagnostics
): Promise<ScanSectionResult> {
  let client: OpenAI
  try {
    client = createDeepSeekClient(diagnostics.timeoutMs)
  } catch (error) {
    const details = classifyFailure(error)
    logProviderFailure(sectionName, attempt, details.reason, diagnostics, { providerStatus: details.status, providerCode: details.code })
    return { ok: false, reason: details.reason, attempts: attempt, providerStatus: details.status, providerCode: details.code }
  }

  try {
    const response = await client.chat.completions.create({
      model: AI_PROVIDER_MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    })
    const rawText = response.choices?.[0]?.message?.content?.trim() ?? ''
    if (rawText) return { ok: true, rawText, attempts: attempt }

    const reason: ProviderFailureReason = 'empty_response'
    logProviderFailure(sectionName, attempt, reason, diagnostics, { responseEmpty: true })
    if (attempt <= AI_RETRY_COUNT) {
      await sleep(RETRY_DELAY_MS * attempt)
      return attemptScan(sectionName, systemPrompt, userPrompt, attempt + 1, diagnostics)
    }
    return { ok: false, reason, attempts: attempt, responseEmpty: true }
  } catch (error) {
    const details = classifyFailure(error)
    logProviderFailure(sectionName, attempt, details.reason, diagnostics, { providerStatus: details.status, providerCode: details.code })
    if (retryable(details.reason) && attempt <= AI_RETRY_COUNT) {
      await sleep(RETRY_DELAY_MS * attempt)
      return attemptScan(sectionName, systemPrompt, userPrompt, attempt + 1, diagnostics)
    }
    return { ok: false, reason: details.reason, attempts: attempt, providerStatus: details.status, providerCode: details.code }
  }
}
