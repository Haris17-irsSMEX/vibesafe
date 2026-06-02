/**
 * services/scanner/prompts/sectionPrompts.ts
 *
 * Security audit section definitions for VibeSafe's DeepSeek scanner.
 *
 * Source: converted from the VibeSafe security audit brain/checklist.
 * Each section is focused and compact — the full detail lives here once,
 * not duplicated into every API prompt.
 *
 * Sections:
 *   secrets | database | auth | server_validation
 *   dependencies | rate_limit | cors | file_upload
 *   payments (kept for FileRouter compat) | general (fallback)
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SectionDefinition {
  /** Unique identifier matching FileRouter's SecuritySection */
  id: string
  /** Human-readable display name */
  name: string
  /** One-sentence description of what this section audits */
  description: string
  /** Focused checklist items — what DeepSeek should look for */
  checks: string[]
  /** File path patterns that typically contain this section's code */
  fileHints: string[]
}

// ─── Section map ──────────────────────────────────────────────────────────────

export const SECTION_DEFINITIONS: Record<string, SectionDefinition> = {

  // ── 1. Secrets & Credentials ──────────────────────────────────────────────
  secrets: {
    id: 'secrets',
    name: 'Secrets & Credentials',
    description:
      'Detect hardcoded secrets, API keys, tokens, and credentials stored in source code or configuration.',
    fileHints: ['.env', 'config/', 'secrets/', 'credentials', 'keys/'],
    checks: [
      // Hardcoded values
      'API keys, tokens, or secrets assigned directly in source code (not via process.env)',
      'Plaintext passwords or credentials in any configuration or initialization file',
      'Private keys, PEM certificates, or SSH keys committed to the repository',
      'OAuth client secrets, webhook signing secrets, or JWT signing keys hardcoded in code',
      'Database connection strings containing credentials inline (not referencing env vars)',
      // Weak or predictable secrets
      'JWT secret set to a short, predictable, or static string (e.g. "secret", "changeme")',
      'Encryption keys or IVs hardcoded rather than loaded from environment',
      // .env file issues
      '.env files committed with real credentials instead of placeholders',
      'Secrets logged to console, error trackers, or HTTP response bodies',
      // Secret management gaps
      'Secrets passed as URL query parameters (visible in logs)',
      'Missing secret rotation — long-lived tokens with no expiry',
    ],
  },

  // ── 2. Database Security ──────────────────────────────────────────────────
  database: {
    id: 'database',
    name: 'Database Security',
    description:
      'Detect SQL injection, unsafe query construction, missing access control, and insecure data handling at the database layer.',
    fileHints: ['db/', 'database/', 'prisma/', 'migrations/', 'models/', 'lib/db/'],
    checks: [
      // Injection
      'SQL injection via string concatenation or template literal interpolation in raw queries',
      'ORM raw() or $queryRaw() called with user-controlled input without parameterization',
      'Dynamic table or column names constructed from user input',
      // Access control
      'Missing Row-Level Security (RLS) policies where users must be isolated by user_id',
      'Queries that return data without filtering by the authenticated user_id',
      'Service role or admin client used where user-scoped client is appropriate',
      'Unauthenticated routes that perform database reads or writes',
      // Data handling
      'Sensitive PII (emails, phone numbers) or payment data stored without encryption',
      'Passwords stored without a strong hash (bcrypt, argon2) — plaintext or weak hash',
      'Missing input sanitization before constructing database queries',
      // Error exposure
      'Raw database errors returned to the client (expose schema, table names, column names)',
      'Missing try/catch around DB operations that could crash the server',
      // Supabase / Prisma specific
      'Supabase `.from()` queries missing `.eq("user_id", user.id)` ownership filter',
      'Prisma findMany without a where clause scoped to the current user',
    ],
  },

  // ── 3. Authentication & Session Management ────────────────────────────────
  auth: {
    id: 'auth',
    name: 'Authentication & Session Management',
    description:
      'Detect authentication bypasses, broken access control, missing authorization checks, and session security issues.',
    fileHints: ['auth/', 'middleware', 'login', 'session', 'jwt', 'oauth', 'signup'],
    checks: [
      // Route protection
      'API routes or server actions missing session/auth verification at the start',
      'Middleware that can be bypassed (e.g. missing matcher, early return without auth check)',
      'Client-side-only authorization checks with no corresponding server-side verification',
      // JWT
      'JWT verified without checking the algorithm (algorithm confusion — accept "none")',
      'JWT expiration (exp claim) not validated after decode',
      'JWT secret reused across environments or set to a weak value',
      // Session
      'Session tokens stored in localStorage instead of httpOnly, Secure cookies',
      'Missing SameSite cookie attribute allowing CSRF',
      'Session not invalidated on logout (server-side session still valid)',
      // Ownership & IDOR
      'Resource accessed by ID without verifying the requester owns the resource (IDOR)',
      'user_id accepted from client request body or query params instead of session',
      'Role or plan accepted from client payload and trusted without server verification',
      // OAuth
      'OAuth state parameter not generated, stored, or validated (CSRF on OAuth callback)',
      'OAuth redirect_uri not validated against a server-side allowlist',
      // Passwords
      'Password reset tokens predictable, not expiring, or not single-use',
      'Account enumeration possible via different error messages for existing vs. unknown email',
      // Brute force
      'Login, signup, or password reset endpoints missing rate limiting',
      'Account lockout after failed attempts not implemented',
    ],
  },

  // ── 4. Server-Side Input Validation ──────────────────────────────────────
  server_validation: {
    id: 'server_validation',
    name: 'Server-Side Input Validation',
    description:
      'Detect missing or client-trust-based input validation, injection risks, and unsafe data handling in API routes and server handlers.',
    fileHints: ['api/', 'routes/', 'controllers/', 'handlers/', 'validators/', 'middleware/'],
    checks: [
      // Missing validation
      'API route or server action that uses req.body / request.json() fields without validating type, length, or format',
      'Missing schema validation (Zod, Yup, Joi) on user-controlled inputs before processing',
      'Required fields not checked for presence — undefined or null passed to business logic',
      // Type confusion
      'Numeric fields not coerced/validated — string "1000" passed as a number to pricing logic',
      'Boolean fields accepted as string "true" without coercion — logic bypass possible',
      // Injection
      'User input used in shell commands, system calls, or eval() without sanitization',
      'User input reflected into HTML responses without escaping (XSS)',
      'Open redirect — redirect URL taken from query param without allowlist validation',
      'Server-Side Request Forgery (SSRF) — user-controlled URL fetched server-side without allowlist',
      // File & path
      'Path traversal — file paths constructed from user input without normalization (../ sequences)',
      'Prototype pollution — Object.assign() or lodash merge with user-controlled keys',
      // Error leakage
      'Raw error stack traces returned to clients in error responses',
      'Internal implementation details (file paths, DB schema) exposed in 500 responses',
      // Business logic
      'Negative quantities, zero prices, or impossible enum values accepted without rejection',
      'Batch endpoints accepting unbounded arrays — no max-item-count validation',
    ],
  },

  // ── 5. Dependency & Package Security ─────────────────────────────────────
  dependencies: {
    id: 'dependencies',
    name: 'Dependency & Package Security',
    description:
      'Detect vulnerable, outdated, or dangerous dependencies that introduce known CVEs or supply-chain risk.',
    fileHints: ['package.json', 'package-lock.json', 'yarn.lock', 'requirements.txt', 'Pipfile', 'pyproject.toml'],
    checks: [
      // Known CVEs
      'Packages pinned to versions with known critical or high-severity CVEs',
      'Transitive dependencies at vulnerable versions not overridden in resolutions/overrides',
      // Version hygiene
      'Wildcard version ranges (* or x) in production dependencies — allows arbitrary upgrades',
      'Missing lock file (package-lock.json / yarn.lock) — reproducible builds not guaranteed',
      'Inconsistent versions between package.json and lock file',
      // Supply chain
      'Packages with postinstall scripts from unknown or low-trust publishers',
      'Typosquat risk — package names that closely resemble popular packages',
      'Packages that have been deprecated and replaced with a successor',
      // Scope misuse
      'Development-only packages listed under dependencies instead of devDependencies',
      'Packages imported in production code that should only be used for testing',
      // Maintenance
      'Critical security dependencies (auth, crypto, http) not updated in 12+ months',
      'Use of packages known to have been compromised in supply-chain attacks',
    ],
  },

  // ── 6. Rate Limiting ──────────────────────────────────────────────────────
  rate_limit: {
    id: 'rate_limit',
    name: 'Rate Limiting & Abuse Prevention',
    description:
      'Detect missing or ineffective rate limiting on sensitive endpoints that enables brute force, enumeration, or resource exhaustion.',
    fileHints: ['middleware/', 'api/', 'rate-limit', 'ratelimit', 'throttle'],
    checks: [
      // Auth endpoints — highest priority
      'Login endpoint missing per-IP or per-account request rate limit',
      'Signup endpoint missing rate limit — enables mass account creation',
      'Password reset / forgot-password endpoint missing limit — oracle or spam risk',
      'OTP or verification code endpoint missing limit — brute-forceable',
      // API endpoints
      'Sensitive data endpoints (user profile, billing, admin) missing per-user limits',
      'AI inference or expensive third-party API proxy routes without per-user quotas',
      'Search or autocomplete endpoints missing limits — enumeration or scraping risk',
      // Effectiveness
      'Rate limiter configured with limits too high to be effective (e.g. 10000 req/min)',
      'Rate limit applied only per IP — bypassable via VPN, proxy, or IPv6 rotation',
      'In-memory rate limiter with no Redis/distributed store — resets on every deploy',
      // Coverage gaps
      'File upload or media generation endpoints without per-user size/count limits',
      'GraphQL or JSON-RPC endpoints accepting large batched queries without depth/complexity limits',
      'Webhook receiver endpoints missing signature check used as DoS vector',
    ],
  },

  // ── 7. CORS Configuration ─────────────────────────────────────────────────
  cors: {
    id: 'cors',
    name: 'CORS Configuration',
    description:
      'Detect insecure Cross-Origin Resource Sharing policies that allow unauthorized cross-origin access to sensitive data or actions.',
    fileHints: ['cors', 'headers', 'middleware', 'next.config', 'server.ts'],
    checks: [
      // Critical misconfigs
      'Wildcard origin (*) combined with credentials: true / withCredentials — rejected by browsers but dangerous if misconfigured',
      'CORS origin reflects request Origin header verbatim without validation (reflect-all pattern)',
      'allowedOrigins list includes http:// (non-HTTPS) origins for production APIs',
      // Overly permissive
      'allowedOrigins includes null — allows sandboxed iframe cross-origin requests',
      'allowedOrigins list contains wildcard subdomains (*.example.com) without restriction',
      'Untrusted or third-party domains in allowedOrigins that can initiate cross-origin requests',
      // Method / header scope
      'Access-Control-Allow-Methods includes DELETE or PUT without server-side auth verification',
      'Access-Control-Allow-Headers set to * — exposes all custom headers cross-origin',
      // Missing protection
      'API routes returning authenticated user data missing CORS config entirely',
      'Preflight (OPTIONS) responses cached with max-age=0 causing excessive CORS overhead',
      'CORS preflight not handled for routes that use custom headers with credentials',
    ],
  },

  // ── 8. File Upload Security ────────────────────────────────────────────────
  file_upload: {
    id: 'file_upload',
    name: 'File Upload Security',
    description:
      'Detect unsafe file upload handling — missing type validation, size limits, path traversal, and unauthorized access to stored files.',
    fileHints: ['upload', 'storage', 'multer', 'files/', 'media/', 'attachments/'],
    checks: [
      // Input validation
      'Missing MIME type validation — any file type accepted (including .exe, .php, .sh)',
      'MIME type validated by extension only — extension can be spoofed (check magic bytes)',
      'Missing file size limit — enables DoS via large upload (100 MB+ files)',
      'Missing per-user upload quota — enables storage exhaustion',
      // Storage safety
      'Uploaded file stored using the original user-supplied filename (path traversal risk)',
      'Uploaded files stored in a web-accessible directory and served with execution permissions',
      'Temporary files not cleaned up after processing — disk exhaustion over time',
      // Access control
      'Missing authentication on the upload endpoint — public upload enabled unintentionally',
      'Stored files served without an authorization check (any user can access any upload)',
      'Signed upload URLs generated with excessively long expiry (days instead of minutes)',
      // Content risks
      'Server-side processing of uploaded archives (zip/tar) without path normalization (zip slip)',
      'SVG uploads served with text/html MIME type — enables stored XSS',
      'XML or CSV uploads processed without disabling external entity expansion (XXE)',
      'Image processing libraries called on untrusted input without size/format guards',
    ],
  },

  // ── Payments (kept for FileRouter routing compat) ─────────────────────────
  payments: {
    id: 'payments',
    name: 'Payment & Billing Security',
    description:
      'Detect payment bypass vulnerabilities, missing webhook validation, and insecure Stripe/Paddle integration.',
    fileHints: ['payment', 'billing', 'stripe', 'paddle', 'checkout', 'webhook', 'subscription'],
    checks: [
      'Webhook signature not verified before processing payment events (Stripe-Signature / Paddle-Signature)',
      'Payment amount, plan name, or price ID accepted from client request body',
      'Subscription tier or plan updated in the database before confirming payment success with the provider',
      'Stripe or Paddle secret keys hardcoded or logged to console',
      'Missing idempotency key on payment creation — duplicate charge risk',
      'Webhook endpoint missing authentication — any caller can trigger plan upgrades',
      'Race condition in checkout completion — plan granted before async webhook confirms payment',
      'Sensitive billing details (last 4 digits, billing address) logged to error trackers',
      'Missing retry handling — webhook failures silently drop payment state updates',
    ],
  },

  // ── General (fallback for unrouted files) ────────────────────────────────
  general: {
    id: 'general',
    name: 'General Security',
    description:
      'Detect common security issues in code that does not belong to a specific security category.',
    fileHints: ['*.ts', '*.js', '*.py'],
    checks: [
      'Sensitive data (tokens, passwords, PII) logged to console, stdout, or error tracking',
      'Raw stack traces or internal error details returned in HTTP responses',
      'eval() or new Function() called with user-controlled input',
      'Prototype pollution via Object.assign() or lodash merge with user-controlled keys',
      'Open redirect — redirect target taken from query param without allowlist check',
      'Server-Side Request Forgery (SSRF) — URL fetched server-side from user input',
      'Regular expression denial of service (ReDoS) — unbounded quantifiers on user input',
      'Insecure randomness — Math.random() used for security-critical tokens or IDs',
      'Missing security headers (X-Frame-Options, X-Content-Type-Options, CSP)',
      'HTTP used instead of HTTPS for external API calls in production code',
    ],
  },
}

// ─── Ordered section list for scan execution ─────────────────────────────────

/**
 * The canonical scan order for the 8 primary audit sections.
 * Used by the scan orchestrator to determine which sections to scan.
 * Does NOT include 'payments' or 'general' as separate scan phases —
 * those are included via FileRouter routing.
 */
export const PRIMARY_SCAN_SECTIONS: string[] = [
  'secrets',
  'database',
  'auth',
  'server_validation',
  'dependencies',
  'rate_limit',
  'cors',
  'file_upload',
]

/**
 * All sections including fallback sections.
 * Use PRIMARY_SCAN_SECTIONS for the scan orchestrator.
 */
export const ALL_SECTIONS: string[] = [
  ...PRIMARY_SCAN_SECTIONS,
  'payments',
  'general',
]
