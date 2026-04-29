'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DEFAULT_OUTREACH_COLD_EMAIL_MARKDOWN } from '@/lib/outreach-cold-email-body'
import { readApiResult } from '@/lib/read-api-result'
import { cn } from '@/lib/utils'

function Badge({
  variant,
  children,
}: {
  variant: 'required' | 'optional' | 'ok' | 'warn'
  children: React.ReactNode
}) {
  const styles =
    variant === 'required'
      ? 'bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200'
      : variant === 'optional'
        ? 'bg-[#F1F5F9] text-[#64748B] dark:bg-[#252936] dark:text-[#94A3B8]'
        : variant === 'ok'
          ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'
          : 'bg-amber-100 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        styles,
      )}
    >
      {children}
    </span>
  )
}

function Section({
  title,
  badge,
  description,
  defaultOpen,
  children,
}: {
  title: string
  badge: React.ReactNode
  description: React.ReactNode
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      className="rounded-2xl border border-[#E8EAEF] bg-white p-4 open:bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">{title}</p>
            {badge}
          </div>
          <div className="mt-1 text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">{description}</div>
        </div>
        <span className="mt-0.5 shrink-0 text-[#94A3B8]">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </summary>
      <div className="mt-4 border-t border-[#E8EAEF] pt-4 dark:border-[#2A2F3F]">{children}</div>
    </details>
  )
}

export function ConnectorsForm({
  flowId,
  resendConnected,
  flowName,
  initialOutreachBody,
  initialOutreachCta,
  workspaceOutreachBody,
  workspaceOutreachCta,
  initialWebhooks,
}: {
  flowId: string
  resendConnected: boolean
  flowName: string
  initialOutreachBody: string | null
  initialOutreachCta: string | null
  workspaceOutreachBody: string | null
  workspaceOutreachCta: string | null
  initialWebhooks: Array<{
    id: string
    url: string
    active: boolean
    createdAt: string | Date
    hasSecret: boolean
  }>
}) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [outreachMd, setOutreachMd] = useState(initialOutreachBody ?? '')
  const [outreachCta, setOutreachCta] = useState(initialOutreachCta ?? '')
  const [outreachBusy, setOutreachBusy] = useState(false)
  const [outreachErr, setOutreachErr] = useState<string | null>(null)
  const [outreachOk, setOutreachOk] = useState<string | null>(null)

  const [webhooksState, setWebhooksState] = useState(initialWebhooks)
  const [hooksBusy, setHooksBusy] = useState(false)
  const [hooksErr, setHooksErr] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    setOutreachMd(initialOutreachBody ?? '')
    setOutreachCta(initialOutreachCta ?? '')
    setWebhooksState(initialWebhooks)
  }, [flowId, initialOutreachBody, initialOutreachCta, initialWebhooks])

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
      const r = await readApiResult<{ webhook: (typeof initialWebhooks)[number] }>(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setUrl('')
      setSecret('')
      setWebhooksState((prev) => [r.data.webhook, ...prev])
    } catch {
      setErr('No se pudo guardar. Revisa la URL e inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const toggleWebhook = async (id: string) => {
    setHooksErr(null)
    setHooksBusy(true)
    try {
      const current = webhooksState.find((w) => w.id === id)
      if (!current) return
      const res = await fetch(`/api/flows/${flowId}/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !current.active }),
      })
      const r = await readApiResult<{ webhook: (typeof initialWebhooks)[number] }>(res)
      if (!r.ok) {
        setHooksErr(r.message)
        return
      }
      setWebhooksState((prev) => prev.map((w) => (w.id === id ? r.data.webhook : w)))
    } finally {
      setHooksBusy(false)
    }
  }

  const deleteWebhook = async (id: string) => {
    setHooksErr(null)
    setHooksBusy(true)
    try {
      const res = await fetch(`/api/flows/${flowId}/webhooks/${id}`, { method: 'DELETE' })
      if (res.status === 204) {
        setWebhooksState((prev) => prev.filter((w) => w.id !== id))
        setConfirmDeleteId(null)
        return
      }
      const r = await readApiResult(res)
      if (!r.ok) setHooksErr(r.message)
    } finally {
      setHooksBusy(false)
    }
  }

  const saveOutreachTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    setOutreachErr(null)
    setOutreachOk(null)
    setOutreachBusy(true)
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreachColdEmailBodyMarkdown: outreachMd.trim() === '' ? null : outreachMd,
          outreachColdEmailCtaLabel: outreachCta.trim() === '' ? null : outreachCta.trim(),
        }),
      })
      const r = await readApiResult<{ flow: unknown }>(res)
      if (!r.ok) {
        setOutreachErr(r.message)
        return
      }
      setOutreachOk('Guardado.')
      router.refresh()
    } finally {
      setOutreachBusy(false)
    }
  }

  const inheritWorkspaceTemplate = async () => {
    setOutreachErr(null)
    setOutreachOk(null)
    setOutreachBusy(true)
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outreachColdEmailBodyMarkdown: null,
          outreachColdEmailCtaLabel: null,
        }),
      })
      const r = await readApiResult<{ flow: unknown }>(res)
      if (!r.ok) {
        setOutreachErr(r.message)
        return
      }
      setOutreachMd('')
      setOutreachCta('')
      setOutreachOk('Listo: este flow vuelve a heredar el template del workspace.')
      router.refresh()
    } finally {
      setOutreachBusy(false)
    }
  }

  const emailsReady = resendConnected
  const templateCustomized = Boolean(outreachMd.trim() || outreachCta.trim())

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 dark:border-[#2A2F3F] dark:bg-[#161821]">
        <p className="text-xs font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Resumen</p>
        <ul className="mt-2 space-y-1.5 text-xs text-[#64748B] dark:text-[#94A3B8]">
          <li className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">Enviar emails (Outreach)</span>
            {emailsReady ? <Badge variant="ok">Listo</Badge> : <Badge variant="warn">Falta conectar Resend</Badge>}
            {!emailsReady ? (
              <Link href="/dashboard/settings/integrations" className="font-semibold text-[#6B4DD4] hover:underline">
                Ir a Integraciones
              </Link>
            ) : null}
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">Plantilla de cold outreach</span>
            {templateCustomized ? <Badge variant="ok">Personalizada</Badge> : <Badge variant="optional">Heredando</Badge>}
            <span className="text-[#94A3B8]">({flowName})</span>
          </li>
          <li className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">Webhooks</span>
            <Badge variant="optional">Opcional</Badge>
            <span className="text-[#94A3B8]">POST al completar sesión</span>
          </li>
        </ul>
      </div>

      <Section
        title="Resend (workspace)"
        badge={<Badge variant="required">Requerido para emails</Badge>}
        defaultOpen={!resendConnected}
        description={
          <>
            La API key se configura una sola vez en{' '}
            <Link href="/dashboard/settings/integrations" className="font-semibold text-[#6B4DD4] hover:underline">
              Configuración → Integraciones
            </Link>
            . Sin Resend, no podrás enviar outreach por correo (el flow puede funcionar igual).
          </>
        }
      >
        <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
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
      </Section>

      <Section
        title="Cold outreach (este flow)"
        badge={<Badge variant="optional">Opcional</Badge>}
        description={
          <>
            Personaliza el correo frío cuando enviás Outreach asociado a <span className="font-semibold">{flowName}</span>
            . Si lo dejas vacío, Dilo usa la plantilla del workspace en{' '}
            <Link href="/dashboard/settings/organization" className="font-semibold text-[#6B4DD4] hover:underline">
              Organización
            </Link>
            .
          </>
        }
      >
        <p className="text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
          Párrafos separados por línea en blanco; negrita con{' '}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">**texto**</code>; placeholders{' '}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">{'{{recipient}}'}</code>,{' '}
          <code className="rounded bg-black/5 px-1 dark:bg-white/10">{'{{recipient_full}}'}</code>.
        </p>
        <form onSubmit={(e) => void saveOutreachTemplate(e)} className="mt-4 space-y-3">
          <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Cuerpo (markdown)
            <textarea
              value={outreachMd}
              onChange={(e) => setOutreachMd(e.target.value)}
              rows={10}
              maxLength={12000}
              placeholder="Vacío = heredar plantilla del workspace"
              className="mt-1 w-full resize-y rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2.5 font-mono text-[13px] leading-relaxed text-[#1A1A1A] dark:border-[#2A2F3F] dark:bg-[#151828] dark:text-[#F8F9FB]"
            />
            <span className="mt-1 block text-[10px] text-[#94A3B8]">{outreachMd.length} / 12000</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={outreachBusy}
              onClick={() => setOutreachMd(workspaceOutreachBody ?? '')}
              className="rounded-lg border border-[#E8EAEF] bg-white px-3 py-1.5 text-[11px] font-medium text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:hover:bg-[#252936]"
              title="Carga el template del workspace en el editor (no cambia la herencia)"
            >
              Cargar template del workspace
            </button>
            <button
              type="button"
              disabled={outreachBusy}
              onClick={() => setOutreachMd(DEFAULT_OUTREACH_COLD_EMAIL_MARKDOWN)}
              className="rounded-lg border border-[#E8EAEF] bg-white px-3 py-1.5 text-[11px] font-medium text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:hover:bg-[#252936]"
              title="Inserta la plantilla base de Dilo (hardcodeada)"
            >
              Insertar plantilla base (Dilo)
            </button>
            <button
              type="button"
              disabled={outreachBusy}
              onClick={() => void inheritWorkspaceTemplate()}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200 dark:hover:bg-amber-950/30"
              title="Borra el override del flow (guarda null) para que herede el workspace"
            >
              Volver a heredar (workspace)
            </button>
          </div>
          <label className="block text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
            Texto del botón (CTA)
            <input
              type="text"
              value={outreachCta}
              onChange={(e) => setOutreachCta(e.target.value)}
              maxLength={80}
              placeholder="Vacío = heredar workspace o «Abrir formulario →»"
              className="mt-1 w-full rounded-xl border border-[#E8EAEF] bg-white px-3 py-2.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
            />
          </label>
          <button
            type="button"
            disabled={outreachBusy}
            onClick={() => setOutreachCta(workspaceOutreachCta ?? '')}
            className="rounded-lg border border-[#E8EAEF] bg-white px-3 py-1.5 text-[11px] font-medium text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:hover:bg-[#252936]"
          >
            Cargar CTA del workspace
          </button>
          {outreachErr ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {outreachErr}
            </p>
          ) : null}
          {outreachOk ? (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400" role="status">
              {outreachOk}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={outreachBusy}
            className="w-full rounded-xl bg-[#0f172a] py-2.5 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#334155]"
          >
            {outreachBusy ? 'Guardando…' : 'Guardar plantilla del flow'}
          </button>
        </form>
      </Section>

      <Section
        title="Webhooks"
        badge={<Badge variant="optional">Opcional</Badge>}
        description={
          <>
            Envía un POST JSON cuando un visitante complete el flow (
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">flow.session.completed</code>).
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Webhooks configurados</p>
            {webhooksState.length === 0 ? (
              <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">Todavía no hay webhooks para este flow.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {webhooksState.map((h) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E8EAEF] bg-white px-3 py-3 text-sm dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
                  >
                    <div className="min-w-0">
                      <span className="block break-all font-mono text-xs text-[#374151] dark:text-[#D1D5DB]">
                        {h.url}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                        {h.active ? 'Activo' : 'Inactivo'}
                        {h.hasSecret ? ' · con secreto' : ''}
                      </span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        disabled={hooksBusy}
                        onClick={() => void toggleWebhook(h.id)}
                        className="rounded-lg border border-[#E8EAEF] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#CBD5E1] dark:hover:bg-[#252936]"
                      >
                        {h.active ? 'Pausar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        disabled={hooksBusy}
                        onClick={() => setConfirmDeleteId(h.id)}
                        className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:bg-[#1A1D29] dark:text-red-300 dark:hover:bg-red-950/20"
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {hooksErr ? (
              <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
                {hooksErr}
              </p>
            ) : null}
          </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 dark:border-[#2A2F3F] dark:bg-[#161821]"
        >
          <p className="text-xs leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
            Si defines un secreto, incluiremos la cabecera{' '}
            <code className="rounded bg-black/5 px-1 dark:bg-white/10">X-Dilo-Signature</code> con HMAC-SHA256 del
            cuerpo.
          </p>
          <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
            URL <span className="text-[#94A3B8]">(requerido)</span>
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
            Secreto <span className="text-[#94A3B8]">(opcional)</span>
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
      </Section>

      {confirmDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#E8EAEF] bg-white p-4 shadow-2xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
            <p className="text-sm font-bold text-[#111827] dark:text-[#F8F9FB]">Eliminar webhook</p>
            <p className="mt-2 text-sm text-[#64748B] dark:text-[#94A3B8]">
              ¿Eliminar este webhook? Esta acción no se puede deshacer.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                disabled={hooksBusy}
                onClick={() => setConfirmDeleteId(null)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] disabled:opacity-40 dark:hover:bg-[#252936]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={hooksBusy}
                onClick={() => void deleteWebhook(confirmDeleteId)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
              >
                {hooksBusy ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
