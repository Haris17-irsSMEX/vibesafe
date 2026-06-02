# Phase 3A — DeepSeek Scanner Foundation Audit

## Files Changed

| File | Action | Purpose |
|---|---|---|
| `lib/types/index.ts` | **MODIFIED** | Added `Severity`, `ScanFinding`, `ParseResult`, `SecurityScoreResult`, full type system |
| `services/scanner/prompts/systemPrompt.ts` | **NEW** | JSON-only system prompt with strict no-fabrication rules |
| `services/scanner/prompts/sectionPrompts.ts` | **NEW** | 8 section definitions with focused security checklists |
| `services/scanner/prompts/buildSectionPrompt.ts` | **NEW** | Prompt builder — FILE: headers, truncation, 80K cap |
| `services/scanner/DeepSeekScanner.ts` | **NEW** | OpenAI SDK client for DeepSeek, retry logic, raw text return |
| `services/scanner/FindingParser.ts` | **NEW** | Safe JSON parser, schema validation, deduplication |
| `services/scoring/SecurityScorer.ts` | **NEW** | Deterministic scorer, score labels and color helpers |

---

## Type System

```typescript
type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

interface ScanFinding {
  check_name: string          // required
  severity: Severity          // required
  category: string            // required
  file_path: string           // required
  description: string         // required
  why_it_matters: string      // required
  line_number?: number        // optional
  cwe_id?: string             // optional
  vulnerable_code?: string    // optional
  fix_code?: string           // optional
  effort_minutes?: number     // optional
}

interface ParseResult {
  findings: ScanFinding[]
  skippedCount: number
  parseError: boolean
  parseErrorMessage?: string
}

interface SecurityScoreResult {
  score: number          // 0–100
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  totalFindings: number
}
```

---

## DeepSeek Client Design

```
runSectionScan(sectionName, sectionPrompt)
  │
  ├─ createDeepSeekClient()  [reads DEEPSEEK_API_KEY at runtime, server-side]
  │   └─ new OpenAI({ baseURL: 'https://api.deepseek.com', timeout: 60s })
  │
  ├─ client.chat.completions.create({
  │     model: 'deepseek-chat',
  │     temperature: 0.1,
  │     max_tokens: 4000,
  │     messages: [systemPrompt, sectionPrompt]
  │   })
  │
  ├─ On success → { ok: true, rawText }
  ├─ On timeout → { ok: false, reason: 'timeout' }
  ├─ On 401     → { ok: false, reason: 'invalid_key' }
  ├─ On error (attempt 1) → sleep(5s) → retry
  └─ On error (attempt 2) → { ok: false, reason: 'api_error' }
```

**Key decisions:**
- `maxRetries: 0` on the SDK client — retry is managed manually with a 5s delay
- Raw text only returned — parsing is in `FindingParser`
- API key read at call time (not module load time) — avoids build-time failures

---

## Prompt Design

### System Prompt Rules
1. Response MUST be a valid JSON array
2. No markdown, no prose outside JSON
3. `[]` if no issues found
4. No fabricated findings
5. Evidence in provided code required for every finding
6. No duplicate findings for the same issue in the same file

### Prompt Builder Format
```
FILE: path/to/file.ts
<content up to 8000 chars>

FILE: path/to/another.ts
<content>
```

### Limits
| Limit | Value |
|---|---|
| Max chars per file | 8,000 |
| Max total prompt | 80,000 chars |
| Truncation marker | `// [content truncated]` |
| Empty section return | `null` (skip API call) |

### Sections Defined
| Section | Focus |
|---|---|
| `secrets` | Hardcoded keys, tokens, credentials, .env values |
| `database` | SQL injection, raw queries, missing validation, RLS |
| `auth` | Missing auth checks, JWT misuse, IDOR, CSRF, sessions |
| `payments` | Webhook validation, amount tampering, plan bypass |
| `dependencies` | Known CVEs, deprecated packages, supply chain |
| `rate_limit` | Missing limits on auth/API/upload endpoints |
| `cors` | Wildcard+credentials, reflect-all, permissive headers |
| `file_upload` | MIME validation, size limits, path traversal, exec risk |
| `general` | Console leaks, eval(), SSRF, open redirect, ReDoS |

---

## Parser Validation Rules

| Check | Action on failure |
|---|---|
| Valid JSON | `parseError: true`, 0 findings returned |
| Must be array | `parseError: true`, 0 findings returned |
| Each item must be object | Skip item, `skippedCount++` |
| `check_name` must be non-empty string | Skip item |
| `severity` must be CRITICAL/HIGH/MEDIUM/LOW | Skip item |
| `category` must be non-empty string | Skip item |
| `file_path` must be non-empty string | Skip item |
| `description` must be non-empty string | Skip item |
| `why_it_matters` must be non-empty string | Skip item |
| Optional string fields | Silently dropped if not a non-empty string |
| Optional number fields | Silently dropped if not a positive finite number |
| Markdown fences | Stripped before parse attempt |

### Deduplication
- `deduplicateFindings()` removes duplicates by `(check_name, file_path)` key
- First occurrence wins

---

## Scoring Rules

| Severity | Points |
|---|---|
| CRITICAL | −25 |
| HIGH | −10 |
| MEDIUM | −4 |
| LOW | −1 |

**Formula**: `score = clamp(100 + Σ penalties, 0, 100)`

**This is fully deterministic — no AI input to the score.**

### Score Labels
| Range | Label |
|---|---|
| 90–100 | Excellent |
| 75–89 | Good |
| 50–74 | Needs Improvement |
| 25–49 | At Risk |
| 0–24 | Critical |

---

## Security Notes

- `DEEPSEEK_API_KEY` read at runtime only — never exposed to client bundle
- Key never logged (error handlers log safe messages only)
- Raw API responses go directly to `FindingParser` — never stored as-is
- No scan_results writes in Phase 3A — foundation only
- No fake findings, no fabricated scores — all findings must come from real API responses
- Parser never throws — all errors result in `parseError: true` with safe metadata

---

## Known Limitations

1. **No scan_results table yet** — Phase 3A builds the foundation only; wiring happens in Phase 3B
2. **No per-section timeout enforcement** — the 60s timeout is per API call, not per full scan
3. **Sequential section scanning** — sections are not parallelized to avoid rate limiting; this makes full scans slower
4. **No streaming** — full response is awaited before parsing; large responses may hit token limits
5. **Deduplication is in-memory** — if the same issue appears in two different sections, the second occurrence is dropped even if it's a distinct finding
6. **`general` section is a catch-all** — files routed to `general` get broad checks; precision is lower

---

## Verification Results

| Check | Result |
|---|---|
| `npm install openai` | ✅ Installed |
| `npx tsc --noEmit` | ✅ 0 errors |
| DeepSeekScanner compiles | ✅ |
| Prompts compile | ✅ |
| FindingParser handles valid JSON array | ✅ |
| FindingParser handles invalid JSON safely (no throw) | ✅ |
| FindingParser strips markdown fences | ✅ |
| Scoring is deterministic (no AI) | ✅ |
| No scan_results writes | ✅ |
| No fake findings | ✅ |
| No TypeScript errors | ✅ |

---

## Next Recommended Phase: Phase 3B — Scan Execution Pipeline

**Goal**: Wire the DeepSeek foundation into a full scan execution route.

**Suggested scope**:
- Create `scan_results` table (migration)
- Create `lib/db/scan-results.ts` DB helper
- Create `POST /api/scans/analyze` route:
  - Gate on `isScanReadyForAI()` check
  - Iterate over sections present in `scan_files`
  - Call `buildSectionPrompt()` + `runSectionScan()` for each section
  - Parse with `parseFindings()` + deduplicate
  - Calculate score with `calculateSecurityScore()`
  - Persist findings to `scan_results`
  - Update scan status: `scanning → complete`
  - Update `scans` with score and counts
- Add "Run AI Analysis" button to scan page (manual trigger for Phase 3B)

**Do NOT implement** yet: payment gates, public results pages, PDF export.
