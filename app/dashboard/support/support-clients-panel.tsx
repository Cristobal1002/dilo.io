'use client'

import { useEffect, useMemo, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'

type ClientRow = {
  id: string
  name: string
  slug: string
}

export default function SupportClientsPanel() {
  const [rows, setRows] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [okMsg, setOkMsg] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/clients')
      const r = await readApiResult<{ clients: ClientRow[] }>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setRows(r.data.clients)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const sorted = useMemo(() => rows.slice().sort((a, b) => a.name.localeCompare(b.name)), [rows])

  const create = async () => {
    const n = name.trim()
    if (n.length < 2) return
    setBusy(true)
    setMsg(null)
    setOkMsg(null)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: n }),
      })
      const r = await readApiResult<{ client: ClientRow }>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setName('')
      setOkMsg('Cliente creado.')
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 dark:border-[#2A2F3F] dark:bg-[#161821]">
        <p className="text-sm text-[#475569] dark:text-[#CBD5E1]">
          Define clientes (empresas) como entidad canónica. El flow de soporte puede guardar el <strong>clientId</strong>{' '}
          como value en la pregunta “Empresa” para evitar variaciones.
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="block flex-1 text-[10px] font-medium text-[#64748B]">
            Nombre del cliente
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. HSG Synergy"
              maxLength={200}
              className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
            />
          </label>
          <button
            type="button"
            disabled={busy || name.trim().length < 2}
            onClick={() => void create()}
            className="rounded-xl bg-[#0f172a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#334155]"
          >
            {busy ? 'Creando…' : 'Crear cliente'}
          </button>
        </div>
      </div>

      {msg ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {msg}
        </p>
      ) : null}
      {okMsg ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {okMsg}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[#E8EAEF] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
        <div className="border-b border-[#E8EAEF] px-4 py-3 text-xs font-semibold text-[#1A1A1A] dark:border-[#2A2F3F] dark:text-[#F8F9FB]">
          Clientes ({sorted.length})
        </div>
        {loading ? (
          <div className="px-4 py-4 text-sm text-[#64748B]">Cargando…</div>
        ) : sorted.length === 0 ? (
          <div className="px-4 py-4 text-sm text-[#64748B]">Aún no hay clientes.</div>
        ) : (
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-[#E8EAEF] text-[10px] font-semibold uppercase text-[#94A3B8] dark:border-[#2A2F3F]">
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Slug</th>
                <th className="px-4 py-2">ID (value para el flow)</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c) => (
                <tr key={c.id} className="border-b border-[#E8EAEF]/60 dark:border-[#2A2F3F]/60">
                  <td className="px-4 py-2 font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">{c.name}</td>
                  <td className="px-4 py-2 text-[#475569] dark:text-[#CBD5E1]">{c.slug}</td>
                  <td className="px-4 py-2 font-mono text-[12px] text-[#475569] dark:text-[#CBD5E1]">{c.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

