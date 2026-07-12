/** Small repo-like fixtures for deterministic scanner and parser evaluation. */

const fixtures = [
  {
    id: 'hardcoded-secret', name: 'Hardcoded secret', tags: ['secrets'],
    description: 'A server module contains a token-like literal.',
    files: [{ path: 'src/config.ts', content: "export const API_TOKEN = 'sk_test_fixture_secret_123456789'\n" }],
    expected: [{ match: /hardcoded credential/i, file: 'src/config.ts', severity: ['HIGH', 'MEDIUM'] }],
    shouldNotFind: [/missing authentication/i], expectedEvidenceFiles: ['src/config.ts'],
  },
  {
    id: 'missing-api-auth', name: 'Missing API authentication', tags: ['auth', 'api'],
    description: 'A mutating API route accepts input without an auth signal.',
    files: [{ path: 'app/api/profile/upload/route.ts', content: "export async function POST(request) { const body = await request.json(); await save(body); return Response.json({ ok: true }) }\n" }],
    expected: [{ match: /authentication check not observed/i, file: 'app/api/profile/upload/route.ts', severity: ['MEDIUM', 'HIGH'] }],
    shouldNotFind: [], expectedEvidenceFiles: [],
  },
  {
    id: 'safe-authenticated-api', name: 'Safe authenticated API route', tags: ['safe', 'auth', 'api'],
    description: 'A route authenticates and validates input.',
    files: [{ path: 'app/api/profile/route.ts', content: "export async function POST(request) { const { data: { user } } = await supabase.auth.getUser(); if (!user) return new Response('Unauthorized', { status: 401 }); const body = await request.json(); const input = profileSchema.safeParse(body); if (!input.success) return new Response('Bad request', { status: 400 }); return Response.json({ ok: true }); }\n" }],
    expected: [], shouldNotFind: [/authentication check not observed/i], expectedEvidenceFiles: [], safe: true,
  },
  {
    id: 'webhook-no-signature', name: 'Unsigned webhook', tags: ['payments', 'webhook'],
    description: 'A webhook handler does not verify a provider signature.',
    files: [{ path: 'app/api/paddle/webhook/route.ts', content: "export async function POST(request) { const event = await request.json(); await processEvent(event); return new Response('ok') }\n" }],
    expected: [{ match: /webhook signature verification not observed/i, file: 'app/api/paddle/webhook/route.ts', severity: ['HIGH', 'MEDIUM'] }],
    shouldNotFind: [/stripe/i], expectedEvidenceFiles: [],
  },
  {
    id: 'webhook-with-signature', name: 'Verified webhook', tags: ['safe', 'payments', 'webhook'],
    description: 'A webhook verifies its signature before processing.',
    files: [{ path: 'app/api/paddle/webhook/route.ts', content: "export async function POST(request) { const signature = request.headers.get('paddle-signature'); const body = await request.text(); await verifySignature(body, signature); return new Response('ok') }\n" }],
    expected: [], shouldNotFind: [/webhook signature verification not observed/i], expectedEvidenceFiles: [], safe: true,
  },
  {
    id: 'admin-no-role', name: 'Admin route missing role check', tags: ['admin', 'auth'],
    description: 'An admin endpoint lacks role authorization.',
    files: [{ path: 'app/api/admin/users/route.ts', content: "export async function POST(request) { const body = await request.json(); await updateUser(body); return Response.json({ ok: true }) }\n" }],
    expected: [{ match: /admin role authorization not observed/i, file: 'app/api/admin/users/route.ts', severity: ['HIGH', 'MEDIUM'] }],
    shouldNotFind: [], expectedEvidenceFiles: [],
  },
  {
    id: 'admin-with-role', name: 'Admin route with role check', tags: ['safe', 'admin', 'auth'],
    description: 'An admin endpoint checks the authenticated user role.',
    files: [{ path: 'app/api/admin/users/route.ts', content: "export async function POST(request) { const { data: { user } } = await supabase.auth.getUser(); if (!user || !isAdmin(user.email)) return new Response('Forbidden', { status: 403 }); const body = await request.json(); const input = schema.safeParse(body); if (!input.success) return new Response('Bad request', { status: 400 }); return Response.json({ ok: true }) }\n" }],
    expected: [], shouldNotFind: [/admin role authorization not observed/i, /authentication check not observed/i], expectedEvidenceFiles: [], safe: true,
  },
  {
    id: 'safe-simple-app', name: 'Safe simple app', tags: ['safe'],
    description: 'A static page has no server-side attack surface.',
    files: [{ path: 'app/page.tsx', content: "export default function Page() { return <main>Hello</main> }\n" }],
    expected: [], shouldNotFind: [/.*/], expectedEvidenceFiles: [], safe: true,
  },
]

module.exports = { fixtures }
