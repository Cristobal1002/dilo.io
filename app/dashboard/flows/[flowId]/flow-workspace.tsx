'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronUpIcon,
  ClockIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  HashtagIcon,
  ListBulletIcon,
  MoonIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PencilSquareIcon,
  PhoneIcon,
  SparklesIcon,
  Squares2X2Icon,
  StarIcon,
  SunIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { STEP_BRANCH_COLOR_PRESETS } from '@/lib/branch-colors'
import { FlowDemoVideo } from '@/components/flow-demo-video'
import { StepConditionsEditor } from '@/components/step-conditions-editor'
import { SavingSpinner } from '@/components/spinners'
import { cn } from '@/lib/utils'
import { DILO_THEME_CHANGE_EVENT } from '@/lib/theme-event'
import { readApiResult } from '@/lib/read-api-result'
import { resolvePublicFlowChatOpening } from '@/lib/public-flow-chat-opening'
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

const TYPE_PALETTE: { type: string; icon: React.ReactNode }[] = [
  { type: 'text', icon: <span className="text-base font-bold leading-none">Aa</span> },
  { type: 'long_text', icon: <span className="text-base font-bold leading-none">¶</span> },
  { type: 'select', icon: <ListBulletIcon className="h-5 w-5" strokeWidth={1.5} /> },
  { type: 'multi_select', icon: <Squares2X2Icon className="h-5 w-5" strokeWidth={1.5} /> },
  { type: 'email', icon: <EnvelopeIcon className="h-5 w-5" strokeWidth={1.5} /> },
  { type: 'phone', icon: <PhoneIcon className="h-5 w-5" strokeWidth={1.5} /> },
  { type: 'number', icon: <HashtagIcon className="h-5 w-5" strokeWidth={1.5} /> },
  { type: 'rating', icon: <StarIcon className="h-5 w-5" strokeWidth={1.5} /> },
  { type: 'yes_no', icon: <span className="text-base font-bold leading-none">?</span> },
  { type: 'file', icon: <PaperClipIcon className="h-5 w-5" strokeWidth={1.5} /> },
]

export type FlowWorkspaceStep = {
  id: string
  order: number
  type: string
  question: string
  hint: string | null
  variableName: string
  required: boolean
  /** Reglas de salto (`if` / `equals` / `skip_to`); null si no hay. */
  conditions?: unknown | null
  /** Solo panel: identificar ramas al editar condicionales. */
  branchLabel?: string | null
  branchColor?: string | null
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
  /** Instrucción para el LLM en transiciones entre preguntas (flow público). */
  tone?: string
  transition_style?: 'ai' | 'none'
  hide_branding?: boolean
  estimated_minutes_min?: number
  estimated_minutes_max?: number
  /** Primer mensaje del chat público; vacío → la app arma saludo desde la descripción. */
  chat_intro?: string
  /** Debajo de la descripción en /f/: YouTube, Vimeo, Loom, o .gif / .mp4 / .webm (https). */
  demo_video_url?: string | null
}

export type FlowWorkspaceFlow = {
  id: string
  name: string
  description: string | null
  status: string
  promptOrigin: string | null
  settings: FlowPresentationSettings | Record<string, unknown>
}

type ToolId = 'ia' | 'elements'
type PreviewSection = 'presentation' | 'main' | 'edit'

const TOOL_IDS = new Set<ToolId>(['ia', 'elements'])

const TOOLS: { id: ToolId; label: string; Icon: typeof SparklesIcon }[] = [
  { id: 'ia', label: 'Create with IA', Icon: SparklesIcon },
  { id: 'elements', label: 'Forms Elements', Icon: Squares2X2Icon },
]

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
      className="inline-flex items-center gap-px rounded-full bg-[#ECEEF2] p-px dark:bg-white/6"
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
const workspaceSurface = 'bg-surface'
const workspaceDivider = 'border-border'

function estimateDurationRange(stepCount: number): { min: number; max: number } {
  if (stepCount <= 0) return { min: 3, max: 8 }
  const min = Math.max(3, Math.round(stepCount * 0.25))
  const max = Math.max(min + 2, Math.round(stepCount * 0.52))
  return { min, max }
}

function parsePresentationSettings(raw: FlowWorkspaceFlow['settings'], workspaceDefaultLogoUrl?: string | null) {
  const o = raw && typeof raw === 'object' ? (raw as FlowPresentationSettings) : {}
  const defaultTag = 'Conversación guiada, sin formularios largos.'
  const fromFlow = typeof o.logo_url === 'string' && /^https?:\/\//.test(o.logo_url) ? o.logo_url : null
  const fromWorkspace =
    !fromFlow &&
    workspaceDefaultLogoUrl &&
    /^https:\/\//i.test(workspaceDefaultLogoUrl.trim())
      ? workspaceDefaultLogoUrl.trim()
      : null
  return {
    tagline: typeof o.tagline === 'string' && o.tagline.trim() ? o.tagline.trim() : defaultTag,
    logoUrl: fromFlow ?? fromWorkspace,
    label: typeof o.presentation_label === 'string' && o.presentation_label.trim()
      ? o.presentation_label.trim()
      : 'Bienvenida',
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
    window.dispatchEvent(new CustomEvent(DILO_THEME_CHANGE_EVENT))
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

function FlowPresentationPreview({
  flow,
  stepCount,
  workspaceLogoUrl,
}: {
  flow: FlowWorkspaceFlow
  stepCount: number
  workspaceLogoUrl?: string | null
}) {
  const router = useRouter()
  const pres = parsePresentationSettings(flow.settings, workspaceLogoUrl)
  const derived = estimateDurationRange(stepCount)
  const minM = pres.estMin ?? derived.min
  const maxM = pres.estMax ?? derived.max
  const timeLabel = minM === maxM ? `~${minM} min` : `${minM}–${maxM} min`

  const [toneAssist, setToneAssist] = useState('cálido, breve y natural')
  const [transitionAi, setTransitionAi] = useState(false)
  const [chatIntroDraft, setChatIntroDraft] = useState('')
  const [savingAssist, setSavingAssist] = useState(false)
  const [assistError, setAssistError] = useState<string | null>(null)
  const [demoVideoDraft, setDemoVideoDraft] = useState(() => {
    const o =
      flow.settings && typeof flow.settings === 'object' ? (flow.settings as FlowPresentationSettings) : {}
    return typeof o.demo_video_url === 'string' ? o.demo_video_url : ''
  })
  const [demoVideoSaving, setDemoVideoSaving] = useState(false)
  const [demoVideoError, setDemoVideoError] = useState<string | null>(null)

  useEffect(() => {
    const o =
      flow.settings && typeof flow.settings === 'object' ? (flow.settings as FlowPresentationSettings) : {}
    setToneAssist(typeof o.tone === 'string' && o.tone.trim() ? o.tone.trim() : 'cálido, breve y natural')
    setTransitionAi(o.transition_style === 'ai')
    setChatIntroDraft(typeof o.chat_intro === 'string' ? o.chat_intro : '')
    setDemoVideoDraft(typeof o.demo_video_url === 'string' ? o.demo_video_url : '')
  }, [flow.settings])

  const saveAssistant = useCallback(async () => {
    setAssistError(null)
    setSavingAssist(true)
    try {
      const res = await fetch(`/api/flows/${flow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            tone: toneAssist.trim().slice(0, 220) || 'cálido, breve y natural',
            transition_style: transitionAi ? 'ai' : 'none',
            chat_intro: chatIntroDraft.slice(0, 4000),
          },
        }),
      })
      const result = await readApiResult(res)
      if (!result.ok) {
        setAssistError(result.message)
        return
      }
      router.refresh()
    } catch {
      setAssistError('No se pudo guardar.')
    } finally {
      setSavingAssist(false)
    }
  }, [flow.id, router, toneAssist, transitionAi, chatIntroDraft])

  const [editTitle, setEditTitle] = useState(false)
  const [editDesc, setEditDesc] = useState(false)
  const [nameDraft, setNameDraft] = useState(flow.name)
  const [descDraft, setDescDraft] = useState(flow.description ?? '')
  const [saving, setSaving] = useState(false)
  const [patchError, setPatchError] = useState<string | null>(null)
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
    setPatchError(null)
    try {
      const res = await fetch(`/api/flows/${flow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: t }),
      })
      const result = await readApiResult(res)
      if (!result.ok) {
        setPatchError(result.message)
        return
      }
      setEditTitle(false)
      router.refresh()
    } catch {
      setPatchError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.')
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
    setPatchError(null)
    try {
      const res = await fetch(`/api/flows/${flow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: nextNorm }),
      })
      const result = await readApiResult(res)
      if (!result.ok) {
        setPatchError(result.message)
        return
      }
      setEditDesc(false)
      router.refresh()
    } catch {
      setPatchError('No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setSaving(false)
    }
  }, [descDraft, flow.description, flow.id, router])

  const saveDemoVideo = useCallback(async () => {
    setDemoVideoError(null)
    const o =
      flow.settings && typeof flow.settings === 'object' ? (flow.settings as FlowPresentationSettings) : {}
    const prevStored = typeof o.demo_video_url === 'string' ? o.demo_video_url.trim() : ''
    const trimmed = demoVideoDraft.trim()
    const nextPayload = trimmed === '' ? null : trimmed
    const prevNorm = prevStored === '' ? null : prevStored
    if (nextPayload === prevNorm) return

    setDemoVideoSaving(true)
    try {
      const res = await fetch(`/api/flows/${flow.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: { demo_video_url: nextPayload } }),
      })
      const result = await readApiResult(res)
      if (!result.ok) {
        setDemoVideoError(result.message)
        return
      }
      router.refresh()
    } catch {
      setDemoVideoError('No se pudo guardar.')
    } finally {
      setDemoVideoSaving(false)
    }
  }, [demoVideoDraft, flow.id, flow.settings, router])

  const startTitleEdit = () => {
    setPatchError(null)
    setNameDraft(flow.name)
    setEditTitle(true)
  }

  const startDescEdit = () => {
    setPatchError(null)
    setDescDraft(flow.description ?? '')
    setEditDesc(true)
  }

  const titleInteractive =
    'group relative mt-2 w-full max-w-md rounded-xl px-2 py-1 transition-colors hover:bg-[#9C77F5]/8 dark:hover:bg-[#9C77F5]/12'
  const descInteractive =
    'group relative mt-4 w-full max-w-md rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-[#9C77F5]/8 dark:hover:bg-[#9C77F5]/12'

  return (
    <div className="relative min-h-[min(62dvh,520px)] w-full overflow-hidden rounded-b-2xl bg-[#F4F5F7] px-4 pb-8 pt-5 dark:bg-[#0c0d12]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-border" aria-hidden />
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

        <div className="mt-5 w-full max-w-md text-left">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#9C77F5]">Video de demo (opcional)</p>
          <p className="mt-1 text-[11px] leading-snug text-[#6B7280] dark:text-[#9CA3AF]">
            Se muestra debajo de la descripción en el enlace público. YouTube, Vimeo, Loom, o un .gif / .mp4 / .webm en
            https.
          </p>
          <input
            type="url"
            value={demoVideoDraft}
            onChange={(e) => {
              setDemoVideoDraft(e.target.value)
              setDemoVideoError(null)
            }}
            placeholder="https://www.youtube.com/watch?v=…"
            className="mt-2 w-full rounded-xl border border-[#9C77F5]/25 bg-white px-3 py-2 text-xs text-[#1A1A1A] shadow-sm placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#9C77F5]/30 dark:border-[#2A2F3F] dark:bg-[#0F1117] dark:text-[#E5E7EB]"
            aria-label="URL de video de demo"
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void saveDemoVideo()}
              disabled={demoVideoSaving}
              className="rounded-lg bg-[#1A1A1A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 dark:bg-[#F8F9FB] dark:text-[#1A1A1A]"
            >
              {demoVideoSaving ? 'Guardando…' : 'Guardar enlace'}
            </button>
          </div>
          {demoVideoError ? (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {demoVideoError}
            </p>
          ) : null}
          <div className="mt-4 flex justify-center">
            <FlowDemoVideo url={demoVideoDraft} showInvalidHint clickToLoadIframe />
          </div>
        </div>

        {patchError ? (
          <p className="mt-2 max-w-md text-center text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {patchError}
          </p>
        ) : null}
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

        <div className="mt-8 w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white/90 px-4 py-4 text-left dark:border-[#2A2F3F] dark:bg-[#1A1D29]/90">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#9C77F5]">Conversación pública</p>
          <label className="mt-3 flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={transitionAi}
              onChange={(e) => setTransitionAi(e.target.checked)}
              className="h-4 w-4 rounded border-[#CBD5E1] text-dilo-600 focus:ring-dilo-500"
            />
            <span className="text-sm font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">Transiciones con IA entre preguntas</span>
          </label>
          <p className="mt-1 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
            Acuse breve tras cada respuesta (máx. una frase). Si lo desactivas, el flow sigue al instante.
          </p>
          <label className="mt-4 block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">Tono del asistente (para la IA)</label>
          <input
            type="text"
            value={toneAssist}
            onChange={(e) => setToneAssist(e.target.value)}
            maxLength={220}
            placeholder="cálido, breve y natural"
            className="mt-1.5 w-full rounded-xl border border-[#E8EAEF] bg-[#F8F9FB] px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#9C77F5]/45 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
          />
          <label className="mt-4 block text-xs font-semibold text-[#64748B] dark:text-[#94A3B8]">
            Saludo al entrar al chat (opcional)
          </label>
          <p className="mt-1 text-[11px] leading-snug text-[#6B7280] dark:text-[#9CA3AF]">
            Primera burbuja del asistente, antes de la primera pregunta. Si lo dejas vacío, armamos el texto a partir de la
            descripción del flow (editada arriba).
          </p>
          <textarea
            value={chatIntroDraft}
            onChange={(e) => setChatIntroDraft(e.target.value.slice(0, 4000))}
            rows={5}
            maxLength={4000}
            placeholder="Ej: ¡Hola! 👋 Te explico en un momento qué vamos a hacer…"
            className="mt-1.5 w-full resize-y rounded-xl border border-[#E8EAEF] bg-[#F8F9FB] px-3 py-2 text-sm leading-relaxed text-[#1A1A1A] outline-none focus:border-[#9C77F5]/45 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
          />
          <p className="mt-0.5 text-right text-[10px] tabular-nums text-[#9CA3AF]">{chatIntroDraft.length}/4000</p>
          {assistError ? (
            <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {assistError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={savingAssist}
            onClick={() => void saveAssistant()}
            className="mt-3 w-full rounded-xl bg-linear-to-r from-dilo-500 to-dilo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
          >
            {savingAssist ? 'Guardando…' : 'Guardar tono y saludo'}
          </button>
        </div>

        <button
          type="button"
          disabled
          className="mt-8 w-full max-w-sm cursor-default rounded-full bg-linear-to-r from-dilo-500 to-dilo-600 py-3.5 text-sm font-semibold text-white opacity-95 shadow-none"
        >
          Empezar ahora
        </button>
        <p className="mt-2 text-[10px] text-[#9CA3AF]">Vista previa · el botón se activará en la versión pública</p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// EditableStepCard — step in edit mode
// ---------------------------------------------------------------------------

const HAS_OPTIONS = new Set(['select', 'multi_select'])

function EditableStepCard({
  flowId,
  step,
  allSteps,
  isFirst,
  isLast,
  onUpdate,
  onDelete,
  onMove,
  onRefresh,
  saving,
}: {
  flowId: string
  step: FlowWorkspaceStep
  allSteps: FlowWorkspaceStep[]
  isFirst: boolean
  isLast: boolean
  onUpdate: (stepId: string, fields: Record<string, unknown>) => Promise<void>
  onDelete: (stepId: string) => void
  onMove: (stepId: string, direction: 'up' | 'down') => void
  onRefresh: () => void
  saving: boolean
}) {
  const [stepType, setStepType] = useState(step.type)
  const [question, setQuestion] = useState(step.question)
  const [variableName, setVariableName] = useState(step.variableName)
  const [branchLabel, setBranchLabel] = useState(step.branchLabel ?? '')
  const [required, setRequired] = useState(step.required)

  type LocalOption = { id: string; label: string; order: number; temp?: boolean }
  const [localOptions, setLocalOptions] = useState<LocalOption[]>(
    step.options.map((o) => ({ id: o.id, label: o.label, order: o.order })),
  )
  const [newOptionLabel, setNewOptionLabel] = useState('')
  const [savingOption, setSavingOption] = useState(false)
  const newOptionInputRef = useRef<HTMLInputElement>(null)

  // Sync when step prop changes (e.g. after router.refresh)
  useEffect(() => { setStepType(step.type) }, [step.type])
  useEffect(() => { setQuestion(step.question) }, [step.question])
  useEffect(() => { setVariableName(step.variableName) }, [step.variableName])
  useEffect(() => { setBranchLabel(step.branchLabel ?? '') }, [step.branchLabel])
  useEffect(() => { setRequired(step.required) }, [step.required])
  useEffect(() => {
    // Only sync real (non-temp) options from server
    setLocalOptions(step.options.map((o) => ({ id: o.id, label: o.label, order: o.order })))
  }, [step.options])

  const handleTypeChange = async (newType: string) => {
    if (newType === stepType) return
    setStepType(newType)
    await onUpdate(step.id, { type: newType })
  }

  const handleBlurQuestion = async () => {
    const q = question.trim()
    if (!q || q === step.question) return
    await onUpdate(step.id, { question: q })
  }

  const handleBlurVariable = async () => {
    const v = variableName.trim()
    if (!v || v === step.variableName) return
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v)) {
      setVariableName(step.variableName)
      return
    }
    await onUpdate(step.id, { variableName: v })
  }

  const handleToggleRequired = async () => {
    const next = !required
    setRequired(next)
    await onUpdate(step.id, { required: next })
  }

  const handleBlurBranchLabel = async () => {
    const t = branchLabel.trim()
    const prev = (step.branchLabel ?? '').trim()
    if (t === prev) return
    await onUpdate(step.id, { branchLabel: t === '' ? null : t.slice(0, 80) })
  }

  const handleBranchColor = async (hex: string | null) => {
    const next = hex
    const prev = step.branchColor ?? null
    if (next === prev) return
    await onUpdate(step.id, { branchColor: next })
  }

  // ── Options CRUD ───────────────────────────────────────────────────────────

  const submitNewOption = async () => {
    const label = newOptionLabel.trim()
    if (!label) return
    setNewOptionLabel('')
    // Optimistic: add immediately with a temp ID
    const tempId = `temp_${Date.now()}`
    setLocalOptions((prev) => [...prev, { id: tempId, label, order: prev.length, temp: true }])
    setSavingOption(true)
    try {
      const res = await fetch(`/api/flows/${flowId}/steps/${step.id}/options`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      })
      if (res.ok) {
        onRefresh() // sync real ID from server
      } else {
        setLocalOptions((prev) => prev.filter((o) => o.id !== tempId)) // revert
      }
    } catch {
      setLocalOptions((prev) => prev.filter((o) => o.id !== tempId))
    } finally {
      setSavingOption(false)
    }
  }

  const handleDeleteOption = async (optionId: string) => {
    setLocalOptions((prev) => prev.filter((o) => o.id !== optionId))
    try {
      await fetch(`/api/flows/${flowId}/steps/${step.id}/options/${optionId}`, { method: 'DELETE' })
      onRefresh()
    } catch {
      onRefresh() // re-sync from server on error
    }
  }

  const handleUpdateOptionLabel = async (optionId: string, label: string) => {
    const trimmed = label.trim()
    const prev = localOptions.find((o) => o.id === optionId)
    if (!trimmed || trimmed === prev?.label) return
    try {
      await fetch(`/api/flows/${flowId}/steps/${step.id}/options/${optionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: trimmed }),
      })
      onRefresh()
    } catch { /* noop */ }
  }

  const hasOptions = HAS_OPTIONS.has(stepType)

  return (
    <div
      className={cn(
        'rounded-2xl border bg-white transition-all dark:bg-[#1A1D29]',
        saving
          ? 'border-[#9C77F5]/40 shadow-sm shadow-[#9C77F5]/10 dark:border-[#9C77F5]/30'
          : 'border-[#E8EAEF] dark:border-[#2A2F3F]',
      )}
    >
      {/* Header: order + type selector + saving + move arrows + delete */}
      <div className="flex items-center gap-2 border-b border-[#F1F5F9] px-3.5 py-2.5 dark:border-[#252936]">
        {/* Order + optional branch chip */}
        <span className="shrink-0 text-[11px] font-bold text-[#9C77F5]">#{step.order + 1}</span>
        {step.branchLabel?.trim() ? (
          <span
            className="max-w-26 truncate rounded-md border border-[#E8EAEF] bg-[#F8F9FB] px-1.5 py-0.5 text-[9px] font-semibold text-[#475569] dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#CBD5E1]"
            style={{
              borderLeftWidth: 3,
              borderLeftColor:
                step.branchColor && /^#[0-9A-Fa-f]{6}$/i.test(step.branchColor) ? step.branchColor : '#9C77F5',
            }}
            title={step.branchLabel.trim()}
          >
            {step.branchLabel.trim()}
          </span>
        ) : null}

        {/* Type selector */}
        <select
          value={stepType}
          onChange={(e) => void handleTypeChange(e.target.value)}
          className="min-w-0 flex-1 cursor-pointer rounded-lg border border-[#E8EAEF] bg-[#F8F9FB] px-2 py-1 text-[11px] font-medium text-[#64748B] focus:border-[#9C77F5]/40 focus:outline-none focus:ring-1 focus:ring-[#9C77F5]/20 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#94A3B8]"
          title="Cambiar tipo de pregunta"
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {saving && <SavingSpinner size="xs" />}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Move up/down */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={isFirst}
            onClick={() => onMove(step.id, 'up')}
            className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:bg-[#F1F5F9] hover:text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-[#252936] dark:hover:text-[#9CA3AF]"
            title="Mover arriba"
            aria-label="Mover arriba"
          >
            <ChevronUpIcon className="h-4 w-4" strokeWidth={2} />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={() => onMove(step.id, 'down')}
            className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:bg-[#F1F5F9] hover:text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-[#252936] dark:hover:text-[#9CA3AF]"
            title="Mover abajo"
            aria-label="Mover abajo"
          >
            <ChevronDownIcon className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => onDelete(step.id)}
          className="rounded-lg p-1 text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
          title="Eliminar paso"
          aria-label="Eliminar paso"
        >
          <TrashIcon className="h-4 w-4" strokeWidth={1.5} />
        </button>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {/* Question textarea */}
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onBlur={() => void handleBlurQuestion()}
          rows={2}
          maxLength={2000}
          placeholder="Escribe la pregunta…"
          className="w-full resize-none rounded-xl border border-transparent bg-[#F8F9FB] px-3 py-2 text-sm font-medium text-[#1A1A1A] placeholder:text-[#9CA3AF] transition-colors focus:border-[#9C77F5]/35 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#9C77F5]/12 dark:bg-[#252936] dark:text-[#F8F9FB] dark:placeholder:text-[#6B7280] dark:focus:bg-[#1A1D29]"
        />

        {/* ── Options editor (select / multi_select only) ────────── */}
        {hasOptions && (
          <div className="mt-3 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Opciones
            </p>

            {/* Existing options */}
            {localOptions.map((opt) => (
              <div key={opt.id} className={cn('flex items-center gap-2', opt.temp && 'opacity-50')}>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#9C77F5]/50" aria-hidden />
                <input
                  type="text"
                  defaultValue={opt.label}
                  disabled={opt.temp}
                  onBlur={(e) => void handleUpdateOptionLabel(opt.id, e.target.value)}
                  maxLength={200}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-[#374151] transition-colors hover:bg-[#F8F9FB] focus:border-[#9C77F5]/25 focus:bg-[#F8F9FB] focus:outline-none disabled:cursor-default dark:text-[#D1D5DB] dark:hover:bg-[#252936] dark:focus:bg-[#252936]"
                />
                {opt.temp ? (
                  <span className="shrink-0 px-1 text-[10px] text-[#9CA3AF]">…</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleDeleteOption(opt.id)}
                    className="shrink-0 rounded-lg p-1 text-[#9CA3AF] transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                    title="Eliminar opción"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                )}
              </div>
            ))}

            {/* Add new option */}
            <div className="flex items-center gap-2 pt-0.5">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-dashed border-[#9C77F5]/40" aria-hidden />
              <input
                ref={newOptionInputRef}
                type="text"
                value={newOptionLabel}
                onChange={(e) => setNewOptionLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); void submitNewOption() }
                  if (e.key === 'Escape') setNewOptionLabel('')
                }}
                placeholder="Añadir opción…"
                maxLength={200}
                className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-[#374151] placeholder:text-[#9CA3AF] transition-colors hover:bg-[#F8F9FB] focus:border-[#9C77F5]/25 focus:bg-[#F8F9FB] focus:outline-none dark:text-[#D1D5DB] dark:placeholder:text-[#6B7280] dark:hover:bg-[#252936] dark:focus:bg-[#252936]"
              />
              {newOptionLabel.trim() && (
                <button
                  type="button"
                  disabled={savingOption}
                  onClick={() => void submitNewOption()}
                  className="shrink-0 rounded-lg bg-[#9C77F5]/10 px-2 py-1 text-[11px] font-semibold text-[#6B4DD4] transition-colors hover:bg-[#9C77F5]/20 disabled:opacity-50 dark:bg-[#9C77F5]/15 dark:text-[#C4B5FD]"
                >
                  {savingOption ? '…' : '+ Añadir'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Variable name + required toggle */}
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={variableName}
            onChange={(e) => setVariableName(e.target.value)}
            onBlur={() => void handleBlurVariable()}
            maxLength={100}
            placeholder="variable_nombre"
            title="Nombre de variable (letras, números y _)"
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 font-mono text-[11px] text-[#94A3B8] transition-colors hover:bg-[#F8F9FB] focus:border-[#9C77F5]/25 focus:bg-[#F8F9FB] focus:outline-none dark:hover:bg-[#252936] dark:focus:bg-[#252936]"
          />
          <button
            type="button"
            onClick={() => void handleToggleRequired()}
            className={cn(
              'shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-medium transition-colors',
              required
                ? 'bg-[#9C77F5]/10 text-[#6B4DD4] dark:bg-[#9C77F5]/15 dark:text-[#C4B5FD]'
                : 'text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#252936]',
            )}
            title={required ? 'Requerido — clic para hacer opcional' : 'Opcional — clic para hacer requerido'}
          >
            {required ? '✓ Requerido' : 'Opcional'}
          </button>
        </div>

        {/* Marca de rama: solo panel (condicionales / escaneo) */}
        <div className="mt-2.5 rounded-lg border border-dashed border-[#E8EAEF] bg-[#FAFBFC]/80 px-2.5 py-2 dark:border-[#2A2F3F] dark:bg-[#151820]/50">
          <p className="text-[9px] font-medium uppercase tracking-wide text-[#9CA3AF]">
            Marca de rama (solo editor — no la ve el visitante)
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className="h-6 w-1 shrink-0 rounded-full border border-black/5 dark:border-white/10"
              style={{
                backgroundColor: step.branchColor && /^#[0-9A-Fa-f]{6}$/.test(step.branchColor) ? step.branchColor : '#E2E8F0',
              }}
              title="Color actual"
              aria-hidden
            />
            <input
              type="text"
              value={branchLabel}
              onChange={(e) => setBranchLabel(e.target.value)}
              onBlur={() => void handleBlurBranchLabel()}
              maxLength={80}
              placeholder="ej. Compradores, Arriendo…"
              title="Aparece en «Saltar a orden» y al revisar pasos"
              className="min-w-32 flex-1 rounded-lg border border-transparent bg-white/90 px-2 py-1 text-[11px] text-[#475569] placeholder:text-[#94A3B8] focus:border-[#9C77F5]/25 focus:outline-none dark:bg-[#1A1D29]/90 dark:text-[#E2E8F0] dark:placeholder:text-[#64748B]"
            />
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Color de marca">
              {STEP_BRANCH_COLOR_PRESETS.map((c) => {
                const active = step.branchColor === c.hex
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={c.id}
                    onClick={() => void handleBranchColor(c.hex)}
                    className={cn(
                      'h-5 w-5 shrink-0 rounded-full border-2 transition-transform hover:scale-110',
                      active ? 'border-[#1A1A1A] dark:border-white' : 'border-transparent ring-1 ring-black/10 dark:ring-white/15',
                    )}
                    style={{ backgroundColor: c.hex }}
                  />
                )
              })}
              <button
                type="button"
                onClick={() => void handleBranchColor(null)}
                className="rounded-md px-1.5 py-0.5 text-[9px] font-medium text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#252936]"
                title="Quitar color"
              >
                Sin color
              </button>
            </div>
          </div>
        </div>

        <StepConditionsEditor
          step={{
            id: step.id,
            order: step.order,
            variableName: step.variableName,
            question: step.question,
            conditions: step.conditions ?? null,
            branchLabel: step.branchLabel ?? null,
            branchColor: step.branchColor ?? null,
          }}
          allSteps={allSteps.map((s) => ({
            id: s.id,
            order: s.order,
            variableName: s.variableName,
            question: s.question,
            conditions: s.conditions ?? null,
            branchLabel: s.branchLabel ?? null,
            branchColor: s.branchColor ?? null,
          }))}
          saving={saving}
          onSave={async (conditions) => {
            await onUpdate(step.id, { conditions })
          }}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main FlowWorkspace component
// ---------------------------------------------------------------------------

export default function FlowWorkspace({
  flow,
  steps,
  publicFlowUrl,
  sessionCount,
  workspaceLogoUrl = null,
}: {
  flow: FlowWorkspaceFlow
  steps: FlowWorkspaceStep[]
  publicFlowUrl: string | null
  sessionCount: number
  /** Logo del workspace si el flow no define `settings.logo_url`. */
  workspaceLogoUrl?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const rawTool = searchParams.get('tool')
  const activeTool = parseTool(rawTool)

  useEffect(() => {
    if (rawTool === 'design' || rawTool === 'integrations') {
      router.replace(`/dashboard/flows/${flow.id}?tool=ia`)
    }
  }, [rawTool, flow.id, router])

  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop')
  const [previewSection, setPreviewSection] = useState<PreviewSection>('presentation')

  // Local steps state for optimistic updates
  const [localSteps, setLocalSteps] = useState<FlowWorkspaceStep[]>(steps)
  const [addingStep, setAddingStep] = useState(false)
  const [savingStepIds, setSavingStepIds] = useState<Set<string>>(new Set())

  // Sync local steps when server-refreshed props arrive
  useEffect(() => {
    setLocalSteps(steps)
  }, [steps])

  // ── Step CRUD ─────────────────────────────────────────────────────────────

  const handleAddStep = useCallback(
    async (type: string) => {
      setAddingStep(true)
      try {
        const res = await fetch(`/api/flows/${flow.id}/steps`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }),
        })
        const result = await readApiResult(res)
        if (!result.ok) {
          console.error('Failed to add step:', result.message)
          return
        }
        router.refresh()
      } catch (err) {
        console.error('Failed to add step:', err)
      } finally {
        setAddingStep(false)
      }
    },
    [flow.id, router],
  )

  const handleUpdateStep = useCallback(
    async (stepId: string, fields: Record<string, unknown>) => {
      setSavingStepIds((prev) => new Set([...prev, stepId]))
      try {
        const res = await fetch(`/api/flows/${flow.id}/steps/${stepId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        })
        const result = await readApiResult(res)
        if (!result.ok) {
          console.error('Failed to update step:', result.message)
        }
        router.refresh()
      } catch (err) {
        console.error('Failed to update step:', err)
      } finally {
        setSavingStepIds((prev) => {
          const next = new Set(prev)
          next.delete(stepId)
          return next
        })
      }
    },
    [flow.id, router],
  )

  const handleDeleteStep = useCallback(
    async (stepId: string) => {
      // Optimistic remove
      setLocalSteps((prev) => prev.filter((s) => s.id !== stepId))
      try {
        // DELETE returns 204 No Content — don't use readApiResult (it tries to parse JSON body)
        const res = await fetch(`/api/flows/${flow.id}/steps/${stepId}`, {
          method: 'DELETE',
        })
        if (!res.ok) {
          setLocalSteps(steps) // revert
          return
        }
        router.refresh()
      } catch {
        setLocalSteps(steps)
      }
    },
    [flow.id, steps, router],
  )

  const handleMoveStep = useCallback(
    async (stepId: string, direction: 'up' | 'down') => {
      const idx = localSteps.findIndex((s) => s.id === stepId)
      if (idx === -1) return
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1
      if (swapIdx < 0 || swapIdx >= localSteps.length) return

      // Optimistic reorder
      const next = [...localSteps]
      ;[next[idx], next[swapIdx]] = [next[swapIdx], next[idx]]
      const reordered = next.map((s, i) => ({ ...s, order: i }))
      setLocalSteps(reordered)

      try {
        // Reorder also returns 204 No Content
        const res = await fetch(`/api/flows/${flow.id}/steps/reorder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepIds: reordered.map((s) => s.id) }),
        })
        if (!res.ok) {
          setLocalSteps(steps) // revert
          return
        }
        router.refresh()
      } catch {
        setLocalSteps(steps)
      }
    },
    [flow.id, localSteps, steps, router],
  )

  // ── IA Chat ───────────────────────────────────────────────────────────────

  type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string; pending?: boolean }

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => [
    ...(flow.promptOrigin
      ? [{ id: 'origin', role: 'user' as const, content: flow.promptOrigin }]
      : []),
    {
      id: 'init',
      role: 'assistant' as const,
      content: `Flow generado con IA ✨ — ${steps.length} paso${steps.length !== 1 ? 's' : ''} listos. Dime qué quieres ajustar.`,
    },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleChatSend = useCallback(async () => {
    const msg = chatInput.trim()
    if (!msg || chatLoading) return
    setChatInput('')

    const userMsg: ChatMessage = { id: `u_${Date.now()}`, role: 'user', content: msg }
    const pendingId = `a_${Date.now()}`
    const pendingMsg: ChatMessage = { id: pendingId, role: 'assistant', content: '…', pending: true }

    setChatMessages((prev) => [...prev, userMsg, pendingMsg])
    setChatLoading(true)

    // Build history (last 12 messages, excluding pending + seed messages).
    // 'origin' and 'init' are display-only seed bubbles — the system prompt
    // already provides full flow context, so sending them again causes
    // the original prompt to appear twice in the OpenAI messages array.
    const history = [...chatMessages, userMsg]
      .filter((m) => !m.pending && m.id !== 'origin' && m.id !== 'init')
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch(`/api/flows/${flow.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, history }),
      })
      const result = await readApiResult<{ message: string; changes: unknown[] }>(res)

      if (!result.ok) {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? { ...m, content: 'Ocurrió un error. Intenta de nuevo.', pending: false }
              : m,
          ),
        )
        return
      }

      const { message: aiMsg, changes } = result.data

      // Replace pending bubble with real response
      setChatMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, content: aiMsg, pending: false } : m)),
      )

      // Apply changes sequentially
      if (Array.isArray(changes) && changes.length > 0) {
        for (const change of changes as Array<Record<string, string>>) {
          try {
            if (change.action === 'add_step' && change.type) {
              await fetch(`/api/flows/${flow.id}/steps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: change.type,
                  question: change.question,
                  variableName: change.variableName,
                }),
              })
            } else if (change.action === 'update_step' && change.stepId) {
              const fields: Record<string, unknown> = {}
              if (change.question) fields.question = change.question
              if (change.type) fields.type = change.type
              if (change.hint !== undefined) fields.hint = change.hint
              if (change.variableName) fields.variableName = change.variableName
              if (Object.keys(fields).length) {
                await fetch(`/api/flows/${flow.id}/steps/${change.stepId}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(fields),
                })
              }
            } else if (change.action === 'delete_step' && change.stepId) {
              await fetch(`/api/flows/${flow.id}/steps/${change.stepId}`, { method: 'DELETE' })
            } else if (change.action === 'add_option' && change.stepId && change.label) {
              await fetch(`/api/flows/${flow.id}/steps/${change.stepId}/options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ label: change.label }),
              })
            }
          } catch {
            // continue applying other changes even if one fails
          }
        }
        router.refresh()
      }
    } catch {
      setChatMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? { ...m, content: 'No se pudo conectar. Revisa tu conexión.', pending: false }
            : m,
        ),
      )
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, chatMessages, flow.id, router])

  const flowBasePath = `/dashboard/flows/${flow.id}`

  const sectionTabClass = (id: PreviewSection) =>
    cn(
      'rounded-full border px-3.5 py-1.5 text-xs transition-colors duration-200',
      previewSection === id
        ? 'border-[#9C77F5]/28 bg-[#9C77F5]/10 font-medium text-[#5B3FC9] dark:border-[#9C77F5]/35 dark:bg-[#9C77F5]/14 dark:text-[#E9D5FF]'
        : 'border-transparent bg-transparent font-medium text-[#64748B] hover:bg-black/[0.04] hover:text-[#475569] dark:text-[#94A3B8] dark:hover:bg-white/[0.05] dark:hover:text-[#CBD5E1]',
    )

  const toolBar = cn(
    'shrink-0 flex min-h-16 items-center justify-between gap-3 border-b px-4 py-2',
    workspaceDivider,
    workspaceSurface,
  )

  const isEditMode = previewSection === 'edit'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className={cn(
          'flex min-h-0 flex-1 overflow-hidden rounded-t-none rounded-br-xl rounded-bl-none border-b border-[#E8EAEF] dark:border-[#2A2F3F]',
          workspaceSurface,
        )}
      >
        {/* ── Left panel ─────────────────────────────────────────────────── */}
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
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-medium text-[#64748B] transition-colors hover:border-[#E8EAEF] hover:bg-[#FAFBFC] hover:text-[#475569] dark:text-[#94A3B8] dark:hover:border-[#2A2F3F] dark:hover:bg-[#161821] dark:hover:text-[#CBD5E1]"
              >
                <XMarkIcon className="h-3.5 w-3.5 opacity-70" strokeWidth={1.75} aria-hidden />
                Cerrar
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 text-sm text-[#4B5563] dark:text-[#9CA3AF]">

              {/* ── IA panel: live chat ───────────────────────────────── */}
              {activeTool === 'ia' && (
                <div className="flex h-full flex-col gap-3">
                  {/* Messages */}
                  <div className="flex-1 space-y-2.5 overflow-y-auto pb-1 scrollbar-hide">
                    {chatMessages.map((m) => (
                      m.role === 'user' ? (
                        <div key={m.id} className="flex justify-end">
                          <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-3 py-2 text-left shadow-sm shadow-[#9C77F5]/20">
                            <p className="wrap-break-word text-[11px] leading-relaxed text-white whitespace-pre-wrap">{m.content}</p>
                          </div>
                        </div>
                      ) : (
                        <div key={m.id} className="flex justify-start">
                          <div className={cn(
                            'max-w-[88%] rounded-2xl rounded-tl-md border px-3 py-2',
                            m.pending
                              ? 'border-[#9C77F5]/20 bg-[#9C77F5]/5 dark:border-[#9C77F5]/15 dark:bg-[#9C77F5]/8'
                              : 'border-[#E8EAEF] bg-[#FAFBFC] dark:border-[#2A2F3F] dark:bg-[#1c1f2a]',
                          )}>
                            {m.pending ? (
                              <span className="flex gap-1 py-0.5">
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9C77F5]/60 [animation-delay:0ms]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9C77F5]/60 [animation-delay:150ms]" />
                                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9C77F5]/60 [animation-delay:300ms]" />
                              </span>
                            ) : (
                              <p className="wrap-break-word text-[11px] leading-relaxed text-[#1A1A1A] whitespace-pre-wrap dark:text-[#F8F9FB]">
                                {m.content}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input */}
                  <div className="shrink-0 border-t border-[#E8EAEF] pt-3 dark:border-[#2A2F3F]">
                    <div className={cn(
                      'flex flex-col gap-2 rounded-2xl border px-3 py-2.5 transition-colors',
                      chatLoading
                        ? 'border-[#9C77F5]/25 bg-[#F8F9FB] dark:border-[#9C77F5]/20 dark:bg-[#161821]'
                        : 'border-[#E8EAEF] bg-[#F8F9FB] focus-within:border-[#9C77F5]/35 focus-within:ring-2 focus-within:ring-[#9C77F5]/10 dark:border-[#2A2F3F] dark:bg-[#161821]',
                    )}>
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            void handleChatSend()
                          }
                        }}
                        disabled={chatLoading}
                        placeholder="Ej: añade una pregunta de presupuesto…"
                        maxLength={2000}
                        rows={3}
                        className="w-full resize-none bg-transparent text-[11px] leading-relaxed text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:outline-none dark:text-[#F8F9FB] dark:placeholder:text-[#6B7280]"
                      />
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-[#9CA3AF]">Shift+Enter para salto de línea</span>
                        <button
                          type="button"
                          disabled={chatLoading || !chatInput.trim()}
                          onClick={() => void handleChatSend()}
                          className={cn(
                            'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg transition-colors',
                            chatLoading || !chatInput.trim()
                              ? 'bg-[#9C77F5]/15 text-[#9C77F5]/40'
                              : 'bg-[#9C77F5] text-white shadow-sm shadow-[#9C77F5]/30 hover:bg-[#8B67E5]',
                          )}
                          title="Enviar (Enter)"
                        >
                          <PaperAirplaneIcon className="h-3 w-3" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Elements panel ────────────────────────────────────── */}
              {activeTool === 'elements' && (
                <div className="space-y-4">
                  <p className="text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                    Haz clic en un elemento para añadirlo al flow
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {TYPE_PALETTE.map(({ type, icon }) => (
                      <button
                        key={type}
                        type="button"
                        disabled={addingStep}
                        onClick={() => void handleAddStep(type)}
                        className="flex flex-col items-center gap-2 rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-3.5 text-center transition-colors hover:border-[#9C77F5]/30 hover:bg-[#F8F6FF] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#161821] dark:hover:border-[#9C77F5]/30 dark:hover:bg-[#1c1f2a]"
                      >
                        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#9C77F5]/10 text-[#6B4DD4] dark:bg-[#9C77F5]/15 dark:text-[#D4C4FC]">
                          {icon}
                        </span>
                        <span className="text-[11px] font-medium leading-tight text-[#374151] dark:text-[#D1D5DB]">
                          {TYPE_LABELS[type]}
                        </span>
                      </button>
                    ))}
                  </div>
                  {addingStep && (
                    <SavingSpinner className="justify-center text-xs" size="xs" />
                  )}
                </div>
              )}
            </div>
          </aside>
        ) : null}

        {/* ── Main canvas ──────────────────────────────────────────────────── */}
        <div className={cn('flex-1 flex flex-col min-w-0 min-h-0', workspaceSurface)}>
          <div className={toolBar}>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-0.5 leading-tight">
              <h1 className="truncate text-lg font-bold leading-tight text-[#1A1A1A] dark:text-[#F8F9FB]">
                {flow.name}
              </h1>
              <p className="text-xs leading-snug text-[#6B7280] dark:text-[#9CA3AF]">
                {localSteps.length} pasos
                {isEditMode
                  ? ' · modo edición'
                  : ` · preview ${device === 'mobile' ? 'móvil' : 'escritorio'}`}
              </p>
            </div>
            <div className="shrink-0 self-center">
              <FlowEditor
                flowId={flow.id}
                status={flow.status}
                flowName={flow.name}
                sessionCount={sessionCount}
                flowSettings={flow.settings}
                workspaceLogoUrl={workspaceLogoUrl}
              />
            </div>
          </div>

          {/* Canvas content */}
          {isEditMode ? (
            /* ── EDIT MODE: editable step list ────────────────────── */
            <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto bg-background scrollbar-hide">
              {/* Subtle background blobs */}
              <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                <div className="absolute left-1/2 top-1/3 h-64 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-dilo-500/8 blur-3xl dark:bg-dilo-500/6" />
              </div>

              <div className="relative z-10 mx-auto w-full max-w-2xl px-5 py-6">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9C77F5]">Pasos del flow</p>
                    <p className="mt-0.5 text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                      Edita preguntas y variables · los cambios se guardan al salir del campo
                    </p>
                  </div>
                  {addingStep && <SavingSpinner size="xs" className="text-xs" />}
                </div>

                {/* Step list */}
                {localSteps.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#9C77F5]/25 py-12 text-center dark:border-[#9C77F5]/20">
                    <span className="text-3xl">📋</span>
                    <p className="text-sm font-medium text-[#6B7280] dark:text-[#9CA3AF]">
                      No hay pasos todavía
                    </p>
                    <p className="max-w-xs text-xs text-[#9CA3AF]">
                      Abre el panel de <strong>Forms Elements</strong> y haz clic en un tipo para añadir el primer paso.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {localSteps.map((step, idx) => (
                      <EditableStepCard
                        key={step.id}
                        flowId={flow.id}
                        step={step}
                        allSteps={localSteps}
                        isFirst={idx === 0}
                        isLast={idx === localSteps.length - 1}
                        onUpdate={handleUpdateStep}
                        onDelete={handleDeleteStep}
                        onMove={handleMoveStep}
                        onRefresh={() => router.refresh()}
                        saving={savingStepIds.has(step.id)}
                      />
                    ))}
                  </div>
                )}

                {/* Quick add hint */}
                <p className="mt-4 text-center text-[11px] text-[#9CA3AF]">
                  Usa el panel <strong>Forms Elements</strong> para añadir más pasos →
                </p>
              </div>
            </div>
          ) : (
            /* ── PREVIEW MODE: existing preview ───────────────────── */
            <div className="relative flex min-h-0 flex-1 items-start justify-center overflow-y-auto bg-background p-5 pb-6 scrollbar-hide">
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden
              >
                <div className="absolute left-1/2 top-[32%] h-[min(380px,52vh)] w-[min(480px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-dilo-500/14 blur-3xl dark:bg-dilo-500/10" />
                <div className="absolute bottom-[12%] right-[6%] h-52 w-64 rounded-full bg-mint-500/12 blur-3xl dark:bg-mint-500/8" />
                <div className="absolute top-[22%] left-[4%] h-44 w-52 rounded-full bg-dilo-500/10 blur-3xl dark:bg-dilo-500/7" />
              </div>
              <div
                className={cn(
                  'relative z-10 w-full overflow-hidden transition-[max-width] duration-300 ease-out',
                  device === 'mobile' &&
                    'max-w-[390px] rounded-4xl border-[6px] border-[#1a1a1a] bg-surface shadow-none dark:border-[#0a0a0a]',
                  device === 'desktop' &&
                    'max-w-2xl rounded-2xl border border-border bg-surface shadow-none',
                )}
              >
                <div
                  className={cn(
                    'shrink-0 overflow-hidden bg-border',
                    device === 'mobile' && 'rounded-t-[1.625rem]',
                    device === 'desktop' && 'rounded-t-2xl',
                  )}
                >
                  <div className="h-1 w-full overflow-hidden" aria-hidden>
                    <div className="h-full w-1/3 rounded-full bg-linear-to-r from-dilo-500 to-mint-500" />
                  </div>
                </div>
                <div
                  className={cn(
                    'max-h-[min(76dvh,720px)] overflow-x-hidden overflow-y-auto scrollbar-hide',
                    device === 'mobile' && 'rounded-b-[1.625rem]',
                    device === 'desktop' && 'rounded-b-2xl',
                    previewSection === 'presentation' ? 'p-0' : 'space-y-4 p-5',
                  )}
                >
                  {previewSection === 'presentation' ? (
                    <FlowPresentationPreview
                      flow={flow}
                      stepCount={localSteps.length}
                      workspaceLogoUrl={workspaceLogoUrl}
                    />
                  ) : (
                    <>
                      <FlowMainPreviewProgressChrome totalSteps={localSteps.length} />
                      <PreviewBubble role="assistant">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#1A1A1A] dark:text-[#F8F9FB]">
                          {resolvePublicFlowChatOpening(flow)}
                        </p>
                      </PreviewBubble>
                      {localSteps.map((s) => (
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
          )}

          {/* ── Bottom toolbar ─────────────────────────────────────── */}
          <div
            className={cn(
              'flex shrink-0 flex-wrap items-center gap-2 border-t px-4 py-4',
              workspaceDivider,
              workspaceSurface,
            )}
          >
            {!isEditMode && (
              <>
                <span className="mr-1 text-xs font-medium text-[#6B7280] dark:text-[#9CA3AF]">Vista previa</span>
                <DevicePreviewToggle device={device} onChange={setDevice} />
              </>
            )}
            <div className="inline-flex items-center gap-1" role="tablist" aria-label="Modo del lienzo">
              <button
                type="button"
                role="tab"
                aria-selected={previewSection === 'edit'}
                onClick={() => setPreviewSection('edit')}
                className={sectionTabClass('edit')}
              >
                Editar pasos
              </button>
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
                className="ml-auto text-xs font-medium text-[#64748B] underline-offset-4 transition-colors hover:text-[#475569] dark:text-[#94A3B8] dark:hover:text-[#CBD5E1] underline decoration-[#CBD5E1]/70"
              >
                Abrir vista pública
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Supporting preview components (unchanged)
// ---------------------------------------------------------------------------

function FlowMainPreviewProgressChrome({ totalSteps }: { totalSteps: number }) {
  const hasSteps = totalSteps > 0
  const denom = Math.max(1, totalSteps)
  const current = hasSteps ? 1 : 0
  const pct = hasSteps ? Math.min(100, Math.round((current / denom) * 100)) : 0

  return (
    <div
      className="mb-4 w-full border-b border-border bg-linear-to-b from-white/95 to-white/88 px-3 pb-3 pt-2 backdrop-blur-md dark:from-[#1A1D29]/98 dark:to-[#1A1D29]/88"
      role="region"
      aria-label="Ejemplo de barra de avance en la conversación"
    >
      <div className="mx-auto max-w-[680px]">
        <div className="mb-2 flex min-h-[52px] items-center gap-2.5">
          <button
            type="button"
            disabled
            tabIndex={-1}
            className="flex h-10 w-10 shrink-0 cursor-default items-center justify-center rounded-lg border border-dilo-500/25 bg-white/85 text-dilo-600 opacity-95 dark:border-[#3d3558] dark:bg-[#252936] dark:text-[#D4C4FC]"
            title="Volver (solo en la versión pública)"
            aria-hidden
          >
            <ChevronLeftIcon className="h-5 w-5" strokeWidth={1.75} />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-center sm:justify-start">
            <span className="bg-linear-to-r from-dilo-500 via-[#8B5CF6] to-mint-500 bg-clip-text text-[1.35rem] font-extrabold leading-none tracking-tight text-transparent sm:text-[1.5rem]">
              Dilo
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-baseline gap-0.5 tabular-nums">
              <span className="bg-linear-to-r from-dilo-500 to-mint-500 bg-clip-text text-[1.35rem] font-extrabold text-transparent">
                {pct}
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">%</span>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-white/85 text-muted-foreground dark:bg-[#252936]">
              <MoonIcon className="h-4 w-4" strokeWidth={1.75} />
            </span>
          </div>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-dilo-500/15 shadow-[inset_0_1px_2px_rgba(15,11,26,0.06)] dark:bg-dilo-500/20 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
          <div
            className="h-full rounded-full bg-linear-to-r from-dilo-500 to-mint-500 shadow-[0_0_14px_rgba(156,119,245,0.35)] transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-center text-[11px] font-semibold tracking-wide text-muted-foreground">
          {hasSteps
            ? `${current} de ${totalSteps} · seguimos cuando quieras`
            : 'Sin pasos aún · aquí verás el avance del visitante'}
        </p>
      </div>
    </div>
  )
}

function PreviewBubble({ role, children }: { role: 'assistant' | 'user'; children: React.ReactNode }) {
  if (role === 'assistant') {
    return (
      <div className="flex justify-start">
        <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-[#E8EAEF] bg-[#FAFBFC] px-4 py-3 text-[#1A1A1A] dark:border-[#2A2F3F] dark:bg-[#1c1f2a] dark:text-[#F8F9FB]">
          {children}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-4 py-3 text-left text-white shadow-sm shadow-[#9C77F5]/18">
        {children}
      </div>
    </div>
  )
}
