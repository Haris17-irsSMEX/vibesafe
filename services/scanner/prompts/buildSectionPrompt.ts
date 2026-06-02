/**
 * services/scanner/prompts/buildSectionPrompt.ts
 *
 * Builds the user-turn prompt for a specific scan section.
 * Prepends FILE: headers, truncates content, caps total size.
 * Returns null if no files exist for the section.
 */

import { SECTION_DEFINITIONS } from './sectionPrompts'
import type { ScanFileRecord } from '@/lib/db/scan-files'

// ─── Constants ───────────────────────────────────────────────────────────────

/** Max characters per individual file before content is truncated */
const MAX_CHARS_PER_FILE = 8_000

/** Hard cap on total prompt content to stay within DeepSeek context limits */
const MAX_TOTAL_CHARS = 80_000

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Build the user-turn prompt for a single scan section.
 *
 * Output format:
 *
 *   Audit the [Section Name] of this web application.
 *   [description]
 *
 *   Specifically look for these issues in the provided code:
 *   - [check1]
 *   - ...
 *
 *   IMPORTANT: Only report findings that are directly evidenced in the code below.
 *   Return [] if no real security issues are found.
 *
 *   --- FILES ---
 *   FILE: path/to/file.ts
 *   <content>
 *
 * Returns null if:
 * - No files exist for this section
 * - All files have empty content after trimming
 */
export function buildSectionPrompt(
  sectionName: string,
  files: ScanFileRecord[]
): string | null {
  // 1. Filter to files matching this section with non-empty content
  const sectionFiles = files.filter(
    (f) =>
      f.section === sectionName &&
      typeof f.content === 'string' &&
      f.content.trim().length > 0
  )

  if (sectionFiles.length === 0) {
    return null
  }

  // 2. Get section definition (fall back to generic if unknown)
  const def = SECTION_DEFINITIONS[sectionName] ?? {
    id: sectionName,
    name: sectionName,
    description: `Security review of ${sectionName}-related code.`,
    checks: ['Identify all security vulnerabilities visible in the provided code.'],
    fileHints: [],
  }

  // 3. Build checklist block
  const checkList = def.checks.map((c) => `- ${c}`).join('\n')

  // 4. Build header with no-fabrication reminder in user turn
  const header = [
    `Audit the **${def.name}** of this web application.`,
    '',
    def.description,
    '',
    'Specifically look for these issues in the provided code:',
    checkList,
    '',
    'IMPORTANT RULES FOR THIS AUDIT:',
    '- Only report issues directly visible and evidenced in the code provided below.',
    '- Do NOT infer or assume problems that are not shown in the code.',
    '- Do NOT report theoretical risks — only exploitable issues with real impact.',
    '- Return [] if no real security issues are found in the provided files.',
    '',
    '--- FILES ---',
    '',
  ].join('\n')

  // 5. Build file blocks, respecting total char cap
  let totalChars = header.length
  const fileBlocks: string[] = []

  for (const file of sectionFiles) {
    if (totalChars >= MAX_TOTAL_CHARS) {
      break
    }

    const truncatedContent =
      file.content.length > MAX_CHARS_PER_FILE
        ? file.content.slice(0, MAX_CHARS_PER_FILE) + '\n// [content truncated at 8000 chars]'
        : file.content

    const block = `FILE: ${file.file_path}\n${truncatedContent}\n`
    const remaining = MAX_TOTAL_CHARS - totalChars

    if (block.length > remaining) {
      // Append partial block up to the cap
      fileBlocks.push(block.slice(0, remaining))
      totalChars = MAX_TOTAL_CHARS
      break
    }

    fileBlocks.push(block)
    totalChars += block.length
  }

  if (fileBlocks.length === 0) {
    return null
  }

  return header + fileBlocks.join('\n')
}
