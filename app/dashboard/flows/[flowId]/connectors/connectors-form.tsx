'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

export function ConnectorsForm({ flowId }: { flowId: string }) {
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
  )
}
