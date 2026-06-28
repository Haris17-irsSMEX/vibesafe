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
        inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold border transition-all duration-200
        ${copied
          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_-2px_rgba(16,185,129,0.3)]'
          : 'bg-white/5 border-white/10 text-zinc-300 hover:bg-white/10 hover:border-white/20 hover:text-white'
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
