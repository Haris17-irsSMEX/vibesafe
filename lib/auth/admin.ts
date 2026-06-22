/**
 * lib/auth/admin.ts
 *
 * SERVER-SIDE ONLY — never import this in client components.
 * Provides helpers for admin/founder access control based on ADMIN_EMAILS env var.
 *
 * SECURITY:
 *  - Reads process.env.ADMIN_EMAILS (not NEXT_PUBLIC_*)
 *  - Never exposes the list of admin emails to the client bundle
 *  - Always compares emails in lowercase after trimming whitespace
 *  - All checks happen server-side; client receives only a boolean result
 */

import 'server-only'
import { createClient } from '@/lib/supabase/server'

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Parse and return the list of admin emails from the ADMIN_EMAILS env var.
 * Returns an empty array if the variable is not set or empty.
 * Never throws.
 */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? ''
  if (!raw.trim()) return []
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

// ─── Email check ──────────────────────────────────────────────────────────────

/**
 * Returns true if the given email is in the ADMIN_EMAILS list.
 * Safe to call with null/undefined — returns false in that case.
 * Case-insensitive.
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false
  const admins = getAdminEmails()
  if (admins.length === 0) return false
  return admins.includes(email.trim().toLowerCase())
}

// ─── Session-aware check ─────────────────────────────────────────────────────

/**
 * Returns { isAdmin: boolean, user } for the currently authenticated user.
 * If no session exists, isAdmin is false and user is null.
 * Never throws — returns safe defaults on error.
 *
 * Usage in server components / route handlers:
 *   const { isAdmin, user } = await getAdminStatus()
 */
export async function getAdminStatus(): Promise<{
  isAdmin: boolean
  user: { id: string; email: string | null } | null
}> {
  try {
    const supabase = createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return { isAdmin: false, user: null }
    }

    return {
      isAdmin: isAdminEmail(user.email),
      user: { id: user.id, email: user.email ?? null },
    }
  } catch {
    return { isAdmin: false, user: null }
  }
}

/**
 * Require the current user to be an admin.
 * Returns the user object if authenticated and admin.
 * Throws a redirect-friendly error object if not.
 *
 * Convenience helper for server page components.
 */
export async function requireAdminUser(): Promise<{
  id: string
  email: string | null
}> {
  const { isAdmin, user } = await getAdminStatus()

  if (!user) {
    throw new Error('UNAUTHENTICATED')
  }

  if (!isAdmin) {
    throw new Error('FORBIDDEN')
  }

  return user
}
