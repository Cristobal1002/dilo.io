'use client'

import { useCallback, useEffect, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

type Status = {
  connected: boolean
  fromEmail: string | null
  apiKeyLast4: string | null
  corrupt?: boolean
}

export function ResendIntegrationForm() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [apiKey, setApiKey] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/integrations/resend')
      const r = await readApiResult<Status>(res)
      if (r.ok) {
        setStatus(r.data)
        setFromEmail(r.data.fromEmail ?? '')
      } else {
        setMsg(r.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/integrations/resend', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          fromEmail: fromEmail.trim() || null,
        }),
      })
      const r = await readApiResult<Status>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setStatus(r.data)
      setApiKey('')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const disconnect = async () => {
    if (!confirm('¿Quitar la integración con Resend de esta organización?')) return
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/integrations/resend', { method: 'DELETE' })
      if (res.status === 204) {
        setApiKey('')
        setFromEmail('')
        await load()
        return
      }
      const r = await readApiResult(res)
      if (!r.ok) setMsg(r.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#E8EAEF] bg-white p-5 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Resend</p>
      <h2 className="mt-1 text-lg font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Correo transaccional</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
        Conecta la API key de tu cuenta Resend <strong>una sola vez</strong> para todo el workspace. Luego cada flow
        podrá usarla en conectores (sin volver a pegar secretos).
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[#64748B]">Cargando…</p>
      ) : (
        <>
          {status?.connected ? (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200">
              <p className="font-semibold">Conectado</p>
              {status.corrupt ? (
                <p className="mt-1 text-xs opacity-90">
                  Hay datos guardados pero no se pudieron leer (clave de cifrado distinta o datos corruptos). Guarda de
                  nuevo la API key.
                </p>
              ) : (
                <p className="mt-1 text-xs opacity-90">
                  API key termina en <span className="font-mono font-bold">{status.apiKeyLast4 ?? '—'}</span>
                  {status.fromEmail ? (
                    <>
                      {' '}
                      · remitente por defecto <span className="font-mono">{status.fromEmail}</span>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2 text-sm text-[#64748B] dark:border-[#2A2F3F] dark:bg-[#161821] dark:text-[#94A3B8]">
              Aún no hay API key guardada para esta organización.
            </div>
          )}

          {msg ? (
            <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {msg}
            </p>
          ) : null}

          <form onSubmit={(e) => void save(e)} className="mt-5 space-y-3">
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
              API key (Resend)
              <input
                type="password"
                autoComplete="off"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={status?.connected ? 'Pega una nueva key para reemplazar' : 're_…'}
                className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2.5 font-mono text-sm dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
              />
            </label>
            <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
              Email remitente por defecto (opcional)
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="notificaciones@tudominio.com"
                className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
              />
            </label>
            <p className="text-[10px] leading-snug text-[#94A3B8]">
              Requisitos en servidor: <span className="font-mono">DILO_INTEGRATION_SECRETS_KEY</span> (string largo;
              usamos SHA-256 internamente). En Vercel, añádela al proyecto antes de guardar keys.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={busy || !apiKey.trim()}
                className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#334155]"
              >
                {busy ? 'Guardando…' : status?.connected ? 'Actualizar credenciales' : 'Conectar Resend'}
              </button>
              {status?.connected ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void disconnect()}
                  className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  Desconectar
                </button>
              ) : null}
            </div>
          </form>
        </>
      )}
    </div>
  )
}
