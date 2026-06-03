/**
 * lib/rate-limit.ts
 *
 * Provides rate limiting for expensive operations using Upstash Redis.
 * - Fails closed: if Redis fails to connect, the limits apply by default to protect the API.
 * - User-scoped: limits apply to the authenticated Supabase user ID.
 */

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Use lazy initialization so this doesn't crash during build or if tokens are missing
let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis) return redis
  
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn('[RateLimit] Upstash Redis credentials not found. Rate limiting is bypassed locally unless simulated.')
    return null
  }

  redis = new Redis({
    url,
    token,
  })

  return redis
}

// ─── Limiters ─────────────────────────────────────────────────────────────────

// File fetch: 10 requests per hour per user
let fileFetchLimiter: Ratelimit | null = null

// AI scan: 5 requests per day per user
let aiScanLimiter: Ratelimit | null = null

function getFileFetchLimiter(): Ratelimit | null {
  if (fileFetchLimiter) return fileFetchLimiter
  const r = getRedis()
  if (!r) return null

  fileFetchLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, '1 h'),
    analytics: true,
    prefix: '@upstash/ratelimit/file-fetch',
  })
  return fileFetchLimiter
}

function getAiScanLimiter(): Ratelimit | null {
  if (aiScanLimiter) return aiScanLimiter
  const r = getRedis()
  if (!r) return null

  aiScanLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, '1 d'),
    analytics: true,
    prefix: '@upstash/ratelimit/ai-scan',
  })
  return aiScanLimiter
}

// ─── API ──────────────────────────────────────────────────────────────────────

interface RateLimitResult {
  success: boolean
  remaining: number
}

/**
 * Limit fetching of repository files.
 * @param userId the authenticated user's ID
 * @returns success: false if the user has exceeded the limit
 */
export async function rateLimitFileFetch(userId: string): Promise<RateLimitResult> {
  try {
    const limiter = getFileFetchLimiter()
    // If no limiter (e.g. local dev without env vars), fail open locally
    if (!limiter) {
      if (process.env.NODE_ENV === 'production') {
        // In production, if Redis is down/missing, fail CLOSED to protect resources
        console.error('[RateLimit] Missing Redis config in production! Failing closed.')
        return { success: false, remaining: 0 }
      }
      return { success: true, remaining: 999 }
    }

    const { success, remaining } = await limiter.limit(userId)
    return { success, remaining }
  } catch (err) {
    console.error('[RateLimit] Error checking file fetch limit:', err)
    // Fail closed on error to protect the API
    return { success: false, remaining: 0 }
  }
}

/**
 * Limit execution of DeepSeek AI scans.
 * @param userId the authenticated user's ID
 * @returns success: false if the user has exceeded the limit
 */
export async function rateLimitAIScan(userId: string): Promise<RateLimitResult> {
  try {
    const limiter = getAiScanLimiter()
    if (!limiter) {
      if (process.env.NODE_ENV === 'production') {
        // Fail closed to protect credits
        console.error('[RateLimit] Missing Redis config in production! Failing closed.')
        return { success: false, remaining: 0 }
      }
      return { success: true, remaining: 999 }
    }

    const { success, remaining } = await limiter.limit(userId)
    return { success, remaining }
  } catch (err) {
    console.error('[RateLimit] Error checking AI scan limit:', err)
    // Fail closed on error to protect credits
    return { success: false, remaining: 0 }
  }
}
