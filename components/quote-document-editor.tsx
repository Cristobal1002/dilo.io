'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'
import {
  calculateQuoteTotals,
  formatQuoteMoney,
  lineItemTotal,
  newQuoteLineItem,
  QUOTE_STATUSES,
  QUOTE_STATUS_LABEL,
  type QuoteLineItem,
  type QuoteStatus,
} from '@/lib/quotes'

type OrgProfile = {
  name: string
  logoUrl: string | null
  legalName: string | null
  taxId: string | null
  billingEmail: string | null
  billingPhone: string | null
  billingAddress: string | null
  billingCity: string | null
  quotePrefix: string | null
}

type Quote = {
  id: string
  quoteNumber: number
  status: string
  clientName: string | null
  clientTaxId: string | null
  clientPhone: string | null
  clientEmail: string | null
  issueDate: string
  dueDate: string | null
  lineItems: QuoteLineItem[]
  aiPrompt: string | null
  notes: string | null
  globalDiscountPercent: number
}

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return ''
  return d.toISOString().slice(0, 10)
}

const inputClass =
  'w-full rounded-lg border border-[#E8EAEF] bg-white px-2.5 py-2 text-sm outline-none focus:border-[#9C77F5]/50 focus:ring-2 focus:ring-[#9C77F5]/20 dark:border-[#2A2F3F] dark:bg-[#252936]'

export function QuoteDocumentEditor({ quoteId }: { quoteId: string }) {
  const router = useRouter()
  const [org, setOrg] = useState<OrgProfile | null>(null)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [orgRes, quoteRes] = await Promise.all([
      fetch('/api/settings/organization'),
      fetch(`/api/quotes/${quoteId}`),
    ])
    const orgParsed = await readApiResult<OrgProfile>(orgRes)
    const quoteParsed = await readApiResult<{ quote: Quote }>(quoteRes)
    if (orgParsed.ok) setOrg(orgParsed.data)
    if (quoteParsed.ok) setQuote(quoteParsed.data.quote)
    else setMsg(quoteParsed.message)
    setLoading(false)
  }, [quoteId])

  useEffect(() => {
    void load()
  }, [load])

  const totals = useMemo(
    () =>
      quote
        ? calculateQuoteTotals(quote.lineItems, quote.globalDiscountPercent)
        : null,
    [quote],
  )

  const printDoc = () => {
    if (!quote) {
      window.print()
      return
    }
    const prefix = org?.quotePrefix?.trim() || 'COT'
    const date = toDateInput(quote.issueDate) || 'sin-fecha'
    const filename = `${prefix}-${quote.quoteNumber}_${date}`
    const prev = document.title
    document.title = filename
    try {
      window.print()
    } finally {
      document.title = prev
    }
  }

  const save = async () => {
    if (!quote) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: quote.status,
          clientName: quote.clientName,
          clientTaxId: quote.clientTaxId,
          clientPhone: quote.clientPhone,
          clientEmail: quote.clientEmail,
          issueDate: quote.issueDate,
          dueDate: quote.dueDate,
          lineItems: quote.lineItems,
          aiPrompt: quote.aiPrompt,
          notes: quote.notes,
          globalDiscountPercent: quote.globalDiscountPercent,
        }),
      })
      const r = await readApiResult<{ quote: Quote }>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      setQuote(r.data.quote)
      setMsg('Cotización guardada.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!quote) return
    const ok = window.confirm('¿Eliminar esta cotización? Esto no se puede deshacer.')
    if (!ok) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' })
      const r = await readApiResult<{ deleted: boolean }>(res)
      if (!r.ok) {
        setMsg(r.message)
        return
      }
      router.push('/dashboard/quotes')
    } finally {
      setSaving(false)
    }
  }

  const updateLine = (id: string, patch: Partial<QuoteLineItem>) => {
    setQuote((q) =>
      q
        ? {
            ...q,
            lineItems: q.lineItems.map((row) => (row.id === id ? { ...row, ...patch } : row)),
          }
        : q,
    )
  }

  const removeLine = (id: string) => {
    setQuote((q) =>
      q ? { ...q, lineItems: q.lineItems.filter((row) => row.id !== id) } : q,
    )
  }

  const addLine = () => {
    setQuote((q) => (q ? { ...q, lineItems: [...q.lineItems, newQuoteLineItem()] } : q))
  }

  if (loading || !quote) {
    return <p className="text-sm text-[#64748B]">{loading ? 'Cargando cotización…' : msg ?? 'No encontrada'}</p>
  }

  const displayName = org?.legalName?.trim() || org?.name || 'Tu empresa'
  const prefix = org?.quotePrefix?.trim() || 'COT'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href="/dashboard/quotes"
          className="text-sm font-medium text-[#6B4DD4] hover:underline dark:text-[#D4C4FC]"
        >
          ← Cotizaciones
        </Link>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void remove()}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 disabled:opacity-50 dark:border-red-900/40 dark:bg-[#1A1D29] dark:text-red-300"
          >
            Eliminar
          </button>
          <button
            type="button"
            onClick={printDoc}
            className="rounded-xl border border-[#E8EAEF] px-4 py-2 text-sm font-medium dark:border-[#2A2F3F]"
          >
            Imprimir / PDF
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void save()}
            className="rounded-xl bg-[#9C77F5] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>

      {msg ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm print:hidden ${msg.includes('guardada') ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}
        >
          {msg}
        </p>
      ) : null}

      <article className="quote-print-area quote-print-doc rounded-2xl border border-[#E8EAEF] bg-white p-6 shadow-sm dark:border-[#2A2F3F] dark:bg-[#1A1D29] print:border-0 print:shadow-none">
        <header className="quote-print-header flex flex-wrap items-start justify-between gap-6 border-b border-[#E8EAEF] pb-6 dark:border-[#2A2F3F]">
          <div className="flex min-w-[200px] items-start gap-4">
            {org?.logoUrl ? (
              <Image
                src={org.logoUrl}
                alt=""
                width={120}
                height={48}
                className="h-12 w-auto max-w-[140px] object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-[#9C77F5]/10 text-xs font-bold text-[#6B4DD4]">
                {displayName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="text-sm text-[#374151] dark:text-[#D1D5DB]">
              <p className="font-semibold text-[#111827] dark:text-[#F8F9FB]">{displayName}</p>
              {org?.taxId ? <p>NIT: {org.taxId}</p> : null}
              {org?.billingEmail ? <p>{org.billingEmail}</p> : null}
              {org?.billingPhone ? <p>{org.billingPhone}</p> : null}
              {org?.billingAddress ? (
                <p>
                  {org.billingAddress}
                  {org.billingCity ? `, ${org.billingCity}` : ''}
                </p>
              ) : null}
              {!org?.taxId && !org?.billingEmail ? (
                <Link href="/dashboard/account?tab=organization" className="text-[#6B4DD4] underline print:hidden">
                  Completar datos en Organización
                </Link>
              ) : null}
            </div>
          </div>
          <div className="quote-print-title text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
              Documento comercial
            </p>
            <p className="mt-1 text-2xl font-bold text-[#0d9488]">Cotización</p>
            <p className="mt-1 text-sm text-[#64748B]">No. {prefix}-{quote.quoteNumber}</p>
            <label className="mt-2 block text-[10px] font-medium text-[#94A3B8] print:hidden">
              Estado
              <select
                value={quote.status}
                onChange={(e) => setQuote({ ...quote, status: e.target.value as QuoteStatus })}
                className={`${inputClass} mt-1`}
              >
                {QUOTE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {QUOTE_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </header>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="quote-print-section-label block text-[10px] font-semibold uppercase text-[#94A3B8]">
              Contacto
            </label>
            <div className="quote-print-field">
              <input
                className={`${inputClass} print:hidden`}
                placeholder="Nombre o empresa cliente"
                value={quote.clientName ?? ''}
                onChange={(e) => setQuote({ ...quote, clientName: e.target.value })}
              />
              <div className="hidden print:block quote-print-text">{quote.clientName ?? ''}</div>
            </div>
            <div className="quote-print-field">
              <input
                className={`${inputClass} print:hidden`}
                placeholder="Identificación / NIT"
                value={quote.clientTaxId ?? ''}
                onChange={(e) => setQuote({ ...quote, clientTaxId: e.target.value })}
              />
              <div className="hidden print:block quote-print-text">{quote.clientTaxId ?? ''}</div>
            </div>
            <div className="quote-print-field">
              <input
                className={`${inputClass} print:hidden`}
                placeholder="Teléfono"
                value={quote.clientPhone ?? ''}
                onChange={(e) => setQuote({ ...quote, clientPhone: e.target.value })}
              />
              <div className="hidden print:block quote-print-text">{quote.clientPhone ?? ''}</div>
            </div>
            <div className="quote-print-field">
              <input
                className={`${inputClass} print:hidden`}
                placeholder="Email"
                value={quote.clientEmail ?? ''}
                onChange={(e) => setQuote({ ...quote, clientEmail: e.target.value })}
              />
              <div className="hidden print:block quote-print-text">{quote.clientEmail ?? ''}</div>
            </div>
          </div>
          <div className="space-y-2">
            <label className="quote-print-section-label block text-[10px] font-semibold uppercase text-[#94A3B8]">
              Fechas
            </label>
            <div className="quote-print-dates grid gap-2 sm:grid-cols-2">
              <label className="block text-xs text-[#64748B]">
                Fecha
                <input
                  type="date"
                  className={`${inputClass} mt-1 print:hidden`}
                  value={toDateInput(quote.issueDate)}
                  onChange={(e) =>
                    setQuote({
                      ...quote,
                      issueDate: e.target.value
                        ? new Date(e.target.value).toISOString()
                        : quote.issueDate,
                    })
                  }
                />
                <div className="mt-1 hidden print:block quote-print-text">
                  {new Intl.DateTimeFormat('es', { dateStyle: 'short' }).format(
                    new Date(quote.issueDate),
                  )}
                </div>
              </label>
              <label className="block text-xs text-[#64748B]">
                Vencimiento
                <input
                  type="date"
                  className={`${inputClass} mt-1 print:hidden`}
                  value={toDateInput(quote.dueDate)}
                  onChange={(e) =>
                    setQuote({
                      ...quote,
                      dueDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                    })
                  }
                />
                <div className="mt-1 hidden print:block quote-print-text">
                  {quote.dueDate
                    ? new Intl.DateTimeFormat('es', { dateStyle: 'short' }).format(
                        new Date(quote.dueDate),
                      )
                    : ''}
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto print:overflow-visible">
          <table className="quote-print-table w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-[#0d9488]/30 text-left text-[10px] font-semibold uppercase text-[#64748B]">
                <th className="px-2 py-2">Ítem</th>
                <th className="px-2 py-2">Ref.</th>
                <th className="px-2 py-2 w-24">Precio</th>
                <th className="px-2 py-2 w-16">Desc %</th>
                <th className="px-2 py-2 w-16">IVA %</th>
                <th className="px-2 py-2">Descripción</th>
                <th className="px-2 py-2 w-16">Cant.</th>
                <th className="px-2 py-2 w-28 text-right">Total</th>
                <th className="w-8 print:hidden" />
              </tr>
            </thead>
            <tbody>
              {quote.lineItems.map((row) => (
                <tr key={row.id} className="border-b border-[#E8EAEF]/80 dark:border-[#2A2F3F]/80">
                  <td className="px-2 py-2 align-top">
                    <input
                      className={`${inputClass} print:hidden`}
                      value={row.itemLabel}
                      onChange={(e) => updateLine(row.id, { itemLabel: e.target.value })}
                    />
                    <div className="hidden print:block quote-print-text">{row.itemLabel}</div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      className={`${inputClass} print:hidden`}
                      value={row.reference}
                      onChange={(e) => updateLine(row.id, { reference: e.target.value })}
                    />
                    <div className="hidden print:block quote-print-text">{row.reference}</div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      className={`${inputClass} print:hidden`}
                      value={row.unitPrice || ''}
                      onChange={(e) =>
                        updateLine(row.id, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <div className="hidden print:block quote-print-text quote-print-num">
                      {formatQuoteMoney(row.unitPrice)}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={`${inputClass} print:hidden`}
                      value={row.discountPercent || ''}
                      onChange={(e) =>
                        updateLine(row.id, { discountPercent: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <div className="hidden print:block quote-print-text quote-print-num">
                      {row.discountPercent ? `${row.discountPercent}%` : ''}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className={`${inputClass} print:hidden`}
                      value={row.taxPercent || ''}
                      onChange={(e) =>
                        updateLine(row.id, { taxPercent: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <div className="hidden print:block quote-print-text quote-print-num">
                      {row.taxPercent ? `${row.taxPercent}%` : ''}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <textarea
                      rows={2}
                      className={`${inputClass} resize-y min-h-[52px] print:hidden`}
                      value={row.description}
                      onChange={(e) => updateLine(row.id, { description: e.target.value })}
                    />
                    <div className="hidden print:block quote-print-text quote-print-desc">
                      {row.description}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top">
                    <input
                      type="number"
                      min={0}
                      className={`${inputClass} print:hidden`}
                      value={row.quantity}
                      onChange={(e) =>
                        updateLine(row.id, { quantity: parseFloat(e.target.value) || 0 })
                      }
                    />
                    <div className="hidden print:block quote-print-text quote-print-num">
                      {row.quantity}
                    </div>
                  </td>
                  <td className="px-2 py-2 align-top text-right font-medium tabular-nums">
                    {formatQuoteMoney(lineItemTotal(row))}
                  </td>
                  <td className="px-1 py-2 align-top print:hidden">
                    <button
                      type="button"
                      onClick={() => removeLine(row.id)}
                      className="text-[#94A3B8] hover:text-red-600"
                      aria-label="Eliminar línea"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 text-sm font-semibold text-[#0d9488] print:hidden"
          >
            + Agregar línea
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="flex-1 space-y-4">
            <div className="print:hidden">
              <label className="text-[10px] font-semibold uppercase text-[#94A3B8]">
                Prompt de IA (interno)
              </label>
              <p className="mt-1 text-[11px] text-[#64748B]">
                Tarifas, paquetes, IVA, alcance… Se usa al generar con IA; no aparece en el PDF.
              </p>
              <textarea
                rows={4}
                className={`${inputClass} mt-1`}
                value={quote.aiPrompt ?? ''}
                onChange={(e) => setQuote({ ...quote, aiPrompt: e.target.value })}
                placeholder="Ej. Incluir 3 meses de soporte, desglosar diseño y desarrollo, IVA 19%…"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold uppercase text-[#94A3B8]">Notas</label>
              <p className="mt-1 text-[11px] text-[#64748B] print:hidden">
                Texto visible para el cliente en la cotización impresa.
              </p>
              <textarea
                rows={4}
                className={`${inputClass} mt-1 print:hidden`}
                value={quote.notes ?? ''}
                onChange={(e) => setQuote({ ...quote, notes: e.target.value })}
              />
              <div className="mt-2 hidden print:block quote-print-text quote-print-notes">
                {quote.notes ?? ''}
              </div>
            </div>
          </div>
          {totals ? (
            <div className="w-full max-w-xs space-y-2 text-sm sm:text-right">
              <div className="flex justify-between gap-4">
                <span className="text-[#64748B]">Subtotal</span>
                <span className="tabular-nums">{formatQuoteMoney(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-[#64748B]">Descuento líneas</span>
                <span className="tabular-nums">-{formatQuoteMoney(totals.lineDiscount)}</span>
              </div>
              <label className="flex items-center justify-between gap-4 print:hidden">
                <span className="text-[#64748B]">Desc. global %</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className={`${inputClass} w-20`}
                  value={quote.globalDiscountPercent || ''}
                  onChange={(e) =>
                    setQuote({
                      ...quote,
                      globalDiscountPercent: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </label>
              {quote.globalDiscountPercent > 0 ? (
                <div className="flex justify-between gap-4">
                  <span className="text-[#64748B]">Desc. global</span>
                  <span className="tabular-nums">-{formatQuoteMoney(totals.globalDiscount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <span className="text-[#64748B]">Impuestos</span>
                <span className="tabular-nums">{formatQuoteMoney(totals.tax)}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-[#E8EAEF] pt-2 text-lg font-bold dark:border-[#2A2F3F]">
                <span>Total</span>
                <span className="tabular-nums text-[#0d9488]">{formatQuoteMoney(totals.total)}</span>
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  )
}
