'use client'

import { useParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'
import type { SupportClientApprovalAction } from '@/lib/support'

type Preview = {
  clientApprovalStatus: string
  caseNumber: number
  subject: string
  description: string | null
  resolutionNotes: string | null
  typeLabel: string
  clientCompany: string | null
  requesterName: string | null
  hoursSpent: number | null
  dueAt: string | null
  requestedAt: string
  organizationName: string
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export default function SupportReviewPage() {
  const { token } = useParams<{ token: string }>()
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [feedback, setFeedback] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const res = await fetch(`/api/support/review/${token}`)
    const r = await readApiResult<Preview>(res)
    if (r.ok) setPreview(r.data)
    else setError(r.message)
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  async function respond(action: SupportClientApprovalAction) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/support/review/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          feedback: action === 'changes_requested' ? feedback : undefined,
        }),
      })
      const r = await readApiResult(res)
      if (!r.ok) {
        setError(r.message)
        return
      }
      const labels: Record<SupportClientApprovalAction, string> = {
        approved: 'Gracias. Marcaste esta solicitud como aprobada.',
        cancelled: 'Solicitud cancelada. Tu proveedor fue notificado.',
        changes_requested: 'Enviaste tu pedido de ajustes. Te contactarán pronto.',
      }
      setDone(labels[action])
    } finally {
      setBusy(false)
    }
  }

  if (!preview && !error) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-[#64748B]">
        Cargando…
      </main>
    )
  }

  if (error && !preview) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </main>
    )
  }

  if (done) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-[#111827]">Listo</p>
        <p className="mt-2 text-sm text-[#64748B]">{done}</p>
      </main>
    )
  }

  if (!preview) return null

  if (preview.clientApprovalStatus !== 'pending') {
    const doneLabels: Record<string, string> = {
      approved: 'Esta solicitud ya fue aprobada.',
      cancelled: 'Esta solicitud fue cancelada.',
      changes_requested: 'Ya enviaste un pedido de ajustes. Tu proveedor te contactará.',
    }
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-lg font-semibold text-[#111827]">Solicitud #{preview.caseNumber}</p>
        <p className="mt-2 text-sm text-[#64748B]">
          {doneLabels[preview.clientApprovalStatus] ?? 'Este enlace ya no está activo.'}
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9C77F5]">
        {preview.organizationName}
      </p>
      <h1 className="mt-1 text-xl font-bold text-[#111827]">
        Revisión solicitud #{preview.caseNumber}
      </h1>
      <p className="mt-1 text-sm text-[#64748B]">{preview.subject}</p>

      <div className="mt-6 space-y-4 rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 text-sm">
        <p>
          <span className="text-[#94A3B8]">Solicitado:</span> {formatDate(preview.requestedAt)}
        </p>
        {preview.dueAt ? (
          <p>
            <span className="text-[#94A3B8]">Entrega comprometida:</span> {formatDate(preview.dueAt)}
          </p>
        ) : null}
        {preview.hoursSpent != null && preview.hoursSpent > 0 ? (
          <p>
            <span className="text-[#94A3B8]">Tiempo dedicado:</span> {preview.hoursSpent} h
          </p>
        ) : null}
        <p>
          <span className="text-[#94A3B8]">Tipo:</span> {preview.typeLabel}
        </p>
        {preview.resolutionNotes ? (
          <div className="border-t border-[#E8EAEF] pt-3">
            <p className="text-xs font-semibold text-[#64748B]">Qué se entregó</p>
            <p className="mt-1 max-h-none whitespace-pre-wrap wrap-break-word text-[#374151]">
              {preview.resolutionNotes}
            </p>
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-sm text-[#64748B]">
        Confirma si el trabajo está bien, pide ajustes o cancela la solicitud.
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void respond('approved')}
          className="w-full rounded-xl bg-[#7C3AED] py-3 text-sm font-semibold text-white disabled:opacity-50"
        >
          Aprobar y cerrar
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void respond('cancelled')}
          className="w-full rounded-xl border border-[#E8EAEF] py-3 text-sm font-semibold text-[#64748B]"
        >
          Cancelar solicitud
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-[#E8EAEF] p-4">
        <p className="text-xs font-semibold text-[#374151]">Solicitar ajustes</p>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows={3}
          placeholder="Describe qué falta o qué cambiar…"
          className="mt-2 w-full rounded-lg border border-[#E8EAEF] px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={busy || !feedback.trim()}
          onClick={() => void respond('changes_requested')}
          className="mt-2 w-full rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
        >
          Enviar pedido de ajustes
        </button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </main>
  )
}
