'use client'

import { useState } from 'react'
import { Check, TerminalSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CopyFixPromptButtonProps {
  promptText: string
  className?: string
}

export function CopyFixPromptButton({ promptText, className }: CopyFixPromptButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/20",
        copied 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
          : "border-cc-border-strong bg-cc-text text-cc-bg hover:bg-white",
        className
      )}
      aria-label="Copy Fix Prompt"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <TerminalSquare className="h-4 w-4" />
          <span>Copy for Cursor/Codex</span>
        </>
      )}
    </button>
  )
}
