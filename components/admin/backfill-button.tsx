'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Loader2 } from 'lucide-react'

export function BackfillButton({ count }: { count: number }) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleBackfill = async () => {
    if (count === 0) return
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/backfill-fix-prompts', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to backfill')
      
      alert(data.message)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  if (count === 0) {
    return (
      <button
        disabled
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cc-border bg-cc-bg-secondary px-4 py-3 text-sm font-medium text-cc-subtle"
      >
        <Sparkles className="h-4 w-4" />
        All fix prompts are up to date
      </button>
    )
  }

  return (
    <button
      onClick={handleBackfill}
      disabled={isLoading}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cc-border-strong bg-cc-surface-raised px-4 py-3 text-sm font-medium text-cc-text transition-colors hover:bg-cc-surface-hover disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4 text-violet-300" />
      )}
      {isLoading ? 'Generating prompts...' : `Backfill ${count} missing fix prompt${count === 1 ? '' : 's'}`}
    </button>
  )
}
