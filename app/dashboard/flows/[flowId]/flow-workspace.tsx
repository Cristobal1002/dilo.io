'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  MoonIcon,
  PencilSquareIcon,
  PuzzlePieceIcon,
  SparklesIcon,
  Squares2X2Icon,
  SunIcon,
  SwatchIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { SavingSpinner } from '@/components/spinners'
import FlowEditor from './flow-editor'

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto corto',
  long_text: 'Texto largo',
  select: 'Selección única',
  multi_select: 'Selección múltiple',
  email: 'Email',
  phone: 'Teléfono',
  number: 'Número',
  rating: 'Calificación',
  yes_no: 'Sí / No',
  file: 'Archivo',
}

export type FlowWorkspaceStep = {
  id: string
  order: number
  type: string
  question: string
  hint: string | null
  variableName: string
  required: boolean
  options: { id: string; label: string; emoji: string | null; value: string; order: number }[]
  fileConfig: unknown
}

/** Campos opcionales en `flows.settings` (JSON) para la portada pública. */
export type FlowPresentationSettings = {
  language?: string
  completion_message?: string
  tagline?: string
  logo_url?: string
  presentation_label?: string
  tone_pill?: string
  estimated_minutes_min?: number
  estimated_minutes_max?: number
}

export type FlowWorkspaceFlow = {
  id: string
  name: string
  description: string | null
  status: string
  promptOrigin: string | null
  settings: FlowPresentationSettings | Record<string, unknown>
}

type ToolId = 'ia' | 'elements' | 'design' | 'integrations'

const TOOL_IDS = new Set<ToolId>(['ia', 'elements', 'design', 'integrations'])

const TOOLS: { id: ToolId; label: string; Icon: typeof SparklesIcon }[] = [
  { id: 'ia', label: 'Create with IA', Icon: SparklesIcon },
  { id: 'elements', label: 'Forms Elements', Icon: Squares2X2Icon },
  { id: 'design', label: 'Design options', Icon: SwatchIcon },
  { id: 'integrations', label: 'Integrations', Icon: PuzzlePieceIcon },
]

function cn(...a: (string | false | undefined)[]) {
  return a.filter(Boolean).join(' ')
}

function parseTool(raw: string | null): ToolId | null {
  if (!raw || !TOOL_IDS.has(raw as ToolId)) return null
  return raw as ToolId
}

/** Toggle mínimo: track casi imperceptible, activo solo un poco más marcado. */
function DevicePreviewToggle({
  device,
  onChange,
}: {
  device: 'desktop' | 'mobile'
  onChange: (d: 'desktop' | 'mobile') => void
}) {
  const seg = (active: boolean) =>
    cn(
      'rounded-full p-1.5 transition-colors',
      active
        ? 'bg-[#9C77F5]/12 text-[#6B4DD4] dark:bg-[#9C77F5]/20 dark:text-[#D4C4FC]'
        : 'text-[#9CA3AF] hover:text-[#6B7280] dark:text-[#6B7280] dark:hover:text-[#9CA3AF]',
    )

  return (
    <div
      className="inline-flex items-center gap-px rounded-full bg-[#ECEEF2] p-px dark:bg-white/[0.06]"
      role="group"
      aria-label="Dispositivo de vista previa"
    >
      <button
        type="button"
        onClick={() => onChange('desktop')}
        className={seg(device === 'desktop')}
        aria-pressed={device === 'desktop'}
        title="Escritorio"
      >
        <ComputerDesktopIcon className="h-4 w-4" strokeWidth={1.5} />
      </button>
      <button
        type="button"
        onClick={() => onChange('mobile')}
        className={seg(device === 'mobile')}
        aria-pressed={device === 'mobile'}
        title="Móvil"
      >
        <DevicePhoneMobileIcon className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  )
}

/** Blanco alineado con el `main` del shell; solo el mock del chat lleva relieve. */
const workspaceSurface = 'bg-white dark:bg-[#1A1D29]'
const workspaceDivider = 'border-[#E5E7EB] dark:border-[#2A2F3F]'

const THEME_EVENT = 'mordecai-theme-change'

function estimateDurationRange(stepCount: number): { min: number; max: number } {
  if (stepCount <= 0) return { min: 3, max: 8 }
  const min = Math.max(3, Math.round(stepCount * 0.25))
  const max = Math.max(min + 2, Math.round(stepCount * 0.52))
  return { min, max }
}

function parsePresentationSettings(raw: FlowWorkspaceFlow['settings']) {
  const o = raw && typeof raw === 'object' ? (raw as FlowPresentationSettings) : {}
  const defaultTag = 'Conversación guiada, sin formularios largos.'
  return {
    tagline: typeof o.tagline === 'string' && o.tagline.trim() ? o.tagline.trim() : defaultTag,
    logoUrl: typeof o.logo_url === 'string' && /^https?:\/\//.test(o.logo_url) ? o.logo_url : null,
    label: typeof o.presentation_label === 'string' && o.presentation_label.trim()
      ? o.presentation_label.trim()
      : 'PRESENTACIÓN',
    tonePill: typeof o.tone_pill === 'string' && o.tone_pill.trim() ? o.tone_pill.trim() : 'Claro y humano',
    estMin: typeof o.estimated_minutes_min === 'number' ? o.estimated_minutes_min : null,
    estMax: typeof o.estimated_minutes_max === 'number' ? o.estimated_minutes_max : null,
  }
}

function PresentationThemeToggle() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
    window.dispatchEvent(new CustomEvent(THEME_EVENT))
    setIsDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-lg border border-[#E5E7EB] bg-white p-1.5 text-[#6B7280] shadow-sm transition-colors hover:bg-[#F3F4F6] dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#9CA3AF] dark:hover:bg-[#2a3040]"
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
    >
      {isDark ? <SunIcon className="h-4 w-4" strokeWidth={1.5} /> : <MoonIcon className="h-4 w-4" strokeWidth={1.5} />}
    </button>
  )
}

const presentationPill =
  'inline-flex items-center gap-1.5 rounded-full border border-[#9C77F5]/30 bg-white/90 px-3 py-1.5 text-xs font-medium text-[#6B4DD4] shadow-sm dark:border-[#9C77F5]/35 dark:bg-[#1A1D29]/90 dark:text-[#D4C4FC]'

function FlowPresentationPreview({ flow, stepCount }: { flow: FlowWorkspaceFlow; stepCount: number }) {
  const router = useRouter()
  const pres = parsePresentationSettings(flow.settings)
  const derived = estimateDurationRange(stepCount)
  const minM = pres.estMin ?? derived.min
  const maxM = pres.estMax ?? derived.max
  const timeLabel = minM === maxM ? `~${minM} min` : `${minM}–${maxM} min`

  const [editTitle, setEditTitle] = useState(false)
  const [editDesc, setEditDesc] = useState(false)
  const [nameDraft, setNameDraft] = useState(flow.name)
  const [descDraft, setDescDraft] = useState(flow.description ?? '')
  const [saving, setSaving] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const descAreaRef = useRef<HTMLTextAreaElement>(null)
  const skipTitleBlur = useRef(false)
  const skipDescBlur = useRef(false)

  useEffect(() => {
    if (!editTitle) setNameDraft(flow.name)
  }, [flow.name, editTitle])

  useEffect(() => {
    if (!editDesc) setDescDraft(flow.description ?? '')
  }, [flow.description, editDesc])

  useEffect(() => {
    if (editTitle) titleInputRef.current?.focus()
  }, [editTitle])

  useEffect(() => {
    if (editDesc) descAreaRef.current?.focus()
  }, [editDesc])

  const commitTitle = useCallback(async () => {
    if (skipTitleBlur.current) {
      skipTitleBlur.current = false
      return
    }
    const t = nameDraft.trim()
    if (!t) {
      setNameDraft(flow.name)
      setEditTitle(false)
      return
    }
    if (t === flow.name) {
      setEditTitle(false)
      return
    }
    setSaving(true)
    try {
      await fetch(`/api/flows/${flow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: t }),
      })
      setEditTitle(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [flow.id, flow.name, nameDraft, router])

  const commitDesc = useCallback(async () => {
    if (skipDescBlur.current) {
      skipDescBlur.current = false
      return
    }
    const prevNorm = flow.description ?? null
    const nextNorm = descDraft.trim() === '' ? null : descDraft.trim()
    if (nextNorm === prevNorm) {
      setEditDesc(false)
      return
    }
    setSaving(true)
    try {
      await fetch(`/api/flows/${flow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: nextNorm }),
      })
      setEditDesc(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }, [descDraft, flow.description, flow.id, router])

  const startTitleEdit = () => {
    setNameDraft(flow.name)
    setEditTitle(true)
  }

  const startDescEdit = () => {
    setDescDraft(flow.description ?? '')
    setEditDesc(true)
  }

  const titleInteractive =
    'group relative mt-2 w-full max-w-md rounded-xl px-2 py-1 transition-colors hover:bg-[#9C77F5]/8 dark:hover:bg-[#9C77F5]/12'
  const descInteractive =
    'group relative mt-4 w-full max-w-md rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[#9C77F5]/8 dark:hover:bg-[#9C77F5]/12'

  return (
    <div className="relative min-h-[min(62dvh,520px)] w-full bg-[#F4F5F7] px-4 pb-8 pt-5 dark:bg-[#0c0d12]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[#E5E7EB] dark:bg-[#2A2F3F]" aria-hidden />
      <div className="flex justify-end">
        <div className="pointer-events-auto">
          <PresentationThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex max-w-md flex-col items-center text-center">
        {pres.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL de marca configurable en settings
          <img
            src={pres.logoUrl}
            alt=""
            className="mb-3 h-10 w-auto max-w-[220px] object-contain object-center"
          />
        ) : (
          <div className="mb-3 select-none">
            <p className="text-[1.65rem] font-black leading-none tracking-tight">
              <span className="bg-linear-to-r from-[#9C77F5] via-[#8B5CF6] to-[#00d4b0] bg-clip-text text-transparent">
                DILO
              </span>
            </p>
          </div>
        )}

        <p className="mb-6 max-w-sm text-xs leading-snug text-[#6B7280] dark:text-[#9CA3AF]">{pres.tagline}</p>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C77F5]">{pres.label}</p>

        {editTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={nameDraft}
            disabled={saving}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => void commitTitle()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              if (e.key === 'Escape') {
                skipTitleBlur.current = true
                setNameDraft(flow.name)
                setEditTitle(false)
              }
            }}
            maxLength={200}
            className="mt-2 w-full max-w-md rounded-xl border border-[#9C77F5]/45 bg-white px-3 py-2 text-center text-xl font-bold text-[#1A1A1A] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9C77F5]/30 dark:border-[#9C77F5]/40 dark:bg-[#1A1D29] dark:text-[#F8F9FB] sm:text-[1.35rem]"
            aria-label="Título del flow"
          />
        ) : (
          <div className={titleInteractive}>
            <button
              type="button"
              onClick={startTitleEdit}
              disabled={saving}
              className="w-full text-balance text-2xl font-bold leading-tight sm:text-[1.65rem]"
            >
              <span className="bg-linear-to-r from-[#9C77F5] to-[#00d4b0] bg-clip-text text-transparent">{flow.name}</span>
              <span className="sr-only">Editar título</span>
            </button>
            <PencilSquareIcon
              className="pointer-events-none absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9C77F5]/50 opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
        )}

        {editDesc ? (
          <textarea
            ref={descAreaRef}
            value={descDraft}
            disabled={saving}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={() => void commitDesc()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                skipDescBlur.current = true
                setDescDraft(flow.description ?? '')
                setEditDesc(false)
              }
            }}
            maxLength={2000}
            rows={4}
            className="mt-4 w-full max-w-md resize-y rounded-xl border border-[#9C77F5]/40 bg-white px-3 py-2 text-left text-sm leading-relaxed text-[#4B5563] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#9C77F5]/30 dark:border-[#9C77F5]/35 dark:bg-[#1A1D29] dark:text-[#9CA3AF]"
            aria-label="Descripción del flow"
          />
        ) : (
          <div className={descInteractive}>
            <button
              type="button"
              onClick={startDescEdit}
              disabled={saving}
              className="w-full whitespace-pre-wrap text-sm leading-relaxed text-[#4B5563] dark:text-[#9CA3AF]"
            >
              {flow.description ? (
                flow.description
              ) : (
                <span className="italic text-[#9CA3AF]">Añade una descripción breve…</span>
              )}
            </button>
            <PencilSquareIcon
              className="pointer-events-none absolute right-1 top-2 h-4 w-4 text-[#9C77F5]/50 opacity-0 transition-opacity group-hover:opacity-100"
              strokeWidth={1.5}
              aria-hidden
            />
          </div>
        )}

        {saving ? (
          <SavingSpinner className="mt-2 justify-center text-xs" size="xs" />
        ) : (
          <p className="mt-1 text-[10px] text-[#9CA3AF]">Clic en título o descripción para editar</p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className={presentationPill}>
            <ClockIcon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
            {timeLabel}
          </span>
          <span className={presentationPill}>
            <ChatBubbleLeftRightIcon className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={1.5} aria-hidden />
            ~{stepCount} {stepCount === 1 ? 'paso' : 'pasos'}
          </span>
          <span className={presentationPill}>
            <span aria-hidden>🎯</span>
            {pres.tonePill}
          </span>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full max-w-sm cursor-default rounded-full bg-linear-to-r from-[#9C77F5] to-[#7B5BD4] py-3.5 text-sm font-semibold text-white shadow-md shadow-[#9C77F5]/25 opacity-95"
        >
          Empezar ahora
        </button>
        <p className="mt-2 text-[10px] text-[#9CA3AF]">Vista previa · el botón se activará en la versión pública</p>
      </div>
    </div>
  )
}

export default function FlowWorkspace({
  flow,
  steps,
  publicFlowUrl,
}: {
  flow: FlowWorkspaceFlow
  steps: FlowWorkspaceStep[]
  publicFlowUrl: string | null
}) {
  const searchParams = useSearchParams()
  const activeTool = parseTool(searchParams.get('tool'))
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  type PreviewSection = 'presentation' | 'main'
  const [previewSection, setPreviewSection] = useState<PreviewSection>('presentation')
  const [search, setSearch] = useState('')

  const filteredSteps = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return steps
    return steps.filter(
      (s) =>
        s.question.toLowerCase().includes(q) ||
        s.variableName.toLowerCase().includes(q) ||
        (TYPE_LABELS[s.type] ?? s.type).toLowerCase().includes(q),
    )
  }, [steps, search])

  const scrollToStep = (id: string) => {
    document.getElementById(`preview-step-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const flowBasePath = `/dashboard/flows/${flow.id}`

  const sectionTabClass = (id: PreviewSection) =>
    cn(
      'rounded-full border px-3 py-1 text-xs transition-colors',
      previewSection === id
        ? 'border-[#9C77F5]/45 bg-[#9C77F5]/14 font-semibold text-[#552b9e] ring-1 ring-[#9C77F5]/25 dark:border-[#9C77F5]/50 dark:bg-[#9C77F5]/22 dark:text-[#E9D5FF] dark:ring-[#9C77F5]/35'
        : 'border-[#9C77F5]/25 bg-[#9C77F5]/8 font-medium text-[#6B4DD4] hover:border-[#9C77F5]/35 hover:bg-[#9C77F5]/11 dark:border-[#9C77F5]/30 dark:bg-[#9C77F5]/12 dark:text-[#D4C4FC] dark:hover:bg-[#9C77F5]/16',
    )

  /** Altura mínima alineada con el header del shell; puede crecer si hay descripción. */
  const toolBar = cn(
    'shrink-0 flex min-h-16 items-center justify-between gap-3 border-b px-4 py-2',
    workspaceDivider,
    workspaceSurface,
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex min-h-0 flex-1 overflow-hidden rounded-t-none rounded-br-xl rounded-bl-none border-b border-[#E5E7EB] dark:border-[#2A2F3F] shadow-sm',
          workspaceSurface,
        )}
      >
        {activeTool ? (
          <aside
            className={cn(
              'w-[min(100%,380px)] sm:w-[360px] shrink-0 flex flex-col min-h-0 overflow-hidden border-r',
              workspaceDivider,
              workspaceSurface,
            )}
          >
            <div className={toolBar}>
              <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 pr-2 leading-tight">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#9C77F5]">
                  {TOOLS.find((t) => t.id === activeTool)?.label}
                </p>
                <p className="text-xs leading-snug text-[#6B7280] dark:text-[#9CA3AF]">Herramienta del editor</p>
              </div>
              <Link
                href={flowBasePath}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-semibold text-[#6B7280] transition-colors hover:bg-black/4 hover:text-[#9C77F5] dark:text-[#9CA3AF] dark:hover:bg-white/6"
              >
                <XMarkIcon className="h-4 w-4 opacity-70" aria-hidden />
                Cerrar
              </Link>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 text-sm text-[#4B5563] dark:text-[#9CA3AF]">
              {activeTool === 'ia' && (
                <div className="space-y-5">
                  <p className="text-sm leading-snug text-[#1A1A1A] dark:text-[#F8F9FB] font-medium">
                    Este flow salió de un prompt. Aquí verás el origen; más adelante podrás refinar con IA.
                  </p>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] mb-2">
                      Prompt de origen
                    </p>
                    <p className="text-xs sm:text-sm leading-relaxed text-[#374151] dark:text-[#D1D5DB] border-l-2 border-[#9C77F5] pl-3 py-1 max-h-[min(40vh,14rem)] overflow-y-auto scrollbar-hide">
                      {flow.promptOrigin ?? '—'}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/flows/new"
                    className="inline-flex items-center justify-center w-full rounded-xl bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] text-white text-sm font-semibold py-2.5 shadow-md shadow-[#9C77F5]/20 hover:opacity-95"
                  >
                    Nuevo flow con IA
                  </Link>
                </div>
              )}
              {activeTool === 'elements' && (
                <div className="space-y-4">
                  <label className="block text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                    Buscar en pasos
                  </label>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Pregunta, variable, tipo…"
                    className="w-full rounded-xl border border-[#E5E7EB] dark:border-[#2A2F3F] bg-white dark:bg-[#252936] px-3 py-2.5 text-sm text-[#1A1A1A] dark:text-[#F8F9FB] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#9C77F5]/25"
                  />
                  <p className="text-xs leading-relaxed text-[#6B7280] dark:text-[#9CA3AF]">
                    El lienzo muestra la conversación; aquí navegas la estructura (preguntas y tipos).
                  </p>
                  <ul className="space-y-1.5">
                    {filteredSteps.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => scrollToStep(s.id)}
                          className="w-full text-left rounded-xl border border-transparent bg-white/70 dark:bg-[#252936]/60 px-3 py-2.5 shadow-sm ring-1 ring-black/4 dark:ring-white/6 hover:ring-[#9C77F5]/25 hover:bg-white dark:hover:bg-[#2a3040] transition-all"
                        >
                          <span className="text-xs font-semibold text-[#9C77F5]">#{s.order}</span>
                          <span className="block text-[#1A1A1A] dark:text-[#F8F9FB] font-medium line-clamp-2 mt-0.5 text-sm">
                            {s.question}
                          </span>
                          <span className="text-[10px] text-[#9CA3AF] font-mono">{s.variableName}</span>
                          <span className="ml-2 text-[10px] rounded-full bg-[#F3F4F6] dark:bg-[#1f2433] px-2 py-0.5">
                            {TYPE_LABELS[s.type] ?? s.type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {activeTool === 'design' && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">Apariencia del chat público</p>
                  <p className="text-xs leading-relaxed text-[#6B7280] dark:text-[#9CA3AF]">
                    Colores de marca, tipografía y mensaje de bienvenida se configurarán aquí (próximamente).
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] rounded-xl bg-white/60 dark:bg-[#252936]/50 px-3 py-3 ring-1 ring-black/4 dark:ring-white/6">
                    El preview inferior hereda tema claro / oscuro del sistema.
                  </p>
                </div>
              )}
              {activeTool === 'integrations' && (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">Webhooks y exportación</p>
                  <p className="text-xs leading-relaxed text-[#6B7280] dark:text-[#9CA3AF]">
                    Conecta URLs de webhook al completar una sesión (según roadmap del producto).
                  </p>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] rounded-xl bg-white/60 dark:bg-[#252936]/50 px-3 py-3 ring-1 ring-black/4 dark:ring-white/6">
                    Aún no hay integraciones configuradas.
                  </p>
                </div>
              )}
            </div>
          </aside>
        ) : null}

        <div className={cn('flex-1 flex flex-col min-w-0 min-h-0', workspaceSurface)}>
          <div className={toolBar}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 leading-tight">
              <h1 className="truncate text-lg font-bold leading-tight text-[#1A1A1A] dark:text-[#F8F9FB]">
                {flow.name}
              </h1>
              <p className="text-xs leading-snug text-[#6B7280] dark:text-[#9CA3AF]">
                {steps.length} pasos · preview {device === 'mobile' ? 'móvil' : 'escritorio'}
              </p>
            </div>
            <div className="shrink-0 self-center">
              <FlowEditor
                flowId={flow.id}
                status={flow.status}
                name={flow.name}
                description={flow.description}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto bg-white p-4 scrollbar-hide dark:bg-[#1A1D29]">
            <div
              className={cn(
                'w-full transition-[max-width] duration-300 ease-out',
                device === 'mobile' &&
                  'max-w-[390px] rounded-4xl border-10 border-[#1a1a1a] shadow-2xl overflow-hidden bg-white dark:bg-[#1A1D29]',
                device === 'desktop' && 'max-w-2xl rounded-xl border border-[#E5E7EB] dark:border-[#2A2F3F] shadow-lg bg-white dark:bg-[#1A1D29]',
              )}
            >
              <div className="h-1.5 w-full bg-[#E5E7EB] dark:bg-[#2A2F3F] rounded-t-[0.65rem] overflow-hidden">
                <div
                  className="h-full w-1/3 bg-linear-to-r from-[#9C77F5] to-[#00d4b0] rounded-full"
                  aria-hidden
                />
              </div>
              <div
                className={cn(
                  'max-h-[min(76dvh,720px)] overflow-y-auto scrollbar-hide',
                  previewSection === 'presentation' ? 'p-0' : 'space-y-4 p-5',
                )}
              >
                {previewSection === 'presentation' ? (
                  <FlowPresentationPreview flow={flow} stepCount={steps.length} />
                ) : (
                  <>
                    <PreviewBubble role="assistant">
                      <p className="font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">¡Hola! 👋</p>
                      <p className="mt-2 text-sm leading-relaxed opacity-90">
                        Este es un <strong>preview conversacional</strong> de tu flow. Así verá las preguntas quien lo
                        responda, de una en una.
                      </p>
                    </PreviewBubble>
                    {steps.map((s) => (
                      <div key={s.id} id={`preview-step-${s.id}`} className="scroll-mt-4 space-y-2">
                        <PreviewBubble role="assistant">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{s.question}</p>
                          {s.hint ? (
                            <p className="mt-1 text-xs italic opacity-75">{String(s.hint)}</p>
                          ) : null}
                          <p className="mt-2 text-[10px] uppercase tracking-wide text-[#9C77F5] font-semibold">
                            {TYPE_LABELS[s.type] ?? s.type}
                            {!s.required ? ' · opcional' : ''}
                          </p>
                        </PreviewBubble>
                        <PreviewBubble role="user">
                          <span className="text-sm opacity-80">Respuesta del visitante…</span>
                        </PreviewBubble>
                      </div>
                    ))}
                    <PreviewBubble role="assistant">
                      <p className="text-sm">✨ Gracias. Aquí iría el cierre o siguiente paso del flow.</p>
                    </PreviewBubble>
                  </>
                )}
              </div>
            </div>
          </div>

          <div
            className={cn(
              'flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-4',
              workspaceDivider,
              workspaceSurface,
            )}
          >
            <span className="mr-1 text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Vista previa</span>
            <DevicePreviewToggle device={device} onChange={setDevice} />
            <div className="inline-flex items-center gap-1" role="tablist" aria-label="Sección de vista previa">
              <button
                type="button"
                role="tab"
                aria-selected={previewSection === 'presentation'}
                onClick={() => setPreviewSection('presentation')}
                className={sectionTabClass('presentation')}
              >
                Presentación
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={previewSection === 'main'}
                onClick={() => setPreviewSection('main')}
                className={sectionTabClass('main')}
              >
                Sección principal
              </button>
            </div>
            {publicFlowUrl ? (
              <a
                href={publicFlowUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs font-semibold text-[#9C77F5] hover:underline"
              >
                Abrir público →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewBubble({ role, children }: { role: 'assistant' | 'user'; children: React.ReactNode }) {
  if (role === 'assistant') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-[#E5E7EB] dark:border-[#2A2F3F] bg-[#FAFAFA] dark:bg-[#252936] px-4 py-3 shadow-sm text-[#1A1A1A] dark:text-[#F8F9FB]">
          {children}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] text-white px-4 py-3 shadow-md text-left">
        {children}
      </div>
    </div>
  )
}
