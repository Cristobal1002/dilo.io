'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

export function GenerateQuoteFromSession({
  flowId,
  sessionId,
}: {
  flowId: string
  sessionId: string
}) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const generate = async () => {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/quotes/generate-from-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowId,
          sessionId,
          userPrompt: prompt.trim() === '' ? null : prompt.trim(),
        }),
      })
      const r = await readApiResult<{ quote: { id: string } }>(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      router.push(`/dashboard/quotes/${r.data.quote.id}`)
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-xl bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white"
      >
        Generar cotización con IA
      </button>
    )
  }

  return (
    <div className="rounded-xl border border-[#0d9488]/25 bg-[#0d9488]/5 p-4 print:hidden">
      <p className="text-sm font-semibold text-[#0f766e]">Cotización desde esta sesión</p>
      <p className="mt-1 text-xs text-[#64748B]">
        La IA usará las respuestas del cliente y el prompt de esta cotización. Quedará guardado en el
        editor para que lo ajustes o reutilices.
      </p>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        placeholder="Tarifas, paquetes, qué incluir, IVA, alcance…"
        className="mt-3 w-full rounded-lg border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
      />
      {err ? <p className="mt-2 text-sm text-red-600">{err}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void generate()}
          className="rounded-lg bg-[#0d9488] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Generando…' : 'Generar y abrir editor'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-[#E8EAEF] px-4 py-2 text-sm dark:border-[#2A2F3F]"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
