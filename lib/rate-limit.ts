/**
 * lib/rate-limit.ts
 *
 * Provides rate limiting for expensive operations using Upstash Redis.
 * - Plan-based: limits depend on the user's active plan.
 * - Fails closed: if Redis fails to connect in production, limits apply by default to protect the API.
 * - User-scoped: limits apply to the authenticated Supabase user ID and plan.
 */

import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'
import type { UserPlan } from '@/lib/db/users'

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

// ─── Plan Configurations ──────────────────────────────────────────────────────

type WindowString = `${number} s` | `${number} m` | `${number} h` | `${number} d`

interface LimitConfig {
  count: number
  window: WindowString
}

const FILE_FETCH_LIMITS: Record<UserPlan, LimitConfig> = {
  free: { count: 5, window: '1 h' },
  starter: { count: 20, window: '1 h' },
  builder: { count: 50, window: '1 h' },
}

const AI_SCAN_LIMITS: Record<UserPlan, LimitConfig> = {
  free: { count: 2, window: '1 d' },
  starter: { count: 20, window: '1 d' },
  builder: { count: 100, window: '1 d' },
}

// ─── Limiters ─────────────────────────────────────────────────────────────────

const fileFetchLimiters: Partial<Record<UserPlan, Ratelimit>> = {}
const aiScanLimiters: Partial<Record<UserPlan, Ratelimit>> = {}

function getFileFetchLimiter(plan: UserPlan): Ratelimit | null {
  if (fileFetchLimiters[plan]) return fileFetchLimiters[plan]!
  const r = getRedis()
  if (!r) return null

  let config = FILE_FETCH_LIMITS[plan]
  if (process.env.NODE_ENV !== 'production') {
    // Higher limits for local testing
    config = { count: 1000, window: '1 h' }
  }

  fileFetchLimiters[plan] = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(config.count, config.window),
    analytics: true,
    prefix: 'file-fetch',
  })
  return fileFetchLimiters[plan]!
}

function getAiScanLimiter(plan: UserPlan): Ratelimit | null {
  if (aiScanLimiters[plan]) return aiScanLimiters[plan]!
  const r = getRedis()
  if (!r) return null

  let config = AI_SCAN_LIMITS[plan]
  if (process.env.NODE_ENV !== 'production') {
    // Higher limits for local testing
    config = { count: 1000, window: '1 d' }
  }

  aiScanLimiters[plan] = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(config.count, config.window),
    analytics: true,
    prefix: 'ai-scan',
  })
  return aiScanLimiters[plan]!
}

let webhookLimiter: Ratelimit | null = null

function getWebhookLimiter(): Ratelimit | null {
  if (webhookLimiter) return webhookLimiter
  const r = getRedis()
  if (!r) return null

  webhookLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'paddle-webhook',
  })
  return webhookLimiter
}

let authLimiter: Ratelimit | null = null

function getAuthLimiter(): Ratelimit | null {
  if (authLimiter) return authLimiter
  const r = getRedis()
  if (!r) return null

  authLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'auth',
  })
  return authLimiter
}

let scanCreateLimiter: Ratelimit | null = null

function getScanCreateLimiter(): Ratelimit | null {
  if (scanCreateLimiter) return scanCreateLimiter
  const r = getRedis()
  if (!r) return null

  scanCreateLimiter = new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
    analytics: true,
    prefix: 'scan-create',
  })
  return scanCreateLimiter
}

// ─── API ──────────────────────────────────────────────────────────────────────

interface RateLimitResult {
  success: boolean
  remaining: number
}

/**
 * Limit fetching of repository files based on plan.
 * @param userId the authenticated user's ID
 * @param plan the user's active plan
 * @returns success: false if the user has exceeded the limit
 */
export async function rateLimitFileFetch(userId: string, plan: UserPlan, isAdmin: boolean = false): Promise<RateLimitResult> {
  if (isAdmin) {
    return { success: true, remaining: 999 }
  }

  try {
    const limiter = getFileFetchLimiter(plan)
    // If no limiter (e.g. local dev without env vars), fail open locally
    if (!limiter) {
      if (process.env.NODE_ENV === 'production') {
        // In production, if Redis is down/missing, fail CLOSED to protect resources
        console.error('[RateLimit] Missing Redis config in production! Failing closed.')
        return { success: false, remaining: 0 }
      }
      return { success: true, remaining: 999 }
    }

    const key = `${plan}:${userId}`
    const { success, remaining } = await limiter.limit(key)
    return { success, remaining }
  } catch (err) {
    console.error('[RateLimit] Error checking file fetch limit:', err)
    // Fail closed on error to protect the API in production, but fail open in dev if Redis fails
    if (process.env.NODE_ENV === 'production') {
      return { success: false, remaining: 0 }
    } else {
      console.warn('[RateLimit] Bypassing Redis failure in development mode.')
      return { success: true, remaining: 999 }
    }
  }
}

/**
 * Limit execution of DeepSeek AI scans based on plan.
 * @param userId the authenticated user's ID
 * @param plan the user's active plan
 * @returns success: false if the user has exceeded the limit
 */
export async function rateLimitAIScan(userId: string, plan: UserPlan, isAdmin: boolean = false): Promise<RateLimitResult> {
  if (isAdmin) {
    return { success: true, remaining: 999 }
  }

  try {
    const limiter = getAiScanLimiter(plan)
    if (!limiter) {
      if (process.env.NODE_ENV === 'production') {
        // Fail closed to protect credits
        console.error('[RateLimit] Missing Redis config in production! Failing closed.')
        return { success: false, remaining: 0 }
      }
      return { success: true, remaining: 999 }
    }

    const key = `${plan}:${userId}`
    const { success, remaining } = await limiter.limit(key)
    return { success, remaining }
  } catch (err) {
    console.error('[RateLimit] Error checking AI scan limit:', err)
    // Fail closed on error to protect credits
    if (process.env.NODE_ENV === 'production') {
      return { success: false, remaining: 0 }
    } else {
      console.warn('[RateLimit] Bypassing Redis failure in development mode.')
      return { success: true, remaining: 999 }
    }
  }
}

/**
 * Limit webhook execution based on IP address.
 * @param ip the request IP
 * @returns success: false if the IP has exceeded the limit
 */
export async function rateLimitWebhook(ip: string): Promise<RateLimitResult> {
  try {
    const limiter = getWebhookLimiter()
    if (!limiter) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[RateLimit] Missing Redis config in production! Failing open for webhooks to prevent missing events.')
      }
      return { success: true, remaining: 999 }
    }

    const key = `webhook:${ip}`
    const { success, remaining } = await limiter.limit(key)
    return { success, remaining }
  } catch (err) {
    console.error('[RateLimit] Error checking webhook limit:', err)
    // Fail open on error to protect critical payment events
    return { success: true, remaining: 999 }
  }
}

/**
 * Limit auth endpoints based on IP address.
 * @param ip the request IP
 * @returns success: false if the IP has exceeded the limit
 */
export async function rateLimitAuth(ip: string): Promise<RateLimitResult> {
  try {
    const limiter = getAuthLimiter()
    if (!limiter) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[RateLimit] Missing Redis config in production! Failing closed for auth.')
        return { success: false, remaining: 0 }
      }
      return { success: true, remaining: 999 }
    }

    const key = `auth:${ip}`
    const { success, remaining } = await limiter.limit(key)
    return { success, remaining }
  } catch (err) {
    console.error('[RateLimit] Error checking auth limit:', err)
    if (process.env.NODE_ENV === 'production') {
      return { success: false, remaining: 0 }
    }
    return { success: true, remaining: 999 }
  }
}

/**
 * Limit scan creation per user.
 * @param userId the user ID
 * @returns success: false if the user has exceeded the limit
 */
export async function rateLimitScanCreate(userId: string): Promise<RateLimitResult> {
  try {
    const limiter = getScanCreateLimiter()
    if (!limiter) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[RateLimit] Missing Redis config in production! Failing closed for scan create.')
        return { success: false, remaining: 0 }
      }
      return { success: true, remaining: 999 }
    }

    const key = `scan-create:${userId}`
    const { success, remaining } = await limiter.limit(key)
    return { success, remaining }
  } catch (err) {
    console.error('[RateLimit] Error checking scan create limit:', err)
    if (process.env.NODE_ENV === 'production') {
      return { success: false, remaining: 0 }
    }
    return { success: true, remaining: 999 }
  }
}
