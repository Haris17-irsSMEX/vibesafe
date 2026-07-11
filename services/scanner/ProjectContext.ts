/**
 * Deterministic project discovery used to give the AI a grounded map of the
 * repository before it evaluates individual patterns. It never reads secrets
 * into the summary and it intentionally describes only observable signals.
 */

export interface ProjectContext {
  frameworks: string[]
  languages: string[]
  runtime: string[]
  auth: string[]
  dataStores: string[]
  payments: string[]
  integrations: string[]
  apiRoutes: string[]
  publicRoutes: string[]
  protectedAreas: string[]
  adminAreas: string[]
  environmentVariables: string[]
}

export interface ContextFile {
  path: string
  content: string
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).slice(0, 20)
}

function addIf(target: string[], condition: boolean, value: string) {
  if (condition) target.push(value)
}

export function buildProjectContext(files: ContextFile[]): ProjectContext {
  const frameworks: string[] = []
  const languages: string[] = []
  const runtime: string[] = []
  const auth: string[] = []
  const dataStores: string[] = []
  const payments: string[] = []
  const integrations: string[] = []
  const apiRoutes: string[] = []
  const publicRoutes: string[] = []
  const protectedAreas: string[] = []
  const adminAreas: string[] = []
  const environmentVariables: string[] = []

  for (const file of files) {
    const path = file.path
    const sample = file.content.slice(0, 8_000)
    const lowerPath = path.toLowerCase()

    addIf(languages, /\.(ts|tsx)$/.test(lowerPath), 'TypeScript')
    addIf(languages, /\.(js|jsx|mjs|cjs)$/.test(lowerPath), 'JavaScript')
    addIf(languages, /\.py$/.test(lowerPath), 'Python')
    addIf(languages, /\.sql$/.test(lowerPath), 'SQL')
    addIf(runtime, /package\.json$/.test(lowerPath), 'Node.js')
    addIf(frameworks, /next\.config|next\//i.test(path) || /from ['"]next\//.test(sample), 'Next.js')
    addIf(frameworks, /vite\.config/i.test(path) || /from ['"]react['"]/.test(sample), 'React')

    addIf(auth, /supabase\.auth|getUser\(|getSession\(|nextauth|auth\.uid\(/i.test(sample), 'Session/auth checks')
    addIf(auth, /oauth|github/i.test(sample), 'OAuth/GitHub integration')
    addIf(dataStores, /supabase\.from|createClient\(.*supabase|@supabase/i.test(sample), 'Supabase')
    addIf(dataStores, /prisma\.|@prisma/i.test(sample), 'Prisma')
    addIf(dataStores, /drizzle/i.test(sample), 'Drizzle')
    addIf(payments, /paddle/i.test(sample), 'Paddle')
    addIf(payments, /stripe/i.test(sample), 'Stripe')

    addIf(integrations, /openai|deepseek/i.test(sample), 'AI provider')
    addIf(integrations, /resend/i.test(sample), 'Resend')
    addIf(integrations, /github/i.test(sample), 'GitHub')

    if (/^(app\/api|pages\/api)\//i.test(path)) apiRoutes.push(path)
    if (/^(app|pages)\/.+\/page\.(tsx?|jsx?)$/i.test(path) && !/\/(dashboard|admin|settings|results|scan)\//i.test(path)) {
      publicRoutes.push(path)
    }
    if (/middleware|requireAuth|getUser\(|getSession\(|isAdmin/i.test(`${path}\n${sample}`)) protectedAreas.push(path)
    if (/admin/i.test(`${path}\n${sample}`)) adminAreas.push(path)

    const matches = Array.from(sample.matchAll(/process\.env\.([A-Z0-9_]+)/g))
    for (const match of matches) environmentVariables.push(match[1])
  }

  return {
    frameworks: unique(frameworks),
    languages: unique(languages),
    runtime: unique(runtime),
    auth: unique(auth),
    dataStores: unique(dataStores),
    payments: unique(payments),
    integrations: unique(integrations),
    apiRoutes: unique(apiRoutes),
    publicRoutes: unique(publicRoutes),
    protectedAreas: unique(protectedAreas),
    adminAreas: unique(adminAreas),
    environmentVariables: unique(environmentVariables),
  }
}

export function formatProjectContext(context: ProjectContext): string {
  const list = (values: string[]) => values.length ? values.join(', ') : 'none observed'
  return [
    `Frameworks: ${list(context.frameworks)}`,
    `Languages/runtime: ${list([...context.languages, ...context.runtime])}`,
    `Auth signals: ${list(context.auth)}`,
    `Data stores: ${list(context.dataStores)}`,
    `Payments: ${list(context.payments)}`,
    `Sensitive integrations: ${list(context.integrations)}`,
    `API routes observed: ${list(context.apiRoutes)}`,
    `Public routes observed: ${list(context.publicRoutes)}`,
    `Protected areas observed: ${list(context.protectedAreas)}`,
    `Admin areas observed: ${list(context.adminAreas)}`,
    `Environment variable names observed: ${list(context.environmentVariables)}`,
  ].join('\n')
}
