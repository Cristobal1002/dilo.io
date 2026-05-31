'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardDocumentIcon, InformationCircleIcon } from '@heroicons/react/24/outline'
import {
  cardPlain,
  cardSurface,
  dashboardDesc,
  inputField,
  labelField,
  linkAccent,
  selectField,
} from '@/lib/dashboard-ui'
import { pillTabActiveClass, pillTabBaseClass, pillTabInactiveClass } from '@/lib/pill-tab-styles'
import { publicAppOrigin } from '@/lib/public-site'
import { readApiResult } from '@/lib/read-api-result'
import { cn } from '@/lib/utils'

type FlowOption = { id: string; name: string; status: string }
type ClientOption = { id: string; name: string; externalId: string | null; status: string }

type EmbedMode = 'inline' | 'bubble'

function buildSnippet(args: {
  origin: string
  flowId: string
  mode: EmbedMode
  label: string
  height: string
  externalId?: string | null
}) {
  const attrs = [
    `src="${args.origin}/embed.js"`,
    `data-flow="${args.flowId}"`,
    args.externalId ? `data-external-id="${args.externalId}"` : '',
    args.mode === 'bubble' ? 'data-mode="bubble"' : '',
    args.mode === 'bubble' ? `data-label="${args.label.replace(/"/g, '&quot;')}"` : '',
    args.mode === 'inline' ? `data-height="${args.height}"` : '',
  ]
    .filter(Boolean)
    .join('\n  ')

  return `<script\n  ${attrs}\n></script>`
}

function buildPreviewUrl(args: {
  origin: string
  flowId: string
  externalId?: string | null
}) {
  const q = new URLSearchParams({ embed: '1' })
  if (args.externalId) q.set('external_id', args.externalId)
  return `${args.origin}/f/${args.flowId}?${q.toString()}`
}

const STEPS = [
  'Carga tus clientes con la plantilla Excel (columna id_en_tu_sistema).',
  'Publica un flow de soporte y activa el conector de Soporte si quieres casos en la bandeja.',
  'Copia el snippet en tu web o usa la burbuja flotante.',
  'Tu plataforma pasa el id_en_tu_sistema del usuario logueado — Dilo omite la pregunta de empresa.',
]

export default function EmbedConnectionClient() {
  const [flows, setFlows] = useState<FlowOption[]>([])
  const [clients, setClients] = useState<ClientOption[]>([])
  const [flowId, setFlowId] = useState('')
  const [clientId, setClientId] = useState('')
  const [mode, setMode] = useState<EmbedMode>('bubble')
  const [bubbleLabel, setBubbleLabel] = useState('¿Necesitas ayuda?')
  const [height, setHeight] = useState('640px')
  const [copied, setCopied] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const origin = publicAppOrigin()

  const load = useCallback(async () => {
    const [fr, cr] = await Promise.all([fetch('/api/flows'), fetch('/api/clients')])
    const f = await readApiResult<{ flows: FlowOption[] }>(fr)
    const c = await readApiResult<{ clients: ClientOption[] }>(cr)
    if (f.ok) {
      setFlows(f.data.flows)
      const published = f.data.flows.find((x) => x.status === 'published')
      if (published) setFlowId(published.id)
    }
    if (c.ok) {
      setClients(c.data.clients.filter((x) => x.status !== 'inactive'))
      if (c.data.clients[0]) setClientId(c.data.clients[0].id)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const selectedFlow = flows.find((f) => f.id === flowId)
  const selectedClient = clients.find((c) => c.id === clientId)
  const externalId = selectedClient?.externalId ?? null

  const snippet = useMemo(() => {
    if (!flowId) return ''
    return buildSnippet({ origin, flowId, mode, label: bubbleLabel, height, externalId })
  }, [origin, flowId, mode, bubbleLabel, height, externalId])

  const previewUrl = useMemo(() => {
    if (!flowId || selectedFlow?.status !== 'published') return null
    return buildPreviewUrl({ origin, flowId, externalId })
  }, [origin, flowId, externalId, selectedFlow?.status])

  const copySnippet = async () => {
    if (!snippet) return
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const publishedFlows = flows.filter((f) => f.status === 'published')

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold text-foreground">Widget embebido</h2>
        <p className={dashboardDesc}>
          Muestra tu formulario dentro de tu web o dashboard. Tus usuarios no salen de tu producto.
        </p>
      </div>

      <ol className="space-y-3">
        {STEPS.map((body, i) => (
          <li key={body} className="flex gap-3 text-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#9C77F5]/12 text-xs font-bold text-[#6B4DD4]">
              {i + 1}
            </span>
            <span className="leading-relaxed text-muted-foreground">{body}</span>
          </li>
        ))}
      </ol>

      <div className="grid gap-8 xl:grid-cols-2">
        <div className="space-y-6">
          <div className={cn(cardSurface, 'p-5')}>
            <p className="text-sm font-semibold text-foreground">Configuración</p>

            <label className={cn(labelField, 'mt-4 block')}>
              Flow a mostrar
              <select value={flowId} onChange={(e) => setFlowId(e.target.value)} className={cn(selectField, 'mt-1.5')}>
                <option value="">— Elige un flow —</option>
                {publishedFlows.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            {publishedFlows.length === 0 ? (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                No hay flows publicados. Publica uno desde Mis flows.
              </p>
            ) : null}

            <label className={cn(labelField, 'mt-4 block')}>
              Cliente de ejemplo (vista previa)
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={cn(selectField, 'mt-1.5')}
              >
                <option value="">— Sin cliente (formulario genérico) —</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.externalId ? ` · ${c.externalId}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-1 text-[11px] text-[#94A3B8]">
              En producción envías el id_en_tu_sistema del usuario logueado.
            </p>

            <p className={cn(labelField, 'mt-4')}>Formato en pantalla</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  { id: 'bubble' as const, label: 'Burbuja flotante' },
                  { id: 'inline' as const, label: 'Bloque en la página' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setMode(o.id)}
                  className={cn(
                    pillTabBaseClass,
                    mode === o.id ? pillTabActiveClass : pillTabInactiveClass,
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {mode === 'bubble' ? (
              <label className={cn(labelField, 'mt-3 block')}>
                Texto del botón
                <input
                  value={bubbleLabel}
                  onChange={(e) => setBubbleLabel(e.target.value.slice(0, 80))}
                  className={cn(inputField, 'mt-1.5')}
                />
              </label>
            ) : (
              <label className={cn(labelField, 'mt-3 block')}>
                Alto del bloque
                <input
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="640px"
                  className={cn(inputField, 'mt-1.5')}
                />
              </label>
            )}
          </div>

          <div className={cn(cardPlain, 'overflow-hidden p-4')}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Código para tu web</p>
              <button
                type="button"
                disabled={!snippet}
                onClick={() => void copySnippet()}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#E8EAEF] px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-[#F8F9FB] disabled:opacity-40 dark:border-[#2A2F3F] dark:hover:bg-[#252936]"
              >
                <ClipboardDocumentIcon className="h-4 w-4" />
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
            <pre className="mt-3 overflow-x-auto rounded-xl bg-[#0f172a] p-3 text-[11px] leading-relaxed text-[#E2E8F0]">
              {snippet || 'Elige un flow publicado para generar el código.'}
            </pre>
          </div>

          <button type="button" onClick={() => setShowAdvanced((v) => !v)} className={linkAccent}>
            {showAdvanced ? 'Ocultar' : 'Mostrar'} opciones para desarrolladores
          </button>

          {showAdvanced ? (
            <div className="rounded-2xl border border-dashed border-[#9C77F5]/30 bg-[#F3EEFF]/40 p-4 dark:bg-[#252936]/40">
              <div className="flex gap-2">
                <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#9C77F5]" aria-hidden />
                <div className="min-w-0 space-y-2 text-xs leading-relaxed text-muted-foreground">
                  <p>Si el tenant cambia en runtime, llama:</p>
                  <code className="block overflow-x-auto rounded-lg bg-black/5 px-2 py-1.5 font-mono text-[11px] dark:bg-white/10">
                    DiloEmbed.setContext({'{ externalId: "..." }'})
                  </code>
                  <p>o genera un token con:</p>
                  <code className="block overflow-x-auto rounded-lg bg-black/5 px-2 py-1.5 font-mono text-[11px] dark:bg-white/10">
                    POST /api/embed/context
                  </code>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className={cn(cardSurface, 'p-4')}>
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vista previa</p>
          {previewUrl && externalId ? (
            <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-300">
              Empresa reconocida — no se pregunta «¿cuál es tu empresa?»
            </p>
          ) : null}

          {!previewUrl ? (
            <div className="mt-6 flex min-h-[320px] items-center justify-center rounded-xl border border-dashed border-[#CBD5E1] p-6 text-center text-sm text-muted-foreground dark:border-[#2A2F3F]">
              Publica un flow y selecciónalo arriba.
            </div>
          ) : (
            <div className="mt-4 overflow-hidden rounded-xl border border-[#E8EAEF] bg-white shadow-sm dark:border-[#2A2F3F]">
              <iframe
                title="Vista previa embed Dilo"
                src={previewUrl}
                className="h-[min(520px,70vh)] w-full border-0"
                loading="lazy"
              />
            </div>
          )}

          {previewUrl ? (
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className={cn(linkAccent, 'mt-3 inline-block')}>
              Abrir en pestaña nueva →
            </a>
          ) : null}
        </div>
      </div>
    </div>
  )
}
