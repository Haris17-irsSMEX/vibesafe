'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Loader2 } from 'lucide-react'

export function BackfillScoresButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleBackfill = async () => {
    const confirmed = window.confirm(
      'Recalibrate scores for all stored scans? This updates historical score data and may take time.'
    )
    if (!confirmed) return

    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/scans/backfill-scores', {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to backfill')
      
      alert(`Successfully recalibrated scores for ${data.updatedCount} scans`)
      router.refresh()
    } catch (err) {
      console.error(err)
      alert(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleBackfill}
      disabled={isLoading}
      className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Calculator className="h-4 w-4" />
      )}
      {isLoading ? 'Recalibrating scores...' : `Recalibrate All Scores`}
    </button>
  )
}
