'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  alertError,
  alertSuccess,
  btnPrimary,
  btnPrimarySm,
  btnSecondary,
  emptyState,
  inputField,
  labelField,
  linkAccent,
  selectField,
  tableShell,
} from '@/lib/dashboard-ui'
import { readApiResult } from '@/lib/read-api-result'
import { cn } from '@/lib/utils'

type ArticleRow = {
  id: string
  title: string
  body: string
  clientId: string | null
  status: string
}

type ClientOption = { id: string; name: string }

const emptyForm = {
  title: '',
  body: '',
  clientId: '',
  status: 'published' as 'published' | 'draft',
}

export default function KnowledgePageClient() {
  const [rows, setRows] = useState<ArticleRow[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ArticleRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const [ar, cr] = await Promise.all([fetch('/api/knowledge/articles'), fetch('/api/clients')])
      const a = await readApiResult<{ articles: ArticleRow[] }>(ar)
      const c = await readApiResult<{ clients: ClientOption[] }>(cr)
      if (!a.ok) {
        setErr(a.message)
        return
      }
      setRows(a.data.articles)
      if (c.ok) setClients(c.data.clients.map((x) => ({ id: x.id, name: x.name })))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => r.title.toLowerCase().includes(needle) || r.body.toLowerCase().includes(needle))
  }, [rows, q])

  const clientName = (id: string | null) => {
    if (!id) return 'Todos'
    return clients.find((c) => c.id === id)?.name ?? '—'
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (r: ArticleRow) => {
    setEditing(r)
    setForm({
      title: r.title,
      body: r.body,
      clientId: r.clientId ?? '',
      status: r.status === 'draft' ? 'draft' : 'published',
    })
    setModalOpen(true)
  }

  const save = async () => {
    setSaving(true)
    setErr(null)
    setMsg(null)
    const payload = {
      title: form.title.trim(),
      body: form.body.trim(),
      clientId: form.clientId.trim() ? form.clientId.trim() : null,
      status: form.status,
    }
    try {
      const res = await fetch(editing ? `/api/knowledge/articles/${editing.id}` : '/api/knowledge/articles', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const r = await readApiResult(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setModalOpen(false)
      setMsg(editing ? 'Artículo actualizado.' : 'Artículo creado.')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar este artículo?')) return
    const res = await fetch(`/api/knowledge/articles/${id}`, { method: 'DELETE' })
    const r = await readApiResult(res)
    if (!r.ok) {
      setErr(r.message)
      return
    }
    setMsg('Artículo eliminado.')
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar artículos…"
          className={cn(inputField, 'max-w-md')}
        />
        <button type="button" onClick={openCreate} className={btnPrimarySm}>
          Nuevo artículo
        </button>
      </div>

      {msg ? <p className={alertSuccess}>{msg}</p> : null}
      {err ? <p className={alertError}>{err}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando…</p>
      ) : filtered.length === 0 ? (
        <div className={emptyState}>
          <p className="text-sm text-muted-foreground">No hay artículos. Crea uno para la deflexión con IA.</p>
        </div>
      ) : (
        <div className={tableShell}>
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#FAFBFC] text-[10px] font-bold uppercase tracking-wide text-[#64748B] dark:bg-[#161821]">
              <tr>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3">Alcance</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EAEF] dark:divide-[#2A2F3F]">
              {filtered.map((r) => (
                <tr key={r.id} className="bg-white dark:bg-[#1A1D29]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-foreground">{r.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{r.body}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{clientName(r.clientId)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        r.status === 'published'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                          : 'bg-[#F1F5F9] text-[#64748B]',
                      )}
                    >
                      {r.status === 'published' ? 'Publicado' : 'Borrador'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-3">
                      <button type="button" onClick={() => openEdit(r)} className={linkAccent}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(r.id)}
                        className="text-xs font-medium text-[#64748B] hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[#E8EAEF] bg-white p-5 shadow-xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
            <h2 className="text-lg font-bold text-foreground">{editing ? 'Editar artículo' : 'Nuevo artículo'}</h2>
            <div className="mt-4 grid gap-3">
              <label className={labelField}>
                Título *
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className={cn(inputField, 'mt-1')}
                />
              </label>
              <label className={labelField}>
                Contenido *
                <textarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  rows={8}
                  className={cn(inputField, 'mt-1 resize-y')}
                />
              </label>
              <label className={labelField}>
                Cliente (opcional)
                <select
                  value={form.clientId}
                  onChange={(e) => setForm((f) => ({ ...f, clientId: e.target.value }))}
                  className={cn(selectField, 'mt-1')}
                >
                  <option value="">Todos los clientes</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelField}>
                Estado
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'published' | 'draft' }))}
                  className={cn(selectField, 'mt-1')}
                >
                  <option value="published">Publicado</option>
                  <option value="draft">Borrador</option>
                </select>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setModalOpen(false)} className={btnSecondary}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving || form.title.trim().length < 2 || form.body.trim().length < 10}
                onClick={() => void save()}
                className={btnPrimarySm}
              >
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
