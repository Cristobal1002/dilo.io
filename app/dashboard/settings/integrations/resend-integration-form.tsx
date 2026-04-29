'use client'

import { useCallback, useEffect, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

type Status = {
  connected: boolean
  sendReady?: boolean
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
  const [testBusy, setTestBusy] = useState(false)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)

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
          fromEmail: fromEmail.trim(),
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
    setConfirmDisconnect(true)
  }

  const doDisconnect = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/integrations/resend', { method: 'DELETE' })
      if (res.status === 204) {
        setApiKey('')
        setFromEmail('')
        setConfirmDisconnect(false)
        await load()
        return
      }
      const r = await readApiResult(res)
      if (!r.ok) setMsg(r.message)
    } finally {
      setBusy(false)
    }
  }

  const sendTest = async () => {
    setTestBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/integrations/resend/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const r = await readApiResult<{ toEmail: string }>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setMsg(`Email de prueba enviado a ${r.data.toEmail}. Revisa inbox/promociones.`)
    } finally {
      setTestBusy(false)
    }
  }

  return (
    <div className="rounded-2xl border border-[#E8EAEF] bg-white p-5 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">Resend</p>
      <h2 className="mt-1 text-lg font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Correo transaccional</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
        Conecta la API key de tu cuenta Resend <strong>una sola vez</strong> para todo el workspace (incluida la del
        paso «Send your first email»). Si la verificación fallara, crea otra en{' '}
        <span className="font-mono text-[11px]">resend.com/api-keys</span> con permiso <strong>Full access</strong>.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
        El remitente <span className="font-mono">from</span> debe usar un dominio que hayas verificado en Resend →
        Dominios; eso aplica al <em>enviar</em> correos, no a guardar la integración aquí. Dilo usa esta cuenta para
        alertas de leads y resúmenes por correo del workspace (si no hay integración completa, se usa{' '}
        <span className="font-mono">RESEND_*</span> del servidor).
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[#64748B]">Cargando…</p>
      ) : (
        <>
          {status?.connected ? (
            <div
              className={`mt-4 rounded-xl px-3 py-2 text-sm ${
                status.sendReady
                  ? 'border border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
                  : 'border border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200'
              }`}
            >
              <p className="font-semibold">{status.sendReady ? 'Conectado' : 'Guardado (incompleto)'}</p>
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
                  ) : (
                    <>
                      {' '}
                      · falta el remitente <span className="font-mono">from</span> (no podrás enviar hasta guardarlo)
                    </>
                  )}
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
              Email remitente por defecto (requerido para enviar)
              <input
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                placeholder="notificaciones@tudominio.com"
                required
                className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
              />
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={busy || !apiKey.trim() || !fromEmail.trim()}
                className="rounded-xl bg-[#0f172a] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40 dark:bg-[#334155]"
              >
                {busy ? 'Guardando…' : status?.connected ? 'Actualizar credenciales' : 'Conectar Resend'}
              </button>
              {status?.connected && status.sendReady ? (
                <button
                  type="button"
                  disabled={busy || testBusy}
                  onClick={() => void sendTest()}
                  className="rounded-xl border border-[#E8EAEF] bg-white px-4 py-2.5 text-sm font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#CBD5E1] dark:hover:bg-[#252936]"
                >
                  {testBusy ? 'Enviando…' : 'Enviar email de prueba'}
                </button>
              ) : null}
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

      {confirmDisconnect ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#E8EAEF] bg-white p-4 shadow-2xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
            <p className="text-sm font-bold text-[#111827] dark:text-[#F8F9FB]">Desconectar Resend</p>
            <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
              ¿Quitar la integración con Resend de esta organización? Esto no borra nada en Resend.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDisconnect(false)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-40 dark:hover:bg-[#252936]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void doDisconnect()}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? 'Desconectando…' : 'Desconectar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
