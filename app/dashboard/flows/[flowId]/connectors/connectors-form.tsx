'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

export function ConnectorsForm({ flowId, resendConnected }: { flowId: string; resendConnected: boolean }) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/flows/${flowId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          secret: secret.trim() ? secret.trim() : null,
        }),
      })
      const r = await readApiResult(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setUrl('')
      setSecret('')
      router.refresh()
    } catch {
      setErr('No se pudo guardar. Revisa la URL e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8EAEF] bg-white p-4 dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
        <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Resend (workspace)</p>
        <p className="mt-1 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          La API key se configura una sola vez en{' '}
          <Link href="/dashboard/settings/integrations" className="font-semibold text-[#6B4DD4] hover:underline">
            Configuración → Integraciones
          </Link>
          . Aquí solo verás el estado para este flow.
        </p>
        <p className="mt-3 text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
          Estado:{' '}
          <span className={resendConnected ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-300'}>
            {resendConnected ? 'Conectado en la organización' : 'Sin conectar'}
          </span>
        </p>
        {!resendConnected ? (
          <Link
            href="/dashboard/settings/integrations"
            className="mt-3 inline-flex rounded-xl bg-[#0f172a] px-3 py-2 text-xs font-semibold text-white dark:bg-[#334155]"
          >
            Conectar Resend
          </Link>
        ) : null}
      </div>

    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 dark:border-[#2A2F3F] dark:bg-[#161821]">
      <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">Añadir webhook</p>
      <p className="text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
        Se enviará un POST JSON al completarse una sesión pública (`flow.session.completed`). Si defines un secreto,
        incluiremos la cabecera <code className="rounded bg-black/5 px-1 dark:bg-white/10">X-Dilo-Signature</code> con
        HMAC-SHA256 del cuerpo.
      </p>
      <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
        URL
        <input
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.tudominio.com/webhooks/dilo"
          className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#F8F9FB]"
        />
      </label>
      <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
        Secreto (opcional)
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="Para verificar firma en tu servidor"
          className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2.5 text-sm text-[#1A1A1A] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#F8F9FB]"
        />
      </label>
      {err ? (
        <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] py-2.5 text-sm font-semibold text-white opacity-100 disabled:opacity-50"
      >
        {busy ? 'Guardando…' : 'Guardar webhook'}
      </button>
    </form>
    </div>
  )
}
