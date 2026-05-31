'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { readApiResult } from '@/lib/read-api-result'

type Props = {
  flowId: string
  flowName: string
  sessionToken: string
  isEmbed?: boolean
  onResolved: (args: { query: string; answer: string }) => Promise<void>
  onEscalate: (args: { query: string; answer: string }) => Promise<void>
}

export function PublicFlowDeflection({
  flowId,
  flowName,
  sessionToken,
  isEmbed,
  onResolved,
  onEscalate,
}: Props) {
  const [query, setQuery] = useState('')
  const [answer, setAnswer] = useState<string | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const ask = async () => {
    const q = query.trim()
    if (q.length < 3) {
      setErr('Escribe al menos 3 caracteres.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/f/${flowId}/assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, query: q }),
      })
      const r = await readApiResult<{ answer: string; sources: string[] }>(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setAnswer(r.data.answer)
      setSources(r.data.sources ?? [])
    } finally {
      setBusy(false)
    }
  }

  const pageBg =
    'min-h-dvh flex flex-col bg-gradient-to-b from-[#FAF7FF] via-[#FDFBFF] to-[#F4FBF8] dark:from-[#0F1117] dark:via-[#0F1117] dark:to-[#0F1117]'

  return (
    <div className={pageBg}>
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-8 sm:py-12">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#9C77F5] dark:text-[#D4C4FC]">Dilo</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#1A1A1A] dark:text-[#F8F9FB]">
          ¿En qué podemos ayudarte?
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          {flowName} — buscamos primero en la base de conocimiento antes de abrir un caso.
        </p>

        {!answer ? (
          <div className="mt-8 space-y-4">
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={4}
              placeholder="Describe tu duda o problema…"
              className="w-full resize-y rounded-2xl border border-[#E8EAEF] bg-white px-4 py-3 text-sm text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#9C77F5]/25 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
            />
            {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}
            <button
              type="button"
              disabled={busy || query.trim().length < 3}
              onClick={() => void ask()}
              className="w-full rounded-full bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-6 py-3.5 text-sm font-bold text-white shadow-[0_8px_28px_rgba(156,119,245,0.35)] transition hover:opacity-95 disabled:opacity-50"
            >
              {busy ? 'Buscando…' : 'Buscar ayuda'}
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            <div className="rounded-2xl border border-[#9C77F5]/14 bg-white/95 px-4 py-4 text-[15px] leading-relaxed text-[#1A1A1A] shadow-sm dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#F8F9FB]">
              <p className="whitespace-pre-wrap">{answer}</p>
            </div>
            {sources.length > 0 ? (
              <p className="text-xs text-[#94A3B8]">
                Basado en: {sources.slice(0, 3).join(' · ')}
              </p>
            ) : null}
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setActionBusy(true)
                  void onResolved({ query: query.trim(), answer }).finally(() => setActionBusy(false))
                }}
                className="flex-1 rounded-full border border-[#E5E7EB] bg-white px-5 py-3 text-sm font-semibold text-[#4B5563] transition hover:bg-[#F8F9FB] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#9CA3AF]"
              >
                {actionBusy ? 'Guardando…' : 'Listo, resuelto'}
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => {
                  setActionBusy(true)
                  void onEscalate({ query: query.trim(), answer }).finally(() => setActionBusy(false))
                }}
                className={cn(
                  'flex-1 rounded-full bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-5 py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50',
                )}
              >
                Necesito más ayuda
              </button>
            </div>
          </div>
        )}
      </div>
      {!isEmbed ? null : <div className="h-4" aria-hidden />}
    </div>
  )
}
