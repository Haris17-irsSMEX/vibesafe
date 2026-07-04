/**
 * services/notifications/ResendMailer.ts
 *
 * Server-side ONLY. Sends transactional emails via Resend.
 *
 * Security rules:
 * - Never exposes RESEND_API_KEY to the client.
 * - Never includes raw stack traces, tokens, or DeepSeek responses in emails.
 * - Only sends emails to the authenticated scan owner's address.
 *
 * Local behavior:
 * - If RESEND_API_KEY or RESEND_FROM_EMAIL is absent, logs a safe skip message.
 * - Never throws — email failure must not break the scan pipeline.
 */

import { Resend } from 'resend'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ScanCompleteEmailInput {
  userEmail: string
  repoFullName: string
  scanId: string
  securityScore: number | null
  totalFindings: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  resultsUrl: string
}

export interface ScanFailedEmailInput {
  userEmail: string
  repoFullName: string
  scanId: string
  safeReason: string
  dashboardUrl: string
}

// ─── Config ──────────────────────────────────────────────────────────────────

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Resend] Email skipped in development (RESEND_API_KEY or RESEND_FROM_EMAIL not set).')
    } else {
      console.error('[Resend] Missing RESEND_API_KEY or RESEND_FROM_EMAIL in production.')
    }
    return null
  }

  return new Resend(apiKey)
}

function getFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL ?? 'CtrlCode <noreply@vibesafe.io>'
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityRow(label: string, count: number, color: string): string {
  if (count === 0) return ''
  return `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #374151;">${label}</td>
      <td style="padding: 6px 0; font-size: 14px; font-weight: 700; color: ${color}; text-align: right;">${count}</td>
    </tr>`
}

function scoreColor(score: number | null): string {
  if (score === null) return '#6B7280'
  if (score >= 80) return '#059669'
  if (score >= 60) return '#D97706'
  return '#DC2626'
}

// ─── Email Templates ─────────────────────────────────────────────────────────

function buildScanCompleteHtml(input: ScanCompleteEmailInput): string {
  const score = input.securityScore
  const scoreDisplay = score !== null ? `${score}/100` : 'N/A'
  const color = scoreColor(score)

  const severityRows = [
    severityRow('Critical', input.criticalCount, '#DC2626'),
    severityRow('High', input.highCount, '#EA580C'),
    severityRow('Medium', input.mediumCount, '#D97706'),
    severityRow('Low', input.lowCount, '#6B7280'),
  ].filter(Boolean).join('')

  const findingsSummary = input.totalFindings === 0
    ? `<p style="color: #059669; font-weight: 600; margin: 16px 0;">✅ No security issues were found.</p>`
    : `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">${severityRows}</table>`

  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>CtrlCode Scan Complete</title></head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: #0F172A; padding: 28px 32px; text-align: center;">
              <span style="color: #FFFFFF; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">CtrlCode</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Security Scan Complete</h1>
              <p style="font-size: 14px; color: #6B7280; margin: 0 0 24px 0;">
                We finished scanning <strong style="color: #111827;">${escapeHtml(input.repoFullName)}</strong>.
              </p>

              <!-- Score Box -->
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 42px; font-weight: 800; color: ${color};">${escapeHtml(scoreDisplay)}</div>
                <div style="font-size: 13px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 4px;">Security Score</div>
              </div>

              <!-- Findings Summary -->
              <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                <p style="font-size: 13px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 12px 0;">Findings (${input.totalFindings} total)</p>
                ${findingsSummary}
              </div>

              <!-- CTA -->
              <a href="${input.resultsUrl}" style="display: block; background: #4F46E5; color: #FFFFFF; text-align: center; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none;">
                View Results →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #F3F4F6; text-align: center;">
              <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
                You're receiving this because you ran a CtrlCode security scan.<br/>
                © CtrlCode
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function buildScanFailedHtml(input: ScanFailedEmailInput): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>CtrlCode Scan Failed</title></head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E5E7EB; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: #0F172A; padding: 28px 32px; text-align: center;">
              <span style="color: #FFFFFF; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">CtrlCode</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <h1 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 8px 0;">Scan Encountered an Error</h1>
              <p style="font-size: 14px; color: #6B7280; margin: 0 0 24px 0;">
                The security scan for <strong style="color: #111827;">${escapeHtml(input.repoFullName)}</strong> did not complete successfully.
              </p>

              <!-- Error Box -->
              <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 10px; padding: 16px; margin-bottom: 24px;">
                <p style="font-size: 14px; color: #991B1B; margin: 0;">
                  ${escapeHtml(input.safeReason)}
                </p>
              </div>

              <!-- CTA -->
              <a href="${input.dashboardUrl}" style="display: block; background: #4F46E5; color: #FFFFFF; text-align: center; padding: 14px 24px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none;">
                Go to Dashboard →
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid #F3F4F6; text-align: center;">
              <p style="font-size: 12px; color: #9CA3AF; margin: 0;">
                You're receiving this because you ran a CtrlCode security scan.<br/>
                © CtrlCode
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// Simple HTML escape — prevents user-controlled data from injecting HTML
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a scan completion email to the scan owner.
 * Never throws — any failures are caught and logged server-side only.
 */
export async function sendScanCompleteEmail(input: ScanCompleteEmailInput): Promise<void> {
  const resend = getResendClient()
  if (!resend) return // Graceful skip in local dev or if config is missing

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: input.userEmail,
      subject: `✅ Scan complete — ${input.repoFullName} scored ${input.securityScore ?? 'N/A'}/100`,
      html: buildScanCompleteHtml(input),
    })
    console.log(`[Resend] Scan complete email sent to ${input.userEmail.split('@')[0]}@*** for scan ${input.scanId}`)
  } catch (err) {
    // Log safe error only — never expose raw err to client or email body
    const safeMsg = err instanceof Error ? err.message : 'Unknown Resend error'
    console.error(`[Resend] Failed to send scan complete email for scan ${input.scanId}: ${safeMsg}`)
  }
}

/**
 * Send a scan failure email to the scan owner.
 * Never throws — any failures are caught and logged server-side only.
 */
export async function sendScanFailedEmail(input: ScanFailedEmailInput): Promise<void> {
  const resend = getResendClient()
  if (!resend) return // Graceful skip in local dev or if config is missing

  try {
    await resend.emails.send({
      from: getFromAddress(),
      to: input.userEmail,
      subject: `⚠️ CtrlCode scan failed — ${input.repoFullName}`,
      html: buildScanFailedHtml(input),
    })
    console.log(`[Resend] Scan failed email sent to ${input.userEmail.split('@')[0]}@*** for scan ${input.scanId}`)
  } catch (err) {
    const safeMsg = err instanceof Error ? err.message : 'Unknown Resend error'
    console.error(`[Resend] Failed to send scan failed email for scan ${input.scanId}: ${safeMsg}`)
  }
}
