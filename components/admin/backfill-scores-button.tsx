'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calculator, Loader2 } from 'lucide-react'

export function BackfillScoresButton() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleBackfill = async () => {
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
      className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500/10 px-4 py-2 text-sm font-medium text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
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
