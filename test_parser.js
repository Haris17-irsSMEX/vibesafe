function stripMarkdownFences(raw) {
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) return fenceMatch[1].trim()
  return raw.trim()
}

function extractObject(raw) {
  const first = raw.indexOf('{')
  const last = raw.lastIndexOf('}')
  if (first !== -1 && last !== -1 && last > first) return raw.slice(first, last + 1)
  return null
}

function extractArray(raw) {
  const first = raw.indexOf('[')
  const last = raw.lastIndexOf(']')
  if (first !== -1 && last !== -1 && last > first) return raw.slice(first, last + 1)
  return null
}

function parseFindingsStr(rawText) {
  let cleaned = stripMarkdownFences(rawText)
  
  let parsed = null
  const tryParse = (str) => { try { return JSON.parse(str) } catch (e) { return null } }
  
  parsed = tryParse(cleaned)
  if (!parsed) {
    const objStr = extractObject(cleaned)
    if (objStr) parsed = tryParse(objStr)
  }
  if (!parsed) {
    const arrStr = extractArray(cleaned)
    if (arrStr) {
      const arrParsed = tryParse(arrStr)
      if (Array.isArray(arrParsed)) parsed = { findings: arrParsed }
    }
  }
  if (!parsed) return []
  
  let findingsArray = parsed
  if (typeof parsed === 'object' && parsed !== null && Array.isArray(parsed.findings)) {
    findingsArray = parsed.findings
  } else if (typeof parsed === 'object' && parsed !== null && parsed.check_name) {
    findingsArray = [parsed]
  }
  
  if (!Array.isArray(findingsArray)) return []
  return findingsArray
}

function runTests() {
  console.log('--- TEST 1: Pure JSON ---')
  const t1 = `{"findings":[{"severity":"high","check_name":"test"}]}`
  console.log(parseFindingsStr(t1).length === 1 ? 'PASS' : 'FAIL')

  console.log('--- TEST 2: Markdown fenced JSON ---')
  const t2 = `\`\`\`json\n{"findings":[{"severity":"high","check_name":"test"}]}\n\`\`\``
  console.log(parseFindingsStr(t2).length === 1 ? 'PASS' : 'FAIL')

  console.log('--- TEST 3: Prose before and after JSON ---')
  const t3 = `Here is the result:\n{"findings":[{"severity":"high","check_name":"test"}]}\nHope this helps!`
  console.log(parseFindingsStr(t3).length === 1 ? 'PASS' : 'FAIL')

  console.log('--- TEST 4: Array-only findings ---')
  const t4 = `[{"severity":"high","check_name":"test"}]`
  console.log(parseFindingsStr(t4).length === 1 ? 'PASS' : 'FAIL')

  console.log('--- TEST 5: Single finding object ---')
  const t5 = `{"severity":"high","check_name":"test"}`
  console.log(parseFindingsStr(t5).length === 1 ? 'PASS' : 'FAIL')
}

runTests()
