/**
 * services/scanner/DeepSeekScanner.ts
 *
 * Server-side ONLY. Sends a security audit prompt to DeepSeek
 * and returns the raw text response.
 *
 * - Uses the OpenAI SDK with DeepSeek's base URL
 * - Returns raw text only — parsing is handled by FindingParser
 * - Never stores results here
 * - Never exposes the API key
 * - Retries once on API error after a 5-second delay
 */

import OpenAI from 'openai'
import { SYSTEM_PROMPT } from './prompts/systemPrompt'

// ─── Constants ───────────────────────────────────────────────────────────────

const MODEL = 'deepseek-chat'
const TEMPERATURE = 0.1
const MAX_TOKENS = 4000
const TIMEOUT_MS = 60_000
const RETRY_DELAY_MS = 5_000

// ─── Client factory ───────────────────────────────────────────────────────────

/**
 * Create a fresh OpenAI-compatible client pointed at DeepSeek.
 * Called lazily so the key is only read at runtime (server-side).
 */
function createDeepSeekClient(): OpenAI {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) {
    throw new Error('[DeepSeekScanner] DEEPSEEK_API_KEY is not set')
  }

  return new OpenAI({
    apiKey,
    baseURL: 'https://api.deepseek.com',
    timeout: TIMEOUT_MS,
    maxRetries: 0, // We handle retries manually
  })
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScanSectionResult =
  | { ok: true; rawText: string }
  | { ok: false; reason: 'api_error' | 'timeout' | 'invalid_key' | 'insufficient_balance' | 'unknown'; message: string }

// ─── Sleep helper ────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Core scanner function ───────────────────────────────────────────────────

/**
 * Send a section's file content to DeepSeek for security analysis.
 *
 * @param sectionName   - Human-readable section name (for logging only)
 * @param sectionPrompt - The full user-turn prompt built by buildSectionPrompt()
 *
 * Returns the raw text response from the model.
 * Never parses the response. Never stores anything.
 */
export async function runSectionScan(
  sectionName: string,
  sectionPrompt: string
): Promise<ScanSectionResult> {
  return attemptScan(sectionName, sectionPrompt, 1)
}

// ─── Internal — attempt with retry ──────────────────────────────────────────

async function attemptScan(
  sectionName: string,
  sectionPrompt: string,
  attempt: number
): Promise<ScanSectionResult> {
  let client: OpenAI

  try {
    client = createDeepSeekClient()
  } catch (err) {
    return {
      ok: false,
      reason: 'invalid_key',
      message: '[DeepSeekScanner] API key missing or invalid',
    }
  }

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: sectionPrompt },
      ],
    })

    const rawText = response.choices?.[0]?.message?.content ?? ''

    if (!rawText) {
      return {
        ok: false,
        reason: 'unknown',
        message: `[DeepSeekScanner] Empty response for section '${sectionName}'`,
      }
    }

    return { ok: true, rawText }
  } catch (err) {
    const isTimeout =
      err instanceof Error &&
      (err.message.includes('timeout') || err.message.includes('ETIMEDOUT') || err.message.includes('AbortError'))

    const isAuthError =
      err instanceof OpenAI.AuthenticationError ||
      (err instanceof Error && err.message.includes('401'))

    const isInsufficientBalance =
      (err instanceof Error && err.message.includes('402')) ||
      (err instanceof Error && err.message.toLowerCase().includes('insufficient balance')) ||
      (err instanceof Error && err.message.toLowerCase().includes('payment required')) ||
      (err instanceof Error && err.message.toLowerCase().includes('billing error'))

    if (isInsufficientBalance) {
      return {
        ok: false,
        reason: 'insufficient_balance',
        message: '[DeepSeekScanner] DeepSeek API balance is insufficient. Add credits and try again.',
      }
    }

    if (isAuthError) {
      return {
        ok: false,
        reason: 'invalid_key',
        message: '[DeepSeekScanner] Authentication failed — check DEEPSEEK_API_KEY',
      }
    }

    if (isTimeout) {
      return {
        ok: false,
        reason: 'timeout',
        message: `[DeepSeekScanner] Request timed out for section '${sectionName}'`,
      }
    }

    // Retry once after delay (non-auth, non-timeout, non-billing errors only)
    if (attempt < 2) {
      console.warn(`[DeepSeekScanner] Attempt ${attempt} failed for '${sectionName}', retrying in ${RETRY_DELAY_MS}ms`)
      await sleep(RETRY_DELAY_MS)
      return attemptScan(sectionName, sectionPrompt, attempt + 1)
    }

    console.error(
      `[DeepSeekScanner] Section '${sectionName}' failed after ${attempt} attempts:`,
      err instanceof Error ? err.message : 'Unknown error'
    )

    return {
      ok: false,
      reason: 'api_error',
      message: `[DeepSeekScanner] API error for section '${sectionName}'`,
    }
  }
}
