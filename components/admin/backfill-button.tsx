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
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-zinc-500 border border-white/10"
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
      className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {isLoading ? 'Generating prompts...' : `Backfill ${count} missing fix prompt${count === 1 ? '' : 's'}`}
    </button>
  )
}
