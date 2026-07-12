'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, LoaderCircle, RefreshCw } from 'lucide-react'

interface GenerateSecurityReportButtonProps {
  scanId: string
  status: 'not_generated' | 'generating' | 'failed'
}

export function GenerateSecurityReportButton({ scanId, status }: GenerateSecurityReportButtonProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(status === 'generating')
  const [error, setError] = useState<string | null>(null)

  async function generateReport() {
    setIsGenerating(true)
    setError(null)
    try {
      const response = await fetch(`/api/scans/${scanId}/generate-report`, { method: 'POST' })
      const body = await response.json().catch(() => ({})) as { error?: string; success?: boolean }
      if (!response.ok || !body.success) throw new Error(body.error || 'Security Officer Report generation failed. Please retry.')
      router.refresh()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Security Officer Report generation failed. Please retry.')
    } finally {
      setIsGenerating(false)
    }
  }

  const busy = isGenerating || status === 'generating'
  return (
    <div className="mt-5">
      <button
        type="button"
        onClick={generateReport}
        disabled={busy}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cc-text px-4 text-sm font-semibold text-cc-bg transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : status === 'failed' ? <RefreshCw className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
        {busy ? 'Generating report…' : status === 'failed' ? 'Retry report generation' : 'Generate Security Officer Report'}
      </button>
      {error && <p role="alert" className="mt-3 text-sm text-amber-300">{error}</p>}
    </div>
  )
}
