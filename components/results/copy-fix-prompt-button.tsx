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
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-all shadow-sm active:scale-95",
        copied 
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
          : "bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_0_10px_-3px_rgba(124,58,237,0.3)]",
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
