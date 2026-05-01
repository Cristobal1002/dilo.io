'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { ChevronLeftIcon, MoonIcon, PencilSquareIcon, PhotoIcon, SunIcon } from '@heroicons/react/24/outline'
import { readApiResult } from '@/lib/read-api-result'
import type { PublicFlowRecord, PublicFlowStep } from '@/lib/load-published-flow'
import { DILO_THEME_CHANGE_EVENT } from '@/lib/theme-event'
import { DiloPhoneField, isValidPhoneNumber } from '@/components/dilo-phone-field'
import { buildPhoneStepFooterHint } from '@/lib/phone-e164'
import { cn } from '@/lib/utils'
import {
  buildFileItemsFromFiles,
  formatFileAnswerForBubble,
  isFilePayload,
  stripFileDataUrlsFromAnswers,
  type FileAnswerPayload,
} from '@/lib/public-flow-file-helpers'
import { FlowDemoVideo } from '@/components/flow-demo-video'
import { PublicFlowBrandingFooter } from '@/components/public-flow-branding'
import { readDemoVideoUrlFromSettings } from '@/lib/demo-video-embed'
import { resolvePublicFlowChatOpening } from '@/lib/public-flow-chat-opening'
import {
  buildMultiOtherStored,
  buildSelectOtherStored,
  formatMultiAnswerForDisplay,
  formatSelectAnswerForDisplay,
  normalizeMultiStored,
  optionTriggersOtherDetail,
  parseSelectStored,
  selectStoredPrimaryValue,
  selectionNeedsOtherDetail,
} from '@/lib/step-choice-helpers'
import { isStepSkippedByRules, nextStepIndexAfterAnswer } from '@/lib/step-skip'

const THEME_KEY = 'theme'

function sessionStorageKey(flowId: string) {
  return `dilo-f-session:${flowId}`
}

function getThemeSnapshot() {
  if (typeof window === 'undefined') return 'light'
  const s = localStorage.getItem(THEME_KEY)
  if (s === 'dark' || s === 'light') return s
  return 'light'
}

function subscribeTheme(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = () => cb()
  media.addEventListener('change', handler)
  window.addEventListener('storage', handler)
  window.addEventListener(DILO_THEME_CHANGE_EVENT, handler)
  return () => {
    media.removeEventListener('change', handler)
    window.removeEventListener('storage', handler)
    window.removeEventListener(DILO_THEME_CHANGE_EVENT, handler)
  }
}

function ThemeToggle({ className }: { className?: string }) {
  const isDark = useSyncExternalStore(subscribeTheme, () => getThemeSnapshot() === 'dark', () => false)
  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem(THEME_KEY, next ? 'dark' : 'light')
    window.dispatchEvent(new CustomEvent(DILO_THEME_CHANGE_EVENT))
  }
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'rounded-xl border border-[#E5E7EB]/90 bg-white/90 p-2 text-[#6B7280] shadow-[0_2px_12px_rgba(15,11,26,0.05)] backdrop-blur-sm transition-colors hover:bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29]/90 dark:text-[#9CA3AF] dark:shadow-[0_2px_16px_rgba(0,0,0,0.25)]',
        className,
      )}
      aria-label={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <SunIcon className="h-4 w-4" strokeWidth={1.5} /> : <MoonIcon className="h-4 w-4" strokeWidth={1.5} />}
    </button>
  )
}

type Msg = {
  id: string
  role: 'assistant' | 'user'
  content: string
  stepId?: string
  isTransition?: boolean
  /** Saludo / contexto antes de la primera pregunta. */
  isOpening?: boolean
}

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function interpolate(text: string, lead: Record<string, string>) {
  return text.replace(/\{([^}]+)\}/g, (_, k: string) => lead[k] ?? `{${k}}`)
}

function parseBold(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
  )
}

function bubbleText(step: PublicFlowStep, stored: string) {
  if (step.type === 'file') {
    if (stored === '') return 'Sin adjunto'
    try {
      const p = JSON.parse(stored) as unknown
      if (isFilePayload(p)) return formatFileAnswerForBubble(p)
    } catch {
      return stored
    }
    return stored
  }
  if (step.type === 'multi_select') return formatMultiAnswerForDisplay(stored, step.options)
  if (step.type === 'select') return formatSelectAnswerForDisplay(stored, step.options)
  if (step.type === 'yes_no') return stored === 'yes' ? 'Sí' : stored === 'no' ? 'No' : stored
  return stored
}

function buildLead(steps: PublicFlowStep[], answers: Record<string, string>) {
  const lead: Record<string, string> = {}
  for (const s of steps) {
    const raw = answers[s.id]
    if (raw == null || raw === '') continue
    if (s.type === 'file') {
      try {
        const p = JSON.parse(raw) as unknown
        if (isFilePayload(p)) {
          lead[s.variableName] = formatFileAnswerForBubble(p)
          continue
        }
      } catch {
        /* fallthrough */
      }
    }
    lead[s.variableName] = bubbleText(s, raw)
  }
  return lead
}

function stepIsAnswered(step: PublicFlowStep, answers: Record<string, string>) {
  if (!(step.id in answers)) return false
  if (step.type === 'file') {
    const raw = answers[step.id]
    try {
      const p = JSON.parse(raw) as unknown
      if (isFilePayload(p)) return p.skipped || (Array.isArray(p.items) && p.items.length > 0)
    } catch {
      return raw !== ''
    }
    return false
  }
  const v = answers[step.id]
  if (v == null || v === '') return false
  if (step.type === 'select') {
    const p = parseSelectStored(v)
    if (typeof p === 'object') return p.detail.trim().length > 0
    return true
  }
  if (step.type === 'multi_select') {
    const { values, otherDetail } = normalizeMultiStored(v)
    if (values.length === 0 && !(otherDetail && otherDetail.trim())) return false
    if (selectionNeedsOtherDetail(values, step.options)) {
      return (otherDetail?.trim() ?? '').length > 0
    }
    return values.length > 0
  }
  return true
}

function firstOpenStep(steps: PublicFlowStep[], answers: Record<string, string>) {
  for (let i = 0; i < steps.length; i++) {
    if (isStepSkippedByRules(steps[i], answers, steps)) continue
    if (!stepIsAnswered(steps[i], answers)) return i
  }
  return steps.length
}

async function fetchAcknowledge(params: {
  flowId: string
  sessionToken: string
  stepId: string
  answeredStepQuestion: string
  answer: string
  variableName: string
  nextQuestion: string
  collectedData: Record<string, string>
}): Promise<{ message: string } | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 26_000)
    const res = await fetch(`/api/f/${params.flowId}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionToken: params.sessionToken,
        stepId: params.stepId,
        answeredStepQuestion: params.answeredStepQuestion,
        answer: params.answer,
        variableName: params.variableName,
        nextQuestion: params.nextQuestion,
        collectedData: params.collectedData,
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) return null
    const json = (await res.json()) as { success?: boolean; data?: { message?: string } }
    if (json.success === false) return null
    const msg = typeof json.data?.message === 'string' ? json.data.message.trim() : ''
    return { message: msg }
  } catch {
    return null
  }
}

function readTransitionSettings(flow: PublicFlowRecord): { style: 'ai' | 'none'; tone: string } {
  const o = flow.settings && typeof flow.settings === 'object' ? (flow.settings as Record<string, unknown>) : {}
  const style = o.transition_style === 'ai' ? 'ai' : 'none'
  const tone =
    typeof o.tone === 'string' && o.tone.trim() ? o.tone.trim().slice(0, 220) : 'cálido, breve y natural'
  return { style, tone }
}

function rebuildMessages(currentStepIdx: number, steps: PublicFlowStep[], answers: Record<string, string>) {
  const lead = buildLead(steps, answers)
  const out: Msg[] = []
  for (let i = 0; i < currentStepIdx; i++) {
    const s = steps[i]
    if (isStepSkippedByRules(s, answers, steps)) continue
    out.push({ id: uid(), role: 'assistant', content: interpolate(s.question, lead) })
    if (stepIsAnswered(s, answers)) {
      const stored = answers[s.id] ?? ''
      out.push({ id: uid(), role: 'user', content: bubbleText(s, stored), stepId: s.id })
    }
  }
  const cur = steps[currentStepIdx]
  if (cur && !isStepSkippedByRules(cur, answers, steps)) {
    out.push({ id: uid(), role: 'assistant', content: interpolate(cur.question, lead) })
  }
  return out
}

function buildFullThread(steps: PublicFlowStep[], answers: Record<string, string>) {
  const lead = buildLead(steps, answers)
  const out: Msg[] = []
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    if (isStepSkippedByRules(s, answers, steps)) continue
    out.push({ id: uid(), role: 'assistant', content: interpolate(s.question, lead) })
    if (stepIsAnswered(s, answers)) {
      const stored = answers[s.id] ?? ''
      out.push({ id: uid(), role: 'user', content: bubbleText(s, stored), stepId: s.id })
    }
  }
  return out
}

/** Inserta una burbuja de saludo antes de la primera pregunta (texto desde `chat_intro`, descripción o fallback). */
function withOpeningLine(msgs: Msg[], flow: PublicFlowRecord): Msg[] {
  const text = resolvePublicFlowChatOpening(flow).trim()
  if (!text || msgs.length === 0) return msgs
  const i = msgs.findIndex((m) => m.role === 'assistant')
  if (i < 0) return msgs
  const copy = [...msgs]
  copy.splice(i, 0, { id: uid(), role: 'assistant', content: text, isOpening: true })
  return copy
}

function canEditUserBubble(msg: Msg, stepIdx: number, steps: PublicFlowStep[]) {
  if (msg.role !== 'user' || !msg.stepId) return false
  const ix = steps.findIndex((s) => s.id === msg.stepId)
  return ix >= 0 && ix < stepIdx
}

/** Datos del flow publicados, resueltos en el servidor (RSC) y pasados al cliente. */
export type PublicFlowInitialPayload = { flow: PublicFlowRecord; steps: PublicFlowStep[] }

function completionFromSettings(settings: unknown) {
  if (!settings || typeof settings !== 'object') return null
  const m = (settings as { completion_message?: string }).completion_message
  return typeof m === 'string' && m.trim() ? m.trim() : null
}

function chatLogoUrl(flow: PublicFlowRecord): string | null {
  const o = flow.settings && typeof flow.settings === 'object' ? (flow.settings as Record<string, unknown>) : {}
  const u = o.logo_url
  return typeof u === 'string' && /^https?:\/\//.test(u) ? u : null
}

function FlowChatHeader({
  flow,
  stepIdx,
  totalSteps,
  isTyping,
  isDone,
  onBack,
  embedded,
}: {
  flow: PublicFlowRecord
  stepIdx: number
  totalSteps: number
  isTyping: boolean
  isDone: boolean
  onBack: () => void
  embedded?: boolean
}) {
  if (embedded) return null
  const idx = Math.max(0, stepIdx)
  const n = totalSteps > 0 ? Math.min(idx + 1, totalSteps) : 0
  const pct = totalSteps > 0 ? Math.round((n / totalSteps) * 100) : 0
  const showBack = !isTyping && !isDone && stepIdx >= 0
  const logo = chatLogoUrl(flow)

  return (
    <header className="sticky top-0 z-10 shrink-0 border-b border-[#9C77F5]/12 bg-linear-to-b from-[rgba(250,247,255,0.95)] to-[rgba(250,247,255,0.68)] pt-[max(6px,env(safe-area-inset-top))] backdrop-blur-md dark:border-[#2A2F3F] dark:from-[rgba(26,29,41,0.96)] dark:to-[rgba(26,29,41,0.76)]">
      <div className="mx-auto max-w-lg px-3.5 pb-2">
        <div className="flex items-center gap-2.5">
          {showBack ? (
            <button
              type="button"
              onClick={onBack}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#9C77F5]/25 bg-white/80 text-[#7B5BD4] shadow-[0_2px_10px_rgba(15,11,26,0.05)] transition-colors hover:bg-white dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#D4C4FC] dark:hover:bg-[#2a3040]"
              aria-label="Volver a la pregunta anterior"
            >
              <ChevronLeftIcon className="h-5 w-5" strokeWidth={2} />
            </button>
          ) : (
            <span className="h-10 w-10 shrink-0" aria-hidden />
          )}
          <div className="flex min-h-[44px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-center">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="h-9 max-h-9 w-auto max-w-[min(56vw,200px)] object-contain object-center"
              />
            ) : (
              <span className="bg-linear-to-r from-[#9C77F5] to-[#00d4b0] bg-clip-text text-[1.35rem] font-extrabold leading-none tracking-tight text-transparent sm:text-2xl">
                Dilo
              </span>
            )}
            <span className="max-w-[min(72vw,260px)] truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B4DD4] dark:text-[#D4C4FC]">
              {flow.name}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex items-baseline gap-0.5">
              <span className="bg-linear-to-r from-[#9C77F5] to-[#00d4b0] bg-clip-text text-[1.35rem] font-extrabold tabular-nums text-transparent sm:text-[1.4rem]">
                {pct}
              </span>
              <span className="text-[13px] font-semibold text-[#5B5670] dark:text-[#9CA3AF]">%</span>
            </div>
            <ThemeToggle />
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#9C77F5]/15 shadow-[inset_0_1px_2px_rgba(15,11,26,0.06)] dark:bg-[#9C77F5]/20 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
          <div
            className="h-full rounded-full bg-linear-to-r from-[#9C77F5] to-[#00d4b0] shadow-[0_0_18px_rgba(156,119,245,0.45)] transition-[width] duration-550 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${isDone ? 100 : pct}%` }}
          />
        </div>
        <p className="mt-2 text-center text-[11px] font-semibold tabular-nums tracking-wide text-[#5B5670] dark:text-[#9CA3AF]">
          {n} de {totalSteps} · seguimos cuando quieras
        </p>
      </div>
    </header>
  )
}

function welcomeCopy(flow: PublicFlowRecord, stepCount: number) {
  const o = flow.settings && typeof flow.settings === 'object' ? (flow.settings as Record<string, unknown>) : {}
  const label =
    typeof o.presentation_label === 'string' && o.presentation_label.trim()
      ? o.presentation_label.trim()
      : 'Bienvenida'
  const tagline =
    typeof o.tagline === 'string' && o.tagline.trim()
      ? o.tagline.trim()
      : 'Sin formularios largos: una conversación guiada para recoger lo que necesitamos.'
  let min = 3
  let max = 8
  if (typeof o.estimated_minutes_min === 'number') min = o.estimated_minutes_min
  if (typeof o.estimated_minutes_max === 'number') max = o.estimated_minutes_max
  else if (stepCount > 0) {
    min = Math.max(3, Math.round(stepCount * 0.25))
    max = Math.max(min + 2, Math.round(stepCount * 0.52))
  }
  const tonePill = typeof o.tone_pill === 'string' && o.tone_pill.trim() ? o.tone_pill.trim() : 'Claro y humano'
  const timeLabel = min === max ? `~${min} min` : `${min}–${max} min`
  return { label, tagline, timeLabel, tonePill }
}

function resolveFileStepConfig(step: PublicFlowStep) {
  const fc = step.fileConfig && typeof step.fileConfig === 'object' ? (step.fileConfig as Record<string, unknown>) : {}
  const accept =
    typeof fc.accept === 'string' && fc.accept.trim()
      ? fc.accept
      : 'image/png,image/jpeg,image/jpg,image/webp,image/gif,application/pdf'
  const maxFiles =
    typeof fc.maxFiles === 'number' && fc.maxFiles > 0 ? Math.min(Math.floor(fc.maxFiles), 10) : 1
  const maxBytesPerFile =
    typeof fc.maxBytesPerFile === 'number' && fc.maxBytesPerFile > 0
      ? fc.maxBytesPerFile
      : 5 * 1024 * 1024
  return { accept, maxFiles, maxBytesPerFile, optional: !step.required }
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full px-4 py-2.5 text-left text-[13px] font-medium transition-all duration-200',
        active
          ? 'border border-transparent bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] text-white shadow-[0_4px_18px_rgba(156,119,245,0.35)]'
          : 'border border-[#9C77F5]/22 bg-white/90 text-[#1A1A1A] shadow-[0_2px_10px_rgba(15,11,26,0.04)] dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]',
      )}
    >
      {label}
    </button>
  )
}

function InputFooterShell({
  children,
  hint,
  topSlot,
}: {
  children: React.ReactNode
  hint?: string | null
  topSlot?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'shrink-0 rounded-t-[24px] border-t border-[#9C77F5]/14 bg-white/88 px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 shadow-[0_-12px_40px_rgba(15,11,26,0.06)] backdrop-blur-lg dark:border-[#2A2F3F] dark:bg-[#1A1D29]/92 dark:shadow-[0_-16px_48px_rgba(0,0,0,0.35)]',
      )}
    >
      <div className="mx-auto max-w-lg">
        {topSlot}
        {children}
      </div>
      {hint ? <p className="mx-auto mt-2 max-w-lg text-center text-xs text-[#9CA3AF] dark:text-[#6B7280]">{hint}</p> : null}
    </div>
  )
}

function FlowDoneCelebration({
  flow,
  steps,
  answers,
  completion,
  showSummary,
  onToggleSummary,
  isEmbed,
}: {
  flow: PublicFlowRecord
  steps: PublicFlowStep[]
  answers: Record<string, string>
  completion: string | null
  showSummary: boolean
  onToggleSummary: () => void
  isEmbed?: boolean
}) {
  const rows = steps.filter((s) => stepIsAnswered(s, answers))
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-linear-to-b from-[#FAF7FF] via-white to-[#E8FFF8] dark:from-[#0F1117] dark:via-[#151828] dark:to-[#0a1620]">
      <style>{`
        @keyframes dilo-confetti { 0%{transform:translateY(0) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        @keyframes dilo-pop { 0%{transform:scale(0.6);opacity:0} 55%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }
      `}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {['🎉', '✨', '🎊', '💜', '🌿', '⭐', '🎈', '💫'].map((emoji, i) => (
          <span
            key={i}
            className="absolute text-lg opacity-70 sm:text-xl"
            style={{
              left: `${8 + (i * 11) % 84}%`,
              top: '-4%',
              animation: `dilo-confetti ${7 + (i % 4)}s linear infinite`,
              animationDelay: `${i * 0.35}s`,
            }}
          >
            {emoji}
          </span>
        ))}
        <div className="absolute -top-20 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#9C77F5]/25 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[320px] rounded-full bg-[#00d4b0]/15 blur-[90px]" />
      </div>
      {!isEmbed ? (
        <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
          <ThemeToggle />
        </div>
      ) : null}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-md text-center"
          style={{ animation: 'dilo-pop 0.65s cubic-bezier(0.22,1,0.36,1) both' }}
        >
          <p className="mb-2 text-6xl drop-shadow-sm sm:text-7xl">🎉</p>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9C77F5] dark:text-[#D4C4FC]">Dilo</p>
          <h2 className="mt-2 bg-linear-to-r from-[#9C77F5] via-[#B799F8] to-[#00d4b0] bg-clip-text text-3xl font-extrabold tracking-tight text-transparent sm:text-4xl">
            ¡Lo lograste!
          </h2>
          <p className="mt-2 text-sm font-semibold text-[#6B4DD4] dark:text-[#D4C4FC]">{flow.name}</p>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[#5B5670] dark:text-[#9CA3AF]">
            {completion ?? 'Gracias por completar el flow. Tus respuestas ya están guardadas.'}
          </p>
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={onToggleSummary}
              className="rounded-full border-2 border-[#9C77F5]/40 bg-white/90 px-8 py-3 text-sm font-bold text-[#6B4DD4] shadow-[0_8px_24px_rgba(156,119,245,0.2)] backdrop-blur-sm transition hover:border-[#9C77F5] hover:shadow-[0_12px_32px_rgba(156,119,245,0.28)] dark:border-[#9C77F5]/50 dark:bg-[#1A1D29]/90 dark:text-[#D4C4FC]"
            >
              {showSummary ? 'Ocultar mis respuestas' : 'Ver mis respuestas'}
            </button>
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Solo si quieres repasar lo que enviaste</p>
          </div>
          {showSummary ? (
            <div className="mt-8 w-full max-w-md rounded-3xl border border-[#9C77F5]/15 bg-white/90 p-5 text-left shadow-[0_20px_50px_rgba(15,11,26,0.08)] backdrop-blur-md dark:border-[#2A2F3F] dark:bg-[#1A1D29]/95">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#9C77F5]">Resumen</p>
              <ul className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {rows.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-[#9C77F5]/10 bg-[#FAFAFC] px-3 py-2.5 dark:border-[#2A2F3F] dark:bg-[#252936]"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#9CA3AF]">
                      {s.variableName}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B4DD4] dark:text-[#D4C4FC]">{s.question}</p>
                    <p className="mt-1.5 text-sm font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">
                      {bubbleText(s, answers[s.id] ?? '')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <PublicFlowBrandingFooter flow={flow} />
    </div>
  )
}

function WelcomeScreen({
  flow,
  stepCount,
  resumeAvailable,
  chatProgressPaused,
  onStartFresh,
  onResume,
  onDiscard,
  onReturnToChat,
}: {
  flow: PublicFlowRecord
  stepCount: number
  resumeAvailable: boolean
  chatProgressPaused: boolean
  onStartFresh: () => void
  onResume: () => void
  onDiscard: () => void
  onReturnToChat: () => void
}) {
  const w = welcomeCopy(flow, stepCount)
  const demoVideoUrl = readDemoVideoUrlFromSettings(flow.settings)
  return (
    <div className="flex min-h-dvh flex-col px-5 py-10 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#7B5BD4] opacity-90 dark:text-[#D4C4FC]">
        {w.label}
      </p>
      <h1 className="mb-4 max-w-md text-[1.75rem] font-extrabold leading-snug tracking-tight text-[#1A1A1A] dark:text-[#F8F9FB] sm:text-[2rem]">
        {flow.name}
        <span className="block bg-linear-to-r from-[#9C77F5] to-[#00d4b0] bg-clip-text text-transparent">
          — conversación guiada
        </span>
      </h1>
      {flow.description?.trim() ? (
        <p className="mb-4 max-w-md text-left text-[15px] leading-relaxed text-[#4B5563] dark:text-[#B8BCC9] whitespace-pre-wrap">
          {flow.description.trim()}
        </p>
      ) : null}
      {demoVideoUrl ? (
        <div className="mb-6 w-full max-w-md">
          <FlowDemoVideo url={demoVideoUrl} clickToLoadIframe={false} />
        </div>
      ) : null}
      <p className="mb-8 max-w-md text-base leading-relaxed text-[#5B5670] dark:text-[#9CA3AF]">{w.tagline}</p>
      <div className="mb-9 flex flex-wrap justify-center gap-2">
        {[`⏱️ ${w.timeLabel}`, `💬 ~${stepCount} pasos`, `🎯 ${w.tonePill}`].map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-[#9C77F5]/20 bg-white/75 px-3.5 py-2 text-xs font-semibold text-[#6B4DD4] backdrop-blur-sm dark:border-[#2A2F3F] dark:bg-[#252936]/90 dark:text-[#D4C4FC]"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="flex flex-col items-center gap-3">
        {chatProgressPaused ? (
          <>
            <button
              type="button"
              onClick={onReturnToChat}
              className="rounded-full bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-10 py-4 text-[15px] font-bold text-white shadow-[0_8px_28px_rgba(156,119,245,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(156,119,245,0.5)]"
            >
              Volver a la conversación
            </button>
            <button
              type="button"
              onClick={onStartFresh}
              className="rounded-full border-2 border-[#9C77F5] bg-transparent px-7 py-3 text-sm font-bold text-[#9C77F5] transition hover:bg-[#9C77F5]/8"
            >
              Empezar de nuevo
            </button>
            {resumeAvailable ? (
              <button
                type="button"
                onClick={onDiscard}
                className="rounded-full border border-[#E5E7EB] bg-transparent px-5 py-3 text-[13px] font-semibold text-[#6B7280] dark:border-[#2A2F3F] dark:text-[#9CA3AF]"
              >
                Descartar borrador
              </button>
            ) : null}
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onStartFresh}
              className="rounded-full bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-10 py-4 text-[15px] font-bold text-white shadow-[0_8px_28px_rgba(156,119,245,0.45)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(156,119,245,0.5)]"
            >
              {resumeAvailable ? 'Empezar de nuevo' : 'Empezar ahora'}
            </button>
            {resumeAvailable ? (
              <div className="flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onResume}
                  className="rounded-full border-2 border-[#9C77F5] bg-transparent px-7 py-3 text-sm font-bold text-[#9C77F5] transition hover:bg-[#9C77F5]/8"
                >
                  Continuar donde lo dejé
                </button>
                <button
                  type="button"
                  onClick={onDiscard}
                  className="rounded-full border border-[#E5E7EB] bg-transparent px-5 py-3 text-[13px] font-semibold text-[#6B7280] dark:border-[#2A2F3F] dark:text-[#9CA3AF]"
                >
                  Descartar borrador
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
      </div>
      <PublicFlowBrandingFooter flow={flow} />
    </div>
  )
}

export function PublicFlowRunner({
  flowId,
  initialPayload,
  isEmbed = false,
}: {
  flowId: string
  initialPayload: PublicFlowInitialPayload
  isEmbed?: boolean
}) {
  const { flow, steps } = initialPayload

  useEffect(() => {
    const t = localStorage.getItem(THEME_KEY)
    document.documentElement.classList.toggle('dark', t === 'dark')
  }, [])

  type Phase = 'loading' | 'error' | 'empty' | 'welcome' | 'chat' | 'done'
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const [resumePayload, setResumePayload] = useState<{
    answers: Record<string, string>
    open: number
    token: string
  } | null>(null)

  const [messages, setMessages] = useState<Msg[]>([])
  const [stepIdx, setStepIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [editingStepId, setEditingStepId] = useState<string | null>(null)
  const [showDoneSummary, setShowDoneSummary] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [fileErr, setFileErr] = useState('')
  const [fileBusy, setFileBusy] = useState(false)
  const [phoneFooterIso, setPhoneFooterIso] = useState('co')
  /** Select con opción "Otro": pedir detalle antes de avanzar. */
  const [pendingSelectOther, setPendingSelectOther] = useState<{ stepId: string; value: string } | null>(null)
  const [otherDetailInput, setOtherDetailInput] = useState('')
  const [multiOtherDetail, setMultiOtherDetail] = useState('')
  const [multiOtherErr, setMultiOtherErr] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  const answersRef = useRef(answers)
  const stepIdxRef = useRef(stepIdx)
  const phaseRef = useRef(phase)
  const editingStepIdRef = useRef<string | null>(null)
  const tokenRef = useRef<string | null>(null)
  const advancingRef = useRef(false)
  useEffect(() => {
    answersRef.current = answers
  }, [answers])
  useEffect(() => {
    stepIdxRef.current = stepIdx
  }, [stepIdx])
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])
  useEffect(() => {
    editingStepIdRef.current = editingStepId
  }, [editingStepId])
  useEffect(() => {
    tokenRef.current = token
  }, [token])

  useEffect(() => {
    if (!isEmbed) return
    const id = window.requestAnimationFrame(() => {
      try {
        const h = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, 320)
        window.parent.postMessage({ type: 'dilo:resize', flowId: flow.id, height: h }, '*')
      } catch {
        /* noop */
      }
    })
    return () => window.cancelAnimationFrame(id)
  }, [isEmbed, flow.id, messages, phase, stepIdx, isTyping, answers, showDoneSummary])

  const putSession = useCallback(async () => {
    const t = token
    if (!t || phase !== 'chat') return
    const stripped = stripFileDataUrlsFromAnswers(answersRef.current)
    const res = await fetch(`/api/f/${flowId}/sessions/${encodeURIComponent(t)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        answers: stripped,
        currentStepIndex: stepIdxRef.current,
        completed: phaseRef.current === 'done',
      }),
    })
    if (!res.ok) {
      const r = await readApiResult(res)
      if (!r.ok) console.warn('[public-flow] save failed', r.message)
    }
  }, [flowId, token, phase])

  const flushCompleteSession = useCallback(async () => {
    const t = token
    if (!t) return
    // Al completar persistimos data URLs de archivos para que el panel pueda descargarlos.
    const body = {
      answers: answersRef.current,
      currentStepIndex: stepIdxRef.current,
      completed: true,
    }
    const res = await fetch(`/api/f/${flowId}/sessions/${encodeURIComponent(t)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const r = await readApiResult(res)
      if (!r.ok) console.warn('[public-flow] complete save failed', r.message)
    }
  }, [flowId, token])

  useEffect(() => {
    if (!token || phase !== 'chat') return
    const tmr = setTimeout(() => {
      void putSession()
    }, 450)
    return () => clearTimeout(tmr)
  }, [token, phase, answers, stepIdx, editingStepId, putSession])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    })
  }, [messages, isTyping, stepIdx, phase])

  /**
   * Único efecto necesario para el arranque: `sessionStorage` y la API de sesión solo existen en el cliente
   * y son asíncronos; no se pueden resolver en RSC. El flow y los pasos ya vienen en `initialPayload`.
   */
  useEffect(() => {
    const ac = new AbortController()
    const { signal } = ac
    let cancelled = false

    async function hydrateClientSession() {
      try {
        setPhase('loading')
        setErrorMsg('')
        setResumeAvailable(false)
        setResumePayload(null)

        if (steps.length === 0) {
          setPhase('empty')
          setErrorMsg('Este flow no tiene pasos publicados.')
          return
        }

        let t: string | null = null
        try {
          t = sessionStorage.getItem(sessionStorageKey(flowId))
        } catch {
          t = null
        }

        if (t) {
          const sr = await fetch(`/api/f/${encodeURIComponent(flowId)}/sessions/${encodeURIComponent(t)}`, {
            signal,
          })
          const sessionRes = await readApiResult<{
            session: { status: string; metadata: unknown }
            answers: Record<string, string | null>
          }>(sr)
          if (cancelled || signal.aborted) return
          if (!sessionRes.ok) {
            try {
              sessionStorage.removeItem(sessionStorageKey(flowId))
            } catch {
              /* ignore */
            }
            t = null
          } else {
            const raw = sessionRes.data.answers
            const norm: Record<string, string> = {}
            for (const [k, v] of Object.entries(raw)) {
              if (v != null) norm[k] = v
            }
            const done = sessionRes.data.session.status === 'completed'
            const meta = sessionRes.data.session.metadata as { currentStepIndex?: number } | null
            if (done) {
              setToken(t)
              setAnswers(norm)
              setMessages(buildFullThread(steps, norm))
              setStepIdx(Math.max(0, steps.length - 1))
              setShowDoneSummary(false)
              setPhase('done')
              return
            }
            const open = firstOpenStep(steps, norm)
            const touched =
              Object.keys(norm).length > 0 ||
              (typeof meta?.currentStepIndex === 'number' && meta.currentStepIndex > 0)
            const canResume = touched && open < steps.length
            setToken(t)
            setAnswers(norm)
            setResumeAvailable(canResume)
            if (canResume) {
              setResumePayload({ answers: norm, open, token: t })
            }
            setStepIdx(0)
            setMessages([])
            setPhase('welcome')
            return
          }
        }

        setToken(null)
        setAnswers({})
        setResumeAvailable(false)
        setPhase('welcome')
      } catch (e) {
        if (signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return
        if (!cancelled) {
          setErrorMsg('No se pudo comprobar la sesión guardada. Revisa tu conexión e inténtalo de nuevo.')
          setPhase('error')
        }
      }
    }
    void hydrateClientSession()
    return () => {
      cancelled = true
      ac.abort()
    }
  }, [flowId, flow.id, steps.length])

  const enterChatFresh = useCallback(
    (st: PublicFlowStep[], tok: string) => {
      try {
        sessionStorage.setItem(sessionStorageKey(flowId), tok)
      } catch {
        /* ignore */
      }
      setToken(tok)
      setAnswers({})
      setEditingStepId(null)
      setShowDoneSummary(false)
      setStepIdx(0)
      setIsTyping(true)
      setPhase('chat')
      setTimeout(() => {
        setMessages(withOpeningLine(rebuildMessages(0, st, {}), flow))
        setIsTyping(false)
      }, 480)
    },
    [flowId, flow.id, flow],
  )

  const enterChatResume = useCallback(
    (st: PublicFlowStep[], norm: Record<string, string>, open: number) => {
      setAnswers(norm)
      setEditingStepId(null)
      setShowDoneSummary(false)
      const idx = Math.min(open, st.length - 1)
      setStepIdx(idx)
      setMessages(withOpeningLine(rebuildMessages(open, st, norm), flow))
      setPhase('chat')
    },
    [flow.id, flow],
  )

  const handleWelcomeStartFresh = useCallback(async () => {
    const st = steps
    if (token && !resumeAvailable) {
      enterChatFresh(st, token)
      return
    }
    try {
      sessionStorage.removeItem(sessionStorageKey(flowId))
    } catch {
      /* ignore */
    }
    const pr = await fetch(`/api/f/${encodeURIComponent(flowId)}/sessions`, { method: 'POST' })
    const postRes = await readApiResult<{ session: { token: string } }>(pr)
    if (!postRes.ok) {
      setErrorMsg(postRes.message)
      setPhase('error')
      return
    }
    enterChatFresh(st, postRes.data.session.token)
  }, [flow.id, flow, steps, token, resumeAvailable, flowId, enterChatFresh])

  const handleWelcomeResume = useCallback(() => {
    if (!resumePayload) return
    enterChatResume(steps, resumePayload.answers, resumePayload.open)
  }, [resumePayload, steps, enterChatResume])

  const handleWelcomeReturnToChat = useCallback(() => {
    setEditingStepId(null)
    setShowDoneSummary(false)
    setTextInput('')
    setSelected([])
    setPendingFiles([])
    setFileErr('')
    setPhase('chat')
    setMessages(withOpeningLine(rebuildMessages(stepIdx, steps, answers), flow))
  }, [flow.id, flow, stepIdx, steps, answers])

  const handleDiscardDraft = useCallback(async () => {
    try {
      sessionStorage.removeItem(sessionStorageKey(flowId))
    } catch {
      /* ignore */
    }
    setResumePayload(null)
    setResumeAvailable(false)
    setToken(null)
    setAnswers({})
    setMessages([])
    setStepIdx(0)
    setEditingStepId(null)
    setTextInput('')
    setSelected([])
    setPendingFiles([])
    setFileErr('')
    const pr = await fetch(`/api/f/${encodeURIComponent(flowId)}/sessions`, { method: 'POST' })
    const postRes = await readApiResult<{ session: { token: string } }>(pr)
    if (!postRes.ok) {
      setErrorMsg(postRes.message)
      setPhase('error')
      return
    }
    try {
      sessionStorage.setItem(sessionStorageKey(flowId), postRes.data.session.token)
    } catch {
      /* ignore */
    }
    setToken(postRes.data.session.token)
  }, [flowId])

  const current = steps[stepIdx]
  const activeStep = useMemo(
    () => (editingStepId ? steps.find((s) => s.id === editingStepId) ?? current : current),
    [editingStepId, steps, stepIdx, current],
  )

  /** Al avanzar de paso (no en modo edición), limpiar estado de «Otro». */
  useEffect(() => {
    if (editingStepId) return
    setPendingSelectOther(null)
    setOtherDetailInput('')
    setMultiOtherDetail('')
    setMultiOtherErr('')
  }, [stepIdx, editingStepId])

  const inputFooterHint =
    activeStep?.type === 'phone'
      ? buildPhoneStepFooterHint(activeStep.hint, phoneFooterIso)
      : (activeStep?.hint ?? null)

  useEffect(() => {
    if (activeStep?.type === 'phone') setPhoneFooterIso('co')
  }, [activeStep?.id, activeStep?.type])

  useEffect(() => {
    if (!editingStepId) return
    const st = steps.find((s) => s.id === editingStepId)
    if (!st) return
    const raw = answers[editingStepId] ?? ''
    setFileErr('')
    if (st.type === 'multi_select') {
      const { values, otherDetail } = normalizeMultiStored(raw)
      setSelected(values)
      setMultiOtherDetail(otherDetail ?? '')
      setTextInput('')
      return
    }
    if (st.type === 'select') {
      const p = parseSelectStored(raw)
      if (typeof p === 'object') {
        setPendingSelectOther({ stepId: st.id, value: p.value })
        setOtherDetailInput(p.detail)
      } else {
        setPendingSelectOther(null)
        setOtherDetailInput('')
      }
      setTextInput('')
      setSelected([])
      return
    }
    if (['text', 'long_text', 'email', 'phone', 'number'].includes(st.type)) {
      setTextInput(raw)
      setSelected([])
      return
    }
    setTextInput('')
    setSelected([])
  }, [editingStepId, steps, answers])

  useEffect(() => {
    setPendingFiles([])
    setFileErr('')
    if (!activeStep || activeStep.type !== 'multi_select') {
      setSelected([])
      return
    }
    if (editingStepId) return
    const raw = answers[activeStep.id]
    if (!raw) {
      setSelected([])
      setMultiOtherDetail('')
      return
    }
    const { values, otherDetail } = normalizeMultiStored(raw)
    setSelected(values)
    setMultiOtherDetail(otherDetail ?? '')
  }, [activeStep?.id, activeStep?.type, answers, editingStepId])

  useEffect(() => {
    if (!activeStep || phase !== 'chat') return
    if (editingStepId) return
    if (!['text', 'long_text', 'email', 'phone', 'number'].includes(activeStep.type)) return
    setTextInput('')
  }, [activeStep?.id, activeStep?.type, phase, editingStepId])

  const advance = useCallback(
    (value: string, displayOverride?: string) => {
      const editId = editingStepIdRef.current
      const cur = editId ? steps.find((s) => s.id === editId) : steps[stepIdxRef.current]
      if (!cur || phaseRef.current !== 'chat') return
      const sid = cur.id

      if (editId) {
        const nextAnswers = { ...answersRef.current, [sid]: value }
        setAnswers(nextAnswers)
        setMessages(
          withOpeningLine(rebuildMessages(stepIdxRef.current, steps, nextAnswers), flow),
        )
        setEditingStepId(null)
        setTextInput('')
        setSelected([])
        setPendingFiles([])
        setPendingSelectOther(null)
        setOtherDetailInput('')
        setMultiOtherDetail('')
        setMultiOtherErr('')
        return
      }

      if (advancingRef.current) return
      advancingRef.current = true

      const nextAnswers = { ...answersRef.current, [sid]: value }
      setAnswers(nextAnswers)
      const userLine = displayOverride ?? bubbleText(cur, value)
      setMessages((prev) => [...prev, { id: uid(), role: 'user', content: userLine, stepId: sid }])
      const nextIdx = nextStepIndexAfterAnswer(stepIdxRef.current, steps, nextAnswers)
      if (nextIdx >= steps.length) {
        setIsTyping(true)
        setTimeout(() => {
          void flushCompleteSession().finally(() => {
            setPhase('done')
            setIsTyping(false)
            advancingRef.current = false
          })
        }, 400)
        return
      }

      setIsTyping(true)
      setTextInput('')
      setSelected([])

      const run = async () => {
        try {
          const { style } = readTransitionSettings(flow)
          const sessionTok = tokenRef.current
          const nextStep = steps[nextIdx]
          let ackMessage = ''
          if (style === 'ai' && sessionTok) {
            const collected = buildLead(steps, nextAnswers)
            const ack = await fetchAcknowledge({
              flowId,
              sessionToken: sessionTok,
              stepId: sid,
              answeredStepQuestion: cur.question,
              answer: value,
              variableName: cur.variableName,
              nextQuestion: nextStep?.question ?? '',
              collectedData: collected,
            })
            ackMessage = ack?.message?.trim() ?? ''
          }
          await new Promise((r) => setTimeout(r, 400))
          setStepIdx(nextIdx)
          let msgs = withOpeningLine(rebuildMessages(nextIdx, steps, nextAnswers), flow)
          if (ackMessage && nextIdx >= 1) {
            const lastAsst = msgs.map((m) => m.role).lastIndexOf('assistant')
            if (lastAsst >= 0) {
              msgs = [
                ...msgs.slice(0, lastAsst),
                { id: uid(), role: 'assistant', content: ackMessage, isTransition: true },
                ...msgs.slice(lastAsst),
              ]
            }
          }
          setMessages(msgs)
        } finally {
          setIsTyping(false)
          advancingRef.current = false
        }
      }

      void run()
    },
    [steps, flow, flushCompleteSession, flowId],
  )

  const submitText = () => {
    if (!activeStep) return
    const v = textInput.trim()
    if (!v && activeStep.required) return
    if (activeStep.type === 'email' && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return
    if (activeStep.type === 'phone' && v && !isValidPhoneNumber(v)) return
    advance(v)
  }

  const submitMulti = () => {
    if (!activeStep || activeStep.type !== 'multi_select') return
    if (selected.length === 0 && activeStep.required) return
    if (selectionNeedsOtherDetail(selected, activeStep.options)) {
      const d = multiOtherDetail.trim()
      if (!d) {
        setMultiOtherErr('Describe la opción «Otro» para continuar.')
        return
      }
      setMultiOtherErr('')
      advance(buildMultiOtherStored(selected, d))
      return
    }
    setMultiOtherErr('')
    advance(JSON.stringify(selected))
  }

  const pickSelectOption = (value: string) => {
    if (!activeStep || activeStep.type !== 'select') return
    const opt = activeStep.options.find((o) => o.value === value)
    if (opt && optionTriggersOtherDetail(opt)) {
      setPendingSelectOther({ stepId: activeStep.id, value })
      setOtherDetailInput('')
      return
    }
    advance(value)
  }

  const confirmSelectOther = () => {
    if (!activeStep || activeStep.type !== 'select') return
    if (!pendingSelectOther || pendingSelectOther.stepId !== activeStep.id) return
    const d = otherDetailInput.trim()
    if (!d) return
    advance(buildSelectOtherStored(pendingSelectOther.value, d))
  }

  const submitFileRow = useCallback(async () => {
    if (!activeStep || activeStep.type !== 'file') return
    const cfg = resolveFileStepConfig(activeStep)
    if (!pendingFiles.length) return
    setFileBusy(true)
    setFileErr('')
    try {
      const items = await buildFileItemsFromFiles(pendingFiles, cfg)
      const payload: FileAnswerPayload = { skipped: false, items }
      const json = JSON.stringify(payload)
      advance(json, formatFileAnswerForBubble(payload))
      setPendingFiles([])
    } catch (e) {
      setFileErr(e instanceof Error ? e.message : 'No se pudieron procesar los archivos')
    } finally {
      setFileBusy(false)
    }
  }, [activeStep, pendingFiles, advance])

  const skipFile = useCallback(() => {
    if (!activeStep || activeStep.type !== 'file') return
    const payload: FileAnswerPayload = { skipped: true, items: [] }
    const json = JSON.stringify(payload)
    advance(json, formatFileAnswerForBubble(payload))
    setPendingFiles([])
    setFileErr('')
  }, [activeStep, advance])

  const cancelEdit = useCallback(() => {
    setEditingStepId(null)
    setTextInput('')
    setSelected([])
    setPendingFiles([])
    setFileErr('')
    setPendingSelectOther(null)
    setOtherDetailInput('')
    setMultiOtherDetail('')
    setMultiOtherErr('')
  }, [])

  const handleEditAnswer = useCallback(
    (stepId: string) => {
      if (isTyping || phase === 'done') return
      const targetIdx = steps.findIndex((s) => s.id === stepId)
      if (targetIdx < 0 || targetIdx > stepIdx) return
      setEditingStepId(stepId)
      setFileErr('')
    },
    [isTyping, phase, steps, stepIdx],
  )

  const handleBack = useCallback(() => {
    if (isTyping || phase === 'done') return
    if (editingStepId) {
      cancelEdit()
      return
    }
    if (stepIdx <= 0) {
      setTextInput('')
      setSelected([])
      setPendingFiles([])
      setFileErr('')
      setEditingStepId(null)
      setPhase('welcome')
      return
    }
    const newIdx = stepIdx - 1
    const nextAnswers = { ...answersRef.current }
    for (let i = newIdx; i < steps.length; i++) {
      delete nextAnswers[steps[i].id]
    }
    setAnswers(nextAnswers)
    setStepIdx(newIdx)
    setMessages(
      withOpeningLine(rebuildMessages(newIdx, steps, nextAnswers), flow),
    )
    setTextInput('')
    setSelected([])
    setPendingFiles([])
    setFileErr('')
    setEditingStepId(null)
  }, [isTyping, phase, stepIdx, steps, flow, editingStepId, cancelEdit])

  const completion = useMemo(() => completionFromSettings(flow.settings), [flow.settings])

  if (phase === 'loading') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FAF7FF] dark:bg-[#0F1117]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#9C77F5] border-t-transparent" />
        <p className="mt-4 text-sm text-[#6B7280] dark:text-[#9CA3AF]">Cargando…</p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FAF7FF] px-4 dark:bg-[#0F1117]">
        <p className="max-w-md text-center text-sm text-[#6B7280] dark:text-[#9CA3AF]">{errorMsg}</p>
      </div>
    )
  }

  if (phase === 'empty') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FAF7FF] px-4 dark:bg-[#0F1117]">
        <p className="text-center text-sm text-[#6B7280] dark:text-[#9CA3AF]">{errorMsg}</p>
      </div>
    )
  }

  const pageBg =
    'min-h-dvh flex flex-col bg-gradient-to-b from-[#FAF7FF] via-[#FDFBFF] to-[#F4FBF8] dark:from-[#0F1117] dark:via-[#0F1117] dark:to-[#0F1117]'

  if (phase === 'welcome') {
    return (
      <div className={cn(pageBg, 'relative')}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="absolute -right-24 -top-28 h-[420px] w-[420px] rounded-full bg-[#9C77F5]/18 blur-[100px]" />
          <div className="absolute -left-20 top-1/3 h-[360px] w-[360px] rounded-full bg-[#00d4b0]/10 blur-[90px]" />
        </div>
        {!isEmbed ? (
          <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
            <ThemeToggle />
          </div>
        ) : null}
        <WelcomeScreen
          flow={flow}
          stepCount={steps.length}
          resumeAvailable={resumeAvailable}
          chatProgressPaused={Boolean(token && (messages.length > 0 || Object.keys(answers).length > 0))}
          onStartFresh={() => void handleWelcomeStartFresh()}
          onResume={handleWelcomeResume}
          onDiscard={() => void handleDiscardDraft()}
          onReturnToChat={handleWelcomeReturnToChat}
        />
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <FlowDoneCelebration
        flow={flow}
        steps={steps}
        answers={answers}
        completion={completion}
        showSummary={showDoneSummary}
        onToggleSummary={() => setShowDoneSummary((s) => !s)}
        isEmbed={isEmbed}
      />
    )
  }

  const editBanner =
    editingStepId ? (
      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-[#9C77F5]/22 bg-[#F3EEFF]/95 px-3 py-2.5 dark:border-[#2A2F3F] dark:bg-[#252936]">
        <span className="text-left text-xs leading-snug text-[#5B5670] dark:text-[#9CA3AF]">
          Editando una respuesta anterior; el resto de la conversación no se borra.
        </span>
        <button
          type="button"
          onClick={cancelEdit}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-[#6B4DD4] underline-offset-2 hover:underline dark:text-[#D4C4FC]"
        >
          Cancelar
        </button>
      </div>
    ) : null

  const allowEdit = !isTyping && !editingStepId && phase === 'chat'

  return (
    <div className={pageBg}>
      <FlowChatHeader
        flow={flow}
        stepIdx={stepIdx}
        totalSteps={steps.length}
        isTyping={isTyping}
        isDone={false}
        onBack={handleBack}
        embedded={isEmbed}
      />

      <div
        ref={scrollRef}
        className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-4 overflow-y-auto bg-[#FAFAFC]/80 px-4 py-6 dark:bg-[#0F1117]/50"
      >
        {messages.map((m) =>
          m.role === 'assistant' ? (
            <div key={m.id} className="flex gap-3">
              <div
                className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] text-sm font-extrabold text-white shadow-[0_4px_16px_rgba(156,119,245,0.4)] ring-[3px] ring-[#00d4b0]/20"
                aria-hidden
              >
                D
              </div>
              <div
                className={cn(
                  'max-w-[min(78%,22rem)] rounded-tl-sm rounded-br-[1.25rem] rounded-tr-[1.25rem] rounded-bl-[1.25rem] border px-[18px] py-[14px] text-[15px] leading-[1.65] text-[#1A1A1A] shadow-[0_10px_40px_rgba(15,11,26,0.07)] backdrop-blur-sm dark:text-[#F8F9FB] dark:shadow-[0_12px_40px_rgba(0,0,0,0.28)]',
                  m.isOpening
                    ? 'border-[#9C77F5]/24 bg-[#FAF7FF]/98 dark:border-[#3d3558] dark:bg-[#232638]/98'
                    : 'border-[#9C77F5]/14 bg-white/95 dark:border-[#2A2F3F] dark:bg-[#1A1D29]',
                )}
              >
                <div className="whitespace-pre-wrap">{parseBold(m.content)}</div>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div
                className={cn(
                  'relative max-w-[min(78%,22rem)] rounded-bl-[1.25rem] rounded-br-[1.25rem] rounded-tl-[1.25rem] rounded-tr-sm bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] text-[15px] leading-[1.65] text-white shadow-[0_8px_28px_rgba(156,119,245,0.38)]',
                  allowEdit && m.stepId && canEditUserBubble(m, stepIdx, steps) ? 'pl-[18px] pr-11 pt-[14px] pb-[14px]' : 'px-[18px] py-[14px]',
                )}
              >
                {allowEdit && m.stepId && canEditUserBubble(m, stepIdx, steps) ? (
                  <button
                    type="button"
                    onClick={() => handleEditAnswer(m.stepId!)}
                    className="absolute right-2 top-2 rounded-lg p-1 text-white/90 transition hover:bg-white/15 hover:text-white"
                    aria-label="Editar esta respuesta"
                  >
                    <PencilSquareIcon className="h-5 w-5" strokeWidth={1.5} />
                  </button>
                ) : null}
                <span className="whitespace-pre-wrap">{m.content}</span>
              </div>
            </div>
          ),
        )}
        {isTyping ? (
          <div className="flex gap-3 opacity-90">
            <div
              className="mt-0.5 h-9 w-9 shrink-0 rounded-xl bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] shadow-[0_4px_16px_rgba(156,119,245,0.35)]"
              aria-hidden
            />
            <div className="flex gap-1.5 rounded-tl-sm rounded-br-[1.25rem] rounded-tr-[1.25rem] rounded-bl-[1.25rem] border border-[#9C77F5]/12 bg-white/92 px-[18px] py-3.5 shadow-[0_8px_28px_rgba(15,11,26,0.06)] dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="inline-block h-1.75 w-1.75 animate-bounce rounded-full bg-[#9C77F5]"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {phase === 'chat' && activeStep ? (
        <>
          {activeStep.type === 'file' ? (
            <InputFooterShell hint={inputFooterHint} topSlot={editBanner}>
              <input
                id={`pf-upload-${activeStep.id}`}
                type="file"
                accept={resolveFileStepConfig(activeStep).accept}
                multiple={resolveFileStepConfig(activeStep).maxFiles > 1}
                className="sr-only"
                onChange={(e) => {
                  const list = Array.from(e.target.files || [])
                  e.target.value = ''
                  const maxF = resolveFileStepConfig(activeStep).maxFiles
                  setPendingFiles((prev) => [...prev, ...list].slice(0, maxF))
                  setFileErr('')
                }}
              />
              <label
                htmlFor={`pf-upload-${activeStep.id}`}
                className="mb-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-[#9C77F5]/18 bg-white/95 px-4 py-5 text-center shadow-[0_2px_12px_rgba(15,11,26,0.04)] dark:border-[#2A2F3F] dark:bg-[#252936]"
              >
                <PhotoIcon className="h-10 w-10 text-[#9C77F5]" aria-hidden />
                <span className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">Toca para elegir archivos</span>
                <span className="text-xs text-[#9CA3AF]">
                  Máx. {resolveFileStepConfig(activeStep).maxFiles} ·{' '}
                  {Math.round(resolveFileStepConfig(activeStep).maxBytesPerFile / (1024 * 1024))} MB c/u
                </span>
              </label>
              {pendingFiles.length > 0 ? (
                <ul className="mb-3 flex flex-col gap-2">
                  {pendingFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}-${f.size}`}
                      className="flex items-center justify-between gap-2 rounded-xl border border-[#9C77F5]/14 bg-white/90 px-3 py-2.5 text-sm dark:border-[#2A2F3F] dark:bg-[#252936]"
                    >
                      <span className="truncate text-[#1A1A1A] dark:text-[#F8F9FB]" title={f.name}>
                        {f.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))}
                        className="shrink-0 text-xs font-semibold text-[#6B7280] hover:text-[#9C77F5]"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {fileErr ? (
                <p className="mb-3 text-center text-sm text-red-600 dark:text-red-400" role="alert">
                  {fileErr}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                {resolveFileStepConfig(activeStep).optional ? (
                  <button
                    type="button"
                    disabled={fileBusy}
                    onClick={skipFile}
                    className="rounded-full border border-[#E5E7EB] bg-transparent px-5 py-3 text-sm font-semibold text-[#6B7280] disabled:opacity-50 dark:border-[#2A2F3F] dark:text-[#9CA3AF]"
                  >
                    Omitir →
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!pendingFiles.length || fileBusy}
                  onClick={() => void submitFileRow()}
                  className="rounded-full bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_18px_rgba(156,119,245,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {fileBusy ? 'Procesando…' : 'Subir y continuar →'}
                </button>
              </div>
            </InputFooterShell>
          ) : (
            <InputFooterShell hint={inputFooterHint} topSlot={editBanner}>
              {activeStep.type === 'yes_no' ? (
                <div className="flex flex-wrap gap-2">
                  <Pill
                    label="Sí"
                    active={Boolean(
                      editingStepId === activeStep.id && (answers[activeStep.id] ?? '') === 'yes',
                    )}
                    onClick={() => advance('yes')}
                  />
                  <Pill
                    label="No"
                    active={Boolean(
                      editingStepId === activeStep.id && (answers[activeStep.id] ?? '') === 'no',
                    )}
                    onClick={() => advance('no')}
                  />
                </div>
              ) : null}

              {activeStep.type === 'rating' ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {['1', '2', '3', '4', '5'].map((n) => (
                    <Pill
                      key={n}
                      label={n}
                      active={Boolean(editingStepId === activeStep.id && (answers[activeStep.id] ?? '') === n)}
                      onClick={() => advance(n)}
                    />
                  ))}
                </div>
              ) : null}

              {activeStep.type === 'select' ? (
                <>
                  {activeStep.options.length === 0 ? (
                    <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                      Esta pregunta no tiene opciones configuradas. Avísale a quien te envió el formulario para que
                      las añada en el editor.
                    </p>
                  ) : (
                    <>
                      <div className="flex max-h-[42vh] flex-wrap gap-2 overflow-y-auto">
                        {activeStep.options.map((o) => {
                          const stored = answers[activeStep.id] ?? ''
                          const primary = selectStoredPrimaryValue(stored)
                          const pending =
                            pendingSelectOther?.stepId === activeStep.id ? pendingSelectOther : null
                          const pillActive = o.value === primary || (pending && pending.value === o.value)
                          return (
                            <Pill
                              key={o.id}
                              label={[o.emoji, o.label].filter(Boolean).join(' ')}
                              active={Boolean(pillActive)}
                              onClick={() => pickSelectOption(o.value)}
                            />
                          )
                        })}
                      </div>
                      {pendingSelectOther?.stepId === activeStep.id ? (
                        <div className="mt-4 space-y-2 rounded-2xl border border-[#9C77F5]/25 bg-[#9C77F5]/6 p-4 dark:border-[#9C77F5]/30 dark:bg-[#9C77F5]/10">
                          <p className="text-sm font-medium text-foreground">Especifica tu respuesta</p>
                          <textarea
                            value={otherDetailInput}
                            onChange={(e) => setOtherDetailInput(e.target.value)}
                            rows={3}
                            placeholder="Ej. otro sector, otra herramienta que usan…"
                            className="w-full resize-none rounded-xl border border-[#9C77F5]/20 bg-white/95 px-3 py-2 text-sm outline-none focus:border-[#9C77F5]/45 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
                          />
                          <div className="flex flex-wrap gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setPendingSelectOther(null)
                                setOtherDetailInput('')
                              }}
                              className="rounded-full border border-[#E5E7EB] px-4 py-2 text-xs font-semibold text-[#64748B] dark:border-[#2A2F3F] dark:text-[#94A3B8]"
                            >
                              Cambiar opción
                            </button>
                            <button
                              type="button"
                              disabled={!otherDetailInput.trim()}
                              onClick={() => confirmSelectOther()}
                              className="rounded-full bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-5 py-2 text-xs font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Continuar
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </>
                  )}
                </>
              ) : null}

              {activeStep.type === 'multi_select' ? (
                <>
                  {activeStep.options.length === 0 ? (
                    <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-200">
                      Esta pregunta no tiene opciones configuradas. Avísale a quien te envió el formulario para que
                      las añada en el editor.
                    </p>
                  ) : (
                    <>
                      <div className="mb-3 flex max-h-[38vh] flex-wrap gap-2 overflow-y-auto">
                        {activeStep.options.map((o) => {
                          const on = selected.includes(o.value)
                          return (
                            <Pill
                              key={o.id}
                              label={[o.emoji, o.label].filter(Boolean).join(' ')}
                              active={on}
                              onClick={() => {
                                setMultiOtherErr('')
                                setSelected((prev) =>
                                  on ? prev.filter((x) => x !== o.value) : [...prev, o.value],
                                )
                              }}
                            />
                          )
                        })}
                      </div>
                      {selectionNeedsOtherDetail(selected, activeStep.options) ? (
                        <div className="mb-3 space-y-2">
                          <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                            Detalle para «Otro» (obligatorio si la marcaste)
                          </p>
                          <textarea
                            value={multiOtherDetail}
                            onChange={(e) => {
                              setMultiOtherDetail(e.target.value)
                              setMultiOtherErr('')
                            }}
                            rows={2}
                            placeholder="Describe qué más aplica…"
                            className="w-full resize-none rounded-xl border border-[#9C77F5]/20 bg-white/95 px-3 py-2 text-sm outline-none focus:border-[#9C77F5]/45 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
                          />
                        </div>
                      ) : null}
                      {multiOtherErr ? (
                        <p className="mb-2 text-xs font-medium text-red-600 dark:text-red-400">{multiOtherErr}</p>
                      ) : null}
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={submitMulti}
                          disabled={selected.length === 0 && activeStep.required}
                          className="rounded-full bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_18px_rgba(156,119,245,0.4)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Continuar →{selected.length ? ` (${selected.length})` : ''}
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : null}

              {['text', 'long_text', 'email', 'phone', 'number'].includes(activeStep.type) ? (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  {activeStep.type === 'long_text' ? (
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={activeStep.placeholder ?? 'Escribe tu respuesta…'}
                      rows={3}
                      className="min-h-22 w-full flex-1 resize-none rounded-2xl border border-[#9C77F5]/20 bg-white/95 px-4 py-3 text-sm text-[#1A1A1A] shadow-[0_2px_10px_rgba(15,11,26,0.04)] outline-none ring-0 placeholder:text-[#9CA3AF] focus:border-[#9C77F5]/45 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB] dark:placeholder:text-[#6B7280]"
                    />
                  ) : activeStep.type === 'phone' ? (
                    <div className="w-full min-w-0 flex-1">
                      <DiloPhoneField
                        variant="publicFlow"
                        value={textInput}
                        onChange={setTextInput}
                        onActiveCountryChange={setPhoneFooterIso}
                        placeholder={activeStep.placeholder ?? 'Número de teléfono'}
                      />
                    </div>
                  ) : (
                    <input
                      type={
                        activeStep.type === 'email'
                          ? 'email'
                          : activeStep.type === 'number'
                            ? 'number'
                            : 'text'
                      }
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder={activeStep.placeholder ?? 'Escribe tu respuesta…'}
                      className="w-full flex-1 rounded-2xl border border-[#9C77F5]/20 bg-white/95 px-4 py-3 text-sm text-[#1A1A1A] shadow-[0_2px_10px_rgba(15,11,26,0.04)] outline-none placeholder:text-[#9CA3AF] focus:border-[#9C77F5]/45 dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && activeStep.type !== 'long_text') {
                          e.preventDefault()
                          submitText()
                        }
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={submitText}
                    className="shrink-0 rounded-full bg-linear-to-br from-[#9C77F5] to-[#7B5BD4] px-6 py-3 text-sm font-bold text-white shadow-[0_4px_18px_rgba(156,119,245,0.4)] disabled:opacity-40"
                    disabled={
                      (activeStep.required && !textInput.trim()) ||
                      (activeStep.type === 'phone' &&
                        activeStep.required &&
                        (!textInput.trim() || !isValidPhoneNumber(textInput))) ||
                      (activeStep.type === 'phone' &&
                        !activeStep.required &&
                        Boolean(textInput.trim()) &&
                        !isValidPhoneNumber(textInput)) ||
                      (activeStep.type === 'email' &&
                        Boolean(textInput.trim()) &&
                        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(textInput.trim()))
                    }
                  >
                    {activeStep.type === 'long_text' && activeStep.required === false && !textInput.trim()
                      ? 'Saltar →'
                      : 'Enviar →'}
                  </button>
                </div>
              ) : null}
            </InputFooterShell>
          )}
        </>
      ) : null}
      <PublicFlowBrandingFooter flow={flow} />
    </div>
  )
}
