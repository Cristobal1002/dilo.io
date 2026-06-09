'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CLIENT_TAX_ID_LABELS,
  type ClientTaxIdType,
} from '@/lib/client-fields'
import { readApiResult } from '@/lib/read-api-result'
import {
  alertError,
  alertSuccess,
  btnPrimarySm,
  btnSecondary,
  cardSurface,
  inputField,
  linkAccent,
  tableShell,
} from '@/lib/dashboard-ui'
import { cn } from '@/lib/utils'
import {
  ClientFormModal,
  clientRowToForm,
  emptyClientForm,
  type ClientFormValues,
} from '@/components/clients/client-form-modal'

type ClientRow = {
  id: string
  name: string
  slug: string
  legalName: string | null
  externalId: string | null
  taxIdType: string | null
  taxId: string | null
  email: string | null
  phone: string | null
  website: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  stateRegion: string | null
  postalCode: string | null
  countryCode: string | null
  notes: string | null
  status: string
}

export default function ClientsPageClient() {
  const [rows, setRows] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ClientRow | null>(null)
  const [form, setForm] = useState<ClientFormValues>(emptyClientForm)
  const [saving, setSaving] = useState(false)
  const [importBusy, setImportBusy] = useState(false)
  const [updateOnImport, setUpdateOnImport] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)

  const patchForm = useCallback((patch: Partial<ClientFormValues>) => {
    setForm((f) => ({ ...f, ...patch }))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/clients')
      const r = await readApiResult<{ clients: ClientRow[] }>(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setRows(r.data.clients)
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
    return rows.filter((c) => {
      const hay = [
        c.name,
        c.legalName,
        c.externalId,
        c.taxId,
        c.email,
        c.city,
        c.countryCode,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return hay.includes(needle)
    })
  }, [rows, q])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyClientForm())
    setModalOpen(true)
  }

  const openEdit = (c: ClientRow) => {
    setEditing(c)
    setForm(clientRowToForm(c))
    setModalOpen(true)
  }

  const saveClient = async () => {
    setSaving(true)
    setErr(null)
    setMsg(null)
    const payload = {
      name: form.name.trim(),
      legalName: form.kind === 'company' ? form.legalName.trim() || null : null,
      externalId: form.externalId.trim() || null,
      taxIdType: form.taxIdType || null,
      taxId: form.taxId.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
      addressLine1: form.addressLine1.trim() || null,
      addressLine2: null,
      city: form.city.trim() || null,
      stateRegion: form.stateRegion.trim() || null,
      postalCode: null,
      countryCode: form.countryCode.trim().toUpperCase() || null,
      notes: form.notes.trim() || null,
      status: form.status,
    }
    try {
      const res = await fetch(editing ? `/api/clients/${editing.id}` : '/api/clients', {
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
      setMsg(editing ? 'Cliente actualizado.' : 'Cliente creado.')
      await load()
    } finally {
      setSaving(false)
    }
  }

  const runImport = async (file: File) => {
    setImportBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('updateExisting', updateOnImport ? 'true' : 'false')
      const res = await fetch('/api/clients/import', { method: 'POST', body: fd })
      const r = await readApiResult<{ created: number; updated: number; skipped: number; errors: string[] }>(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setMsg(
        `Listo: ${r.data.created} creados, ${r.data.updated} actualizados, ${r.data.skipped} omitidos.` +
          (r.data.errors.length ? ` Revisa ${r.data.errors.length} fila(s) con error.` : ''),
      )
      if (r.data.errors.length) setErr(r.data.errors.slice(0, 5).join(' · '))
      await load()
    } finally {
      setImportBusy(false)
    }
  }

  const downloadTemplate = () => {
    window.location.href = '/api/clients/import/template'
  }

  const copyText = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="space-y-8">
      <div className={cardSurface + ' p-5'}>
        <p className="text-sm font-semibold text-foreground">Carga masiva con Excel</p>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted-foreground">
          Descarga la plantilla, complétala y súbela. La columna <strong>id_en_tu_sistema</strong> identifica cada
          cliente en el widget embebido.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={downloadTemplate} className={btnSecondary}>
            Descargar plantilla Excel
          </button>
          <label className={cn(btnPrimarySm, 'cursor-pointer')}>
            {importBusy ? 'Subiendo…' : 'Cargar plantilla'}
            <input
              type="file"
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              disabled={importBusy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void runImport(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={updateOnImport}
            onChange={(e) => setUpdateOnImport(e.target.checked)}
            className="rounded border-[#CBD5E1]"
          />
          Si el cliente ya existe (mismo id_en_tu_sistema o nombre), actualizar sus datos
        </label>
        <p className="mt-3 text-xs text-[#94A3B8]">
          ¿Embed en tu web?{' '}
          <a href="/dashboard/settings/connections/embed" className={linkAccent}>
            Configuración → Conexiones
          </a>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, NIT, email, id en tu sistema…"
          className={cn(inputField, 'max-w-md')}
        />
        <button type="button" onClick={openCreate} className={btnPrimarySm}>
          Nuevo cliente
        </button>
      </div>

      {msg ? <p className={alertSuccess}>{msg}</p> : null}
      {err ? <p className={alertError}>{err}</p> : null}

      <div className={tableShell}>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#FAFBFC] text-[10px] font-bold uppercase tracking-wide text-[#64748B] dark:bg-[#161821]">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Contacto</th>
              <th className="px-4 py-3">ID en tu sistema</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E8EAEF] dark:divide-[#2A2F3F]">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748B]">
                  No hay clientes. Crea uno o carga la plantilla Excel.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="bg-white dark:bg-[#1A1D29]">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">{c.name}</p>
                    {c.legalName && c.legalName !== c.name ? (
                      <p className="text-xs text-[#64748B]">{c.legalName}</p>
                    ) : null}
                    {c.city || c.countryCode ? (
                      <p className="text-xs text-[#94A3B8]">
                        {[c.city, c.countryCode].filter(Boolean).join(', ')}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#475569] dark:text-[#CBD5E1]">
                    {c.taxIdType ? CLIENT_TAX_ID_LABELS[c.taxIdType as ClientTaxIdType] ?? c.taxIdType : '—'}
                    {c.taxId ? <span className="mt-0.5 block font-mono">{c.taxId}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.email ? <p>{c.email}</p> : null}
                    {c.phone ? <p className="text-[#64748B]">{c.phone}</p> : null}
                    {!c.email && !c.phone ? '—' : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{c.externalId ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                        c.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                          : 'bg-[#F1F5F9] text-[#64748B]',
                      )}
                    >
                      {c.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openEdit(c)} className={linkAccent}>
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void copyText(c.id, c.id)}
                        className="text-xs font-semibold text-[#64748B] hover:underline"
                      >
                        {copied === c.id ? 'Copiado' : 'ID'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ClientFormModal
        open={modalOpen}
        editing={Boolean(editing)}
        editingClientId={editing?.id ?? null}
        editingClientName={editing?.name ?? null}
        saving={saving}
        form={form}
        onChange={patchForm}
        onClose={() => setModalOpen(false)}
        onSave={() => void saveClient()}
      />
    </div>
  )
}
