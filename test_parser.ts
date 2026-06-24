import { parseFindings } from './services/scanner/FindingParser'

function runTests() {
  console.log('--- TEST 1: Pure JSON ---')
  const t1 = `{"findings":[{"severity":"high","check_name":"test","file_path":"foo.ts","description":"foo","recommendation":"bar"}]}`
  console.log(parseFindings(t1).findings.length === 1 ? 'PASS' : 'FAIL')

  console.log('--- TEST 2: Markdown fenced JSON ---')
  const t2 = `\`\`\`json\n{"findings":[{"severity":"high","check_name":"test","file_path":"foo.ts","description":"foo","recommendation":"bar"}]}\n\`\`\``
  console.log(parseFindings(t2).findings.length === 1 ? 'PASS' : 'FAIL')

  console.log('--- TEST 3: Prose before and after JSON ---')
  const t3 = `Here is the result:\n{"findings":[{"severity":"high","check_name":"test","file_path":"foo.ts","description":"foo","recommendation":"bar"}]}\nHope this helps!`
  console.log(parseFindings(t3).findings.length === 1 ? 'PASS' : 'FAIL')

  console.log('--- TEST 4: Array-only findings ---')
  const t4 = `[{"severity":"high","check_name":"test","file_path":"foo.ts","description":"foo","recommendation":"bar"}]`
  console.log(parseFindings(t4).findings.length === 1 ? 'PASS' : 'FAIL')

  console.log('--- TEST 5: Single finding object ---')
  const t5 = `{"severity":"high","check_name":"test","file_path":"foo.ts","description":"foo","recommendation":"bar"}`
  console.log(parseFindings(t5).findings.length === 1 ? 'PASS' : 'FAIL')
}

runTests()
