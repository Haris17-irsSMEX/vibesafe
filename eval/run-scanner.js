/*
 * Offline evaluation runner. It transpiles the existing TypeScript scanner
 * modules in-process, so eval:scanner exercises production logic without
 * adding tsx/ts-node or requiring GitHub/Supabase credentials.
 */
const fs = require('fs')
const path = require('path')
const Module = require('module')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const originalResolve = Module._resolveFilename
Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith('@/')) return originalResolve.call(this, path.join(root, request.slice(2)), parent, isMain, options)
  return originalResolve.call(this, request, parent, isMain, options)
}
require.extensions['.ts'] = function transpileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    fileName: filename,
  }).outputText
  module._compile(output, filename)
}

const { fixtures } = require('./fixtures/scanner-fixtures')
const { runDeterministicPrechecks } = require('../services/scanner/DeterministicPrechecks.ts')
const { verifyAndDeduplicateFindings } = require('../services/scanner/FindingVerification.ts')
const { parseFullAuditResponse } = require('../services/scanner/FindingParser.ts')
const { calculateSecurityScore } = require('../services/scoring/SecurityScorer.ts')
const { generateFixPrompt } = require('../services/scanner/FixPromptGenerator.ts')

const failures = []
const print = (label, message) => console.log(`${label} ${message}`)
const text = (finding) => `${finding.check_name} ${finding.category} ${finding.description}`.toLowerCase()

function auditFinding(finding, files) {
  const file = finding.file_path && files.find((entry) => entry.path === finding.file_path)
  const issues = []
  if (finding.file_path && !file) issues.push('hallucinated_path')
  if (file && finding.line_number && finding.line_number > file.content.split('\n').length) issues.push('invalid_line')
  const evidence = finding.evidence || finding.evidence_snippet || finding.vulnerable_code
  if (finding.finding_status === 'confirmed' && (!file || !evidence || !file.content.includes(evidence.split('\n')[0].trim()))) issues.push('confirmed_without_evidence')
  if (['CRITICAL', 'HIGH'].includes(finding.severity) && (!file || !evidence)) issues.push('overstated_severity')
  const prompt = generateFixPrompt(finding)
  const promptPath = prompt.match(/Affected file:\n([^\n]+)/)?.[1]
  if (finding.file_path && promptPath && promptPath !== finding.file_path) issues.push('fix_prompt_unknown_file')
  const fixtureText = files.map((entry) => `${entry.path}\n${entry.content}`).join('\n').toLowerCase()
  for (const provider of ['stripe', 'paddle', 'supabase', 'firebase', 'aws']) {
    if (text(finding).includes(provider) && !fixtureText.includes(provider)) issues.push(`provider_hallucination:${provider}`)
  }
  return issues
}

function evaluateFixture(fixture) {
  const raw = runDeterministicPrechecks(fixture.files)
  const verified = verifyAndDeduplicateFindings(raw, fixture.files).findings
  const score = calculateSecurityScore(verified)
  const issues = []
  for (const expected of fixture.expected) {
    const match = verified.find((finding) => expected.match.test(text(finding)) && finding.file_path === expected.file)
    if (!match) issues.push(`missed:${expected.match}`)
    else if (expected.severity && !expected.severity.includes(match.severity)) issues.push(`severity:${match.check_name}:${match.severity}`)
  }
  for (const expectedFile of fixture.expectedEvidenceFiles) {
    const evidenced = verified.some((finding) => finding.file_path === expectedFile && (finding.evidence || finding.evidence_snippet || finding.vulnerable_code))
    if (!evidenced) issues.push(`missing_evidence:${expectedFile}`)
  }
  for (const notExpected of fixture.shouldNotFind) {
    const unexpected = verified.find((finding) => notExpected.test(text(finding)))
    if (unexpected) issues.push(`false_positive:${unexpected.check_name}`)
  }
  for (const finding of verified) issues.push(...auditFinding(finding, fixture.files))
  if (fixture.safe && verified.some((finding) => ['CRITICAL', 'HIGH'].includes(finding.severity))) issues.push('high_or_critical_false_positive')
  const pass = issues.length === 0
  print(pass ? 'PASS' : 'FAIL', `${fixture.id} — findings=${verified.length}, score=${score.score}${issues.length ? `, ${issues.join(', ')}` : ''}`)
  if (!pass) failures.push(fixture.id)
  return { raw, verified }
}

function evaluateParserNormalization() {
  const files = [{ path: 'app/api/upload/route.ts', content: "export async function POST() { return Response.json({ ok: true }) }\n" }]
  const shapes = [
    ['exact', { findings: [{ title: 'Missing authentication', severity: 'high', category: 'auth', affectedFile: files[0].path, lineStart: 1, evidence: 'export async function POST()', recommendation: 'Require a user session.' }] }],
    ['legacy', { findings: [{ check_name: 'Missing authentication', description: 'No auth check exists.', recommendation: 'Require auth.' }] }],
    ['issues', { issues: [{ name: 'Missing authentication', details: 'No auth check exists.', fix: 'Require auth.' }] }],
    ['vulnerabilities', { vulnerabilities: [{ issue: 'Missing authentication', explanation: 'No auth check exists.', remediation: 'Require auth.' }] }],
    ['results', { results: [{ finding: 'Missing authentication', impact: 'No auth check exists.', solution: 'Require auth.' }] }],
    ['fenced', '```json\n{"findings":[{"title":"Missing authentication","description":"No auth check exists."}]}\n```'],
    ['prose', 'Audit complete. {"findings":[{"title":"Missing authentication","description":"No auth check exists."}]} End.'],
  ]
  let parserFailures = 0
  for (const [name, shape] of shapes) {
    const result = parseFullAuditResponse(typeof shape === 'string' ? shape : JSON.stringify(shape))
    if (!result.findings.length) { parserFailures++; print('FAIL', `parser:${name} produced no normalized finding`) }
    else print('PASS', `parser:${name} normalized=${result.findings.length}`)
  }
  const invalid = parseFullAuditResponse(JSON.stringify({ findings: [{ title: 'Path test', description: 'Useful finding', affectedFile: 'does/not/exist.ts' }] }))
  const checked = verifyAndDeduplicateFindings(invalid.findings, files).findings
  if (checked.length !== 0) { parserFailures++; print('FAIL', 'parser:invalid-path was not rejected by verification') } else print('PASS', 'parser:invalid-path rejected')
  const invalidLine = parseFullAuditResponse(JSON.stringify({ findings: [{ title: 'Line test', description: 'Useful finding', affectedFile: files[0].path, lineStart: 99 }] }))
  const lineChecked = verifyAndDeduplicateFindings(invalidLine.findings, files).findings[0]
  if (lineChecked && lineChecked.line_number) { parserFailures++; print('FAIL', 'parser:invalid-line was not cleared by verification') } else print('PASS', 'parser:invalid-line cleared')
  const vague = parseFullAuditResponse(JSON.stringify({ findings: [{}] }))
  if (vague.findings.length) { parserFailures++; print('FAIL', 'parser:vague finding was not discarded') } else print('PASS', 'parser:vague finding discarded')
  if (parserFailures) failures.push('parser-normalization')
}

async function evaluateAiIfRequested() {
  if (!process.argv.includes('--ai')) return
  if (!process.env.DEEPSEEK_API_KEY) { print('SKIP', 'AI evaluation skipped: DEEPSEEK_API_KEY is not configured'); return }
  const { runSectionScan } = require('../services/scanner/DeepSeekScanner.ts')
  const sample = fixtures[0]
  const prompt = `Return JSON only: {"findings":[{"title":"...","description":"...","severity":"medium","affectedFile":"...","evidence":"..."}]}. Analyze this fixture file:\n--- FILE: ${sample.files[0].path} ---\n${sample.files[0].content}`
  const result = await runSectionScan('evaluation', prompt, 'Return strict JSON only.', { selectedFiles: 1, sourceChars: sample.files[0].content.length })
  if (!result.ok) { failures.push('ai-evaluation'); print('FAIL', `AI evaluation provider failure: ${result.reason}`); return }
  const parsed = parseFullAuditResponse(result.rawText)
  const verified = verifyAndDeduplicateFindings(parsed.findings, sample.files).findings
  if (!verified.length) { failures.push('ai-evaluation'); print('FAIL', 'AI evaluation returned no verifiable finding') } else print('PASS', `AI evaluation verified=${verified.length}`)
}

async function main() {
  print('INFO', `Running ${fixtures.length} deterministic fixtures`)
  fixtures.forEach(evaluateFixture)
  evaluateParserNormalization()
  await evaluateAiIfRequested()
  print(failures.length ? 'FAIL' : 'PASS', `evaluation complete — failed=${failures.length}`)
  if (failures.length) process.exitCode = 1
}

main().catch((error) => { console.error('FAIL evaluation runner error', error.message); process.exitCode = 1 })
