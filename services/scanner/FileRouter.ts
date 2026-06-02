/**
 * FileRouter
 *
 * Deterministic file-to-section routing for security analysis.
 * Uses path and content keyword rules only — no AI classification.
 * Server-side only.
 *
 * Sections:
 *   secrets, database, auth, payments, dependencies,
 *   rate_limit, cors, file_upload, general
 */

import type { FetchedFile } from '@/services/github/RepoFetcher'

// ─── Section type ────────────────────────────────────────────────────────────

export type SecuritySection =
  | 'secrets'
  | 'database'
  | 'auth'
  | 'payments'
  | 'server_validation'
  | 'dependencies'
  | 'rate_limit'
  | 'cors'
  | 'file_upload'
  | 'general'

export interface RoutedFile {
  path: string
  content: string
  section: SecuritySection
}

// ─── Path-based rules ────────────────────────────────────────────────────────

const PATH_RULES: Array<{ pattern: RegExp; section: SecuritySection }> = [
  // Secrets / environment
  { pattern: /\.env($|\.)/, section: 'secrets' },
  { pattern: /secret/i, section: 'secrets' },
  { pattern: /credentials/i, section: 'secrets' },

  // Database
  { pattern: /prisma\/schema/i, section: 'database' },
  { pattern: /drizzle/i, section: 'database' },
  { pattern: /migration/i, section: 'database' },
  { pattern: /schema\.(ts|js|py)$/i, section: 'database' },
  { pattern: /models?\.(ts|js|py)$/i, section: 'database' },
  { pattern: /db\.(ts|js|py)$/i, section: 'database' },
  { pattern: /database/i, section: 'database' },
  { pattern: /supabase/i, section: 'database' },
  { pattern: /knex/i, section: 'database' },

  // Auth
  { pattern: /auth/i, section: 'auth' },
  { pattern: /login/i, section: 'auth' },
  { pattern: /signup/i, section: 'auth' },
  { pattern: /session/i, section: 'auth' },
  { pattern: /middleware\.(ts|js)$/i, section: 'auth' },
  { pattern: /jwt/i, section: 'auth' },
  { pattern: /oauth/i, section: 'auth' },
  { pattern: /passport/i, section: 'auth' },

  // Payments
  { pattern: /payment/i, section: 'payments' },
  { pattern: /billing/i, section: 'payments' },
  { pattern: /stripe/i, section: 'payments' },
  { pattern: /paddle/i, section: 'payments' },
  { pattern: /checkout/i, section: 'payments' },
  { pattern: /subscription/i, section: 'payments' },
  { pattern: /webhook/i, section: 'payments' },

  // Dependencies
  { pattern: /package\.json$/, section: 'dependencies' },
  { pattern: /package-lock\.json$/, section: 'dependencies' },
  { pattern: /yarn\.lock$/, section: 'dependencies' },
  { pattern: /pnpm-lock\.yaml$/, section: 'dependencies' },
  { pattern: /requirements\.txt$/i, section: 'dependencies' },
  { pattern: /Pipfile$/i, section: 'dependencies' },
  { pattern: /pyproject\.toml$/i, section: 'dependencies' },

  // Server-side validation
  { pattern: /validat/i, section: 'server_validation' },
  { pattern: /sanitiz/i, section: 'server_validation' },
  { pattern: /zod/i, section: 'server_validation' },
  { pattern: /yup/i, section: 'server_validation' },
  { pattern: /joi/i, section: 'server_validation' },
  { pattern: /schema.*valid/i, section: 'server_validation' },
  // API route handlers (Next.js / Express)
  { pattern: /app\/api\//i, section: 'server_validation' },
  { pattern: /pages\/api\//i, section: 'server_validation' },
  { pattern: /routes?\.(ts|js)$/i, section: 'server_validation' },
  { pattern: /handler\.(ts|js)$/i, section: 'server_validation' },
  { pattern: /controller/i, section: 'server_validation' },

  // Rate limiting
  { pattern: /rate.?limit/i, section: 'rate_limit' },
  { pattern: /throttl/i, section: 'rate_limit' },

  // CORS
  { pattern: /cors/i, section: 'cors' },

  // File upload
  { pattern: /upload/i, section: 'file_upload' },
  { pattern: /multer/i, section: 'file_upload' },
  { pattern: /storage/i, section: 'file_upload' },
]

// ─── Content-based rules (fallback) ──────────────────────────────────────────

const CONTENT_RULES: Array<{ keywords: RegExp; section: SecuritySection }> = [
  // Secrets
  { keywords: /(?:API_KEY|SECRET_KEY|PRIVATE_KEY|ACCESS_TOKEN|password\s*[:=])/i, section: 'secrets' },

  // Database
  { keywords: /(?:CREATE\s+TABLE|SELECT\s+.*FROM|INSERT\s+INTO|\.query\(|prisma\.|drizzle\.|supabase\.from)/i, section: 'database' },

  // Auth
  { keywords: /(?:bcrypt|argon2|jwt\.sign|jwt\.verify|passport\.|NextAuth|getSession|getUser|signIn|signOut)/i, section: 'auth' },

  // Payments
  { keywords: /(?:stripe\.|Stripe\(|paddle|PADDLE_|createCheckout|createSubscription)/i, section: 'payments' },

  // Server-side validation (content fallback)
  { keywords: /(?:z\.object|z\.string|z\.number|yup\.object|Joi\.object|validateBody|parseBody|safeParse|validateInput)/i, section: 'server_validation' },

  // Rate limiting
  { keywords: /(?:rateLimit|rateLimiter|Ratelimit|sliding.?window|token.?bucket)/i, section: 'rate_limit' },

  // CORS
  { keywords: /(?:Access-Control-Allow|cors\(|CORS\(|allowedOrigins)/i, section: 'cors' },

  // File upload
  { keywords: /(?:multer|formidable|busboy|multipart|upload\.single|upload\.array)/i, section: 'file_upload' },
]

// ─── Router ──────────────────────────────────────────────────────────────────

/**
 * Route a single file to its security section.
 * Path rules take priority. Content rules are fallback.
 * Files that match no rule go to 'general'.
 */
export function routeFile(file: FetchedFile): SecuritySection {
  // 1. Try path rules first (cheapest)
  for (const rule of PATH_RULES) {
    if (rule.pattern.test(file.path)) {
      return rule.section
    }
  }

  // 2. Try content rules (sample first 2000 chars only for performance)
  const sample = file.content.slice(0, 2000)
  for (const rule of CONTENT_RULES) {
    if (rule.keywords.test(sample)) {
      return rule.section
    }
  }

  // 3. Default to general
  return 'general'
}

/**
 * Route all files. Returns RoutedFile[] with section assigned.
 */
export function routeFiles(files: FetchedFile[]): RoutedFile[] {
  return files.map((file) => ({
    path: file.path,
    content: file.content,
    section: routeFile(file),
  }))
}
