'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyReportButtonProps {
  markdown: string
}

export function CopyReportButton({ markdown }: CopyReportButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(markdown)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = markdown
      el.setAttribute('readonly', '')
      el.style.position = 'absolute'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <button
      id="copy-security-report-btn"
      onClick={handleCopy}
      className={`
        inline-flex min-h-10 items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-colors
        ${copied
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          : 'bg-cc-surface-raised border-cc-border-strong text-cc-text hover:bg-cc-surface-hover'
        }
      `}
      aria-label="Copy security report as markdown"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copied!
        </>
      ) : (
        <>
          <Copy className="h-4 w-4" />
          Copy Report
        </>
      )}
    </button>
  )
}
