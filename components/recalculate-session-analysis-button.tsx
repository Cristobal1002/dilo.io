'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

export function RecalculateSessionAnalysisButton({
  flowId,
  sessionId,
}: {
  flowId: string
  sessionId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const run = async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/flows/${flowId}/sessions/${sessionId}/recalculate-analysis`, {
        method: 'POST',
      })
      const result = await readApiResult<{ ok: boolean }>(res)
      if (!result.ok) {
        setMsg(result.message)
        return
      }
      router.refresh()
    } catch {
      setMsg('No se pudo conectar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={() => void run()}
        disabled={loading}
        title="Mismas respuestas: nuevo resumen, clasificación y score. No reenvía webhooks ni alertas instantáneas."
        className="rounded-lg border border-[#9C77F5]/30 bg-white/80 px-3 py-1.5 text-sm font-semibold text-[#6B4DD4] shadow-sm transition-colors hover:bg-[#9C77F5]/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#9C77F5]/25 dark:bg-[#1A1D29]/80 dark:text-[#D4C4FC] dark:hover:bg-[#9C77F5]/15"
      >
        {loading ? 'Recalculando…' : 'Recalcular score'}
      </button>
      {msg ? (
        <p className="max-w-56 text-right text-[10px] font-medium text-red-600 dark:text-red-400">{msg}</p>
      ) : null}
    </div>
  )
}
