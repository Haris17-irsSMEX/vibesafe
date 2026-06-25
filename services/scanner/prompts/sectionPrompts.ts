/**
 * services/scanner/prompts/sectionPrompts.ts
 *
 * Security audit section definitions for VibeSafe's DeepSeek scanner.
 *
 * Source: converted from the VibeSafe security audit brain/checklist.
 * Each section is focused and compact — the full detail lives here once,
 * not duplicated into every API prompt.
 */

export interface SectionDefinition {
  id: string
  name: string
  description: string
  checks: string[]
  fileHints: string[]
}

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {

  secrets: {
    id: 'secrets',
    name: 'Secrets & Environment Security',
    description: 'Detect leaked secrets, tokens, and misconfigured environment variables.',
    fileHints: ['.env', 'config/', 'secrets/', 'credentials', 'keys/'],
    checks: [
      'Hardcoded API keys, tokens, passwords, private keys, or JWT secrets',
      'GitHub tokens, OpenAI/DeepSeek keys, Paddle/Stripe secrets hardcoded',
      'Supabase service role keys hardcoded or exposed',
      '.env leakage or missing .gitignore protection',
      'NEXT_PUBLIC_ variables improperly exposing sensitive secrets',
      'Logging secrets in console, error responses, or HTTP responses',
      'Source map exposure that leaks sensitive constants',
      'Missing startup environment validation'
    ],
  },

  database: {
    id: 'database',
    name: 'Supabase & Database Security',
    description: 'Detect SQL injection, missing RLS, and data access vulnerabilities.',
    fileHints: ['db/', 'database/', 'prisma/', 'migrations/', 'models/', 'lib/db/'],
    checks: [
      'Missing RLS, unsafe RLS policies, or missing WITH CHECK clauses',
      'Using auth.uid() incorrectly or missing ownership checks',
      'Public tables writable by anon users',
      'Service role key used outside server-only code or exposed to client',
      'Unsafe Supabase storage bucket policies',
      'SQL injection or raw SQL string interpolation',
      'Trusting client-provided user_id for database queries',
      'Mass assignment risks'
    ],
  },

  auth: {
    id: 'auth',
    name: 'Authentication & Authorization',
    description: 'Detect auth bypass, broken access control, and insecure sessions.',
    fileHints: ['auth/', 'middleware', 'login', 'session', 'jwt', 'oauth', 'signup'],
    checks: [
      'Missing auth checks on protected API routes',
      'Missing session validation or ownership checks',
      'IDOR (Insecure Direct Object Reference) vulnerabilities',
      'Trusting request body user_id instead of secure session',
      'Weak middleware or half-implemented middleware bypasses',
      'Inconsistent protected route checks',
      'Admin-only routes not protected properly',
      'Insecure OAuth callback logic',
      'CSRF/state validation problems',
      'Insecure session handling'
    ],
  },

  payments: {
    id: 'payments',
    name: 'Payments & Webhooks',
    description: 'Detect webhook manipulation, free-tier bypass, and billing security flaws.',
    fileHints: ['payment', 'billing', 'stripe', 'paddle', 'checkout', 'webhook', 'subscription'],
    checks: [
      'Missing Paddle/Stripe webhook signature verification',
      'Missing idempotency or webhook replay risk',
      'Trusting client-side plan/price updates',
      'Allowing free-tier bypass or checkout session manipulation',
      'Plan updates without server verification',
      'Missing cancellation/subscription handling',
      'Exposing payment secrets'
    ],
  },

  dependencies: {
    id: 'dependencies',
    name: 'Dependencies',
    description: 'Detect risky packages, unpinned versions, and supply-chain vulnerabilities.',
    fileHints: ['package.json', 'package-lock.json', 'yarn.lock', 'requirements.txt', 'Pipfile', 'pyproject.toml'],
    checks: [
      'Known risky packages or hallucinated/fake packages',
      'Unused dangerous packages',
      'Unpinned or loosely pinned dependencies',
      'Missing lockfile concerns',
      'Outdated security-sensitive packages',
      'Packages used for auth/payment/crypto/upload without validation'
    ],
  },

  rate_limiting: {
    id: 'rate_limiting',
    name: 'Rate Limiting',
    description: 'Detect missing rate limits, DoS vectors, and abuse potential.',
    fileHints: ['middleware/', 'api/', 'rate-limit', 'ratelimit', 'throttle'],
    checks: [
      'Missing limits on login/auth routes',
      'Missing limits on AI scan routes',
      'Missing limits on checkout routes',
      'Missing limits on upload routes',
      'Missing limits on webhook routes',
      'Client-side only rate limiting',
      'Rate limits not tied to user/IP/plan',
      'Missing abuse protection for expensive AI calls'
    ],
  },

  cors: {
    id: 'cors',
    name: 'CORS',
    description: 'Detect insecure CORS configurations.',
    fileHints: ['cors', 'headers', 'middleware', 'next.config', 'server.ts'],
    checks: [
      'Wildcard origins or Access-Control-Allow-Origin: *',
      'Credentials with wildcard origins',
      'Missing allowlist for CORS origins',
      'Sensitive routes exposed cross-origin',
      'CORS configured globally too broadly'
    ],
  },

  file_upload: {
    id: 'file_upload',
    name: 'File Upload Security',
    description: 'Detect malicious file uploads, path traversal, and missing size limits.',
    fileHints: ['upload', 'storage', 'multer', 'files/', 'media/', 'attachments/'],
    checks: [
      'Missing file size validation',
      'Missing MIME/type validation',
      'Trusting original filename or path traversal risks',
      'Public storage exposure or executable upload risk',
      'Missing virus/malware scanning note',
      'Unsafe Supabase storage policies'
    ],
  },

  input_validation: {
    id: 'input_validation',
    name: 'Input Validation',
    description: 'Detect missing validation, unsafe parsing, and injection flaws.',
    fileHints: ['api/', 'routes/', 'controllers/', 'handlers/', 'validators/', 'middleware/'],
    checks: [
      'Unvalidated request bodies or missing Zod/schema validation',
      'Unsafe JSON parsing assumptions',
      'Trusting client parameters without verification',
      'Unsafe redirects',
      'Command injection patterns',
      'Unsafe dynamic imports',
      'Unsafe eval/new Function',
      'Unsafe dangerouslySetInnerHTML'
    ],
  },

  headers: {
    id: 'headers',
    name: 'Security Headers',
    description: 'Detect missing or misconfigured security headers.',
    fileHints: ['headers', 'helmet', 'csp', 'middleware', 'next.config'],
    checks: [
      'Missing CSP (Content-Security-Policy)',
      'Missing frame-ancestors/X-Frame-Options',
      'Missing X-Content-Type-Options',
      'Missing Referrer-Policy',
      'Missing Permissions-Policy',
      'Overly permissive CSP',
      'Missing HSTS where applicable'
    ],
  },

  config: {
    id: 'config',
    name: 'Configuration Security',
    description: 'Detect misconfigured frameworks, build settings, or server environments.',
    fileHints: ['next.config', 'tsconfig', 'jest.config', 'vite.config', 'webpack'],
    checks: [
      'Source maps enabled in production',
      'Debug modes or verbose logging enabled in production',
      'Insecure compiler options or dangerous build settings'
    ],
  },

  general: {
    id: 'general',
    name: 'General & Vibe-Coded App Risks',
    description: 'Detect AI-generated code flaws, temporary code, and general logic issues.',
    fileHints: ['*.ts', '*.js', '*.py'],
    checks: [
      'TODO security gaps or "temporary" code left in production',
      'Placeholder/mock auth or fake authorization checks',
      'Optimistic comments that do not match code',
      'Half-implemented middleware or insecure fallback logic',
      'Client-side-only security or inconsistent server/client boundaries',
      'Secrets accidentally moved into frontend'
    ],
  },
}

export const PRIMARY_SCAN_SECTIONS: string[] = [
  'secrets',
  'database',
  'auth',
  'input_validation',
  'dependencies',
  'rate_limiting',
  'cors',
  'file_upload',
  'headers',
  'config'
]

export const ALL_SECTIONS: string[] = [
  ...PRIMARY_SCAN_SECTIONS,
  'payments',
  'general',
]
