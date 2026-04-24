'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonSpinner } from '@/components/spinners'
import { cn } from '@/lib/utils'
import {
  FLOW_GENERATE_PROMPT_MAX_CHARS,
  FLOW_GENERATE_SCORING_GOAL_MAX_CHARS,
} from '@/lib/flow-generate-input-limits'
import { NEW_FLOW_SCORING_PRESETS, NEW_FLOW_TONE_OPTIONS } from '@/lib/new-flow-presets'

type ChatMsg = { id: string; role: 'assistant' | 'user'; content: string }

type ChatStep =
  | 'welcome'
  | 'intent'
  | 'title'
  | 'tone'
  | 'description'
  | 'scoring'
  | 'scoring_other'
  | 'saludo'
  | 'saludo_custom'

function uid() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function firstNameFrom(full: string | null | undefined): string {
  const t = full?.trim()
  if (!t) return ''
  return t.split(/\s+/)[0] ?? ''
}

function parseBold(text: string) {
  return text.split('**').map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>,
  )
}

export function NewFlowConversation() {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [step, setStep] = useState<ChatStep>('welcome')
  const [promptDraft, setPromptDraft] = useState('')
  const [titleDraft, setTitleDraft] = useState('')
  const [toneValue, setToneValue] = useState<string | null>(null)
  const [descDraft, setDescDraft] = useState('')
  const [scoringGoal, setScoringGoal] = useState('')
  const [scoringOtherDraft, setScoringOtherDraft] = useState('')
  const [chatIntroDraft, setChatIntroDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [bootError, setBootError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const pushAssistant = useCallback((content: string) => {
    setMessages((m) => [...m, { id: uid(), role: 'assistant', content }])
  }, [])

  const pushUser = useCallback((content: string) => {
    setMessages((m) => [...m, { id: uid(), role: 'user', content }])
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/settings/profile')
        const json = (await res.json()) as { success?: boolean; data?: { user?: { name?: string | null } } }
        if (!res.ok || !json.success || !json.data?.user) throw new Error('No se pudo cargar tu perfil')
        const name = json.data.user.name ?? null
        if (cancelled) return
        const fn = firstNameFrom(name)
        const greet = fn
          ? `¡Hola, **${fn}**! 👋\n\nSoy **Dilo**. Armo contigo un **flow conversacional**: tu cliente responde como en un chat y tú recibes todo ordenado.\n\nVamos **igual que lo verá tu visitante**: paso a paso, sin formularios largos y aburridos.`
          : `¡Hola! 👋\n\nSoy **Dilo**. Armo contigo un **flow conversacional**: tu cliente responde como en un chat y tú recibes todo ordenado.\n\nVamos **paso a paso**, como lo verá quien lo complete.`
        setMessages([{ id: uid(), role: 'assistant', content: greet }])
      } catch {
        if (!cancelled) {
          setBootError('No pudimos cargar tu nombre. Recarga la página o revisa la sesión.')
          setMessages([
            {
              id: uid(),
              role: 'assistant',
              content:
                '¡Hola! 👋 Soy **Dilo**. Si algo falló al cargar tu perfil, recarga la página. Mientras tanto puedes seguir aquí.',
            },
          ])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, step])

  const startChat = () => {
    setError(null)
    pushUser('Empezamos')
    pushAssistant(
      '**¿Qué quieres armar hoy?**\n\nCuéntame con el detalle que necesites: tipo de negocio, qué datos quieres recoger, si hay pasos obligatorios, integraciones… Cuanto más concreto, mejor saldrá el borrador.',
    )
    setStep('intent')
  }

  const submitIntent = () => {
    const t = promptDraft.trim()
    if (t.length < 20) {
      setError('Escribe al menos unas líneas (mín. 20 caracteres) para que la IA entienda el caso.')
      return
    }
    setError(null)
    pushUser(t.length > 220 ? `${t.slice(0, 220)}…` : t)
    pushAssistant('**¿Qué título le pondrías a este flow?**\n\nAlgo corto que reconozcas en el panel (luego podrás editarlo).')
    setStep('title')
  }

  const submitTitle = () => {
    const t = titleDraft.trim()
    if (t.length < 2) {
      setError('El título debe tener al menos 2 caracteres.')
      return
    }
    setError(null)
    pushUser(t)
    pushAssistant(
      '**¿Qué tono quieres usar con tus clientes** en las preguntas del formulario?\n\nElige una opción:',
    )
    setStep('tone')
  }

  const pickTone = (value: string) => {
    setToneValue(value)
    const preset = NEW_FLOW_TONE_OPTIONS.find((p) => p.value === value)
    pushUser(preset ? `${preset.emoji} ${preset.label}` : value.slice(0, 120))
    pushAssistant(
      '**Descripción del formulario** (la verá quien empiece, antes de las preguntas).\n\n1–3 frases: para qué es, qué obtiene quien lo complete y el tono general.',
    )
    setStep('description')
  }

  const submitDescription = () => {
    const t = descDraft.trim()
    if (t.length < 15) {
      setError('Añade al menos 15 caracteres para que la portada tenga contexto.')
      return
    }
    setError(null)
    pushUser(t.length > 280 ? `${t.slice(0, 280)}…` : t)
    pushAssistant(
      '**¿Qué quieres medir o evaluar** con las respuestas?\n\nEsto alimenta el **scoring** (hot / warm / cold) y el resumen automático.',
    )
    setStep('scoring')
  }

  const pickScoring = (goal: string, label: string) => {
    if (!goal) {
      pushUser(label)
      pushAssistant('**Cuéntame con detalle** qué quieres medir o cómo clasificarías una buena respuesta frente a una mala.')
      setStep('scoring_other')
      return
    }
    setScoringGoal(goal)
    pushUser(`${label}`)
    pushAssistant(
      '**Saludo inicial** en el chat público (antes de la primera pregunta).\n\n¿Prefieres que **Dilo lo arme** a partir de la descripción, o **lo escribes tú**?',
    )
    setStep('saludo')
  }

  const submitScoringOther = () => {
    const t = scoringOtherDraft.trim()
    if (t.length < 10) {
      setError('Necesito al menos 10 caracteres para entender qué medir.')
      return
    }
    setError(null)
    setScoringGoal(t)
    pushUser(t.length > 240 ? `${t.slice(0, 240)}…` : t)
    pushAssistant(
      '**Saludo inicial** en el chat público (antes de la primera pregunta).\n\n¿Prefieres que **Dilo lo arme** a partir de la descripción, o **lo escribes tú**?',
    )
    setStep('saludo')
  }

  const pickSaludoAuto = () => {
    setChatIntroDraft('')
    pushUser('Que Dilo lo arme desde la descripción')
    void runGenerate('')
  }

  const submitSaludoCustom = () => {
    const t = chatIntroDraft.trim()
    if (t.length < 20) {
      setError('Escribe al menos 20 caracteres para el saludo, o vuelve y elige la opción automática.')
      return
    }
    setError(null)
    pushUser(t.length > 200 ? `${t.slice(0, 200)}…` : t)
    void runGenerate(t)
  }

  const goSaludoCustom = () => {
    setError(null)
    pushUser('Lo escribo yo')
    pushAssistant('Adelante — **2 a 5 frases**, tono humano. Puedes usar **negritas** con `**texto**`.')
    setStep('saludo_custom')
  }

  const runGenerate = async (intro: string) => {
    if (!toneValue) {
      setError('Falta el tono.')
      return
    }
    const prompt = promptDraft.trim()
    const sg = scoringGoal.trim()
    if (prompt.length < 10 || sg.length < 5) {
      setError('Faltan datos del flujo. Vuelve atrás en el chat no es posible — recarga si hace falta.')
      return
    }
    setLoading(true)
    setError(null)
    pushAssistant('**Genial.** Estoy generando tu flow con IA… suele tardar **10–40 s**.')
    try {
      const body: Record<string, string> = {
        prompt: prompt.slice(0, FLOW_GENERATE_PROMPT_MAX_CHARS),
        scoringGoal: sg.slice(0, FLOW_GENERATE_SCORING_GOAL_MAX_CHARS),
        flowName: titleDraft.trim().slice(0, 200),
        description: descDraft.trim().slice(0, 2000),
        toneAssistant: toneValue.slice(0, 220),
      }
      if (intro) body.chatIntro = intro.slice(0, 4000)
      else body.chatIntro = ''

      const res = await fetch('/api/flows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = (await res.json()) as
        | { success: true; data: { flow: { id: string } } }
        | { success: false; error: { message?: string } }
      if (!res.ok || !json.success) {
        throw new Error(json.success === false && json.error?.message ? json.error.message : 'Error generando el flow')
      }
      router.push(`/dashboard/flows/${json.data.flow.id}`)
    } catch (e) {
      setLoading(false)
      setError(e instanceof Error ? e.message : 'Algo salió mal')
      pushAssistant('**No se pudo generar.** Revisa el mensaje de error abajo o inténtalo de nuevo en unos segundos.')
    }
  }

  return (
    <div
      className={cn(
        'flex min-h-[min(78dvh,720px)] flex-col overflow-hidden rounded-2xl border border-border bg-linear-to-b from-[#FAF7FF] via-white to-[#F4FBF8] shadow-[0_20px_60px_rgba(156,119,245,0.12)] dark:from-[#12141c] dark:via-[#151828] dark:to-[#0f1117] dark:shadow-[0_24px_70px_rgba(0,0,0,0.45)]',
      )}
    >
      <div className="shrink-0 border-b border-[#9C77F5]/15 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-[#2A2F3F] dark:bg-[#1A1D29]/85">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C77F5]">Nuevo flow</p>
            <p className="text-xs text-muted-foreground">Experiencia tipo chat · mismo producto que verá tu cliente</p>
          </div>
          <span className="rounded-full bg-[#9C77F5]/12 px-2.5 py-1 text-[10px] font-semibold text-[#6B4DD4] dark:bg-[#9C77F5]/20 dark:text-[#D4C4FC]">
            Borrador con IA
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-3 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {bootError ? (
          <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-center text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-100">
            {bootError}
          </p>
        ) : null}
        {messages.map((m) =>
          m.role === 'assistant' ? (
            <div key={m.id} className="flex gap-2.5">
              <div
                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-dilo-500 to-dilo-600 text-[11px] font-extrabold text-white shadow-md shadow-dilo-500/25"
                aria-hidden
              >
                D
              </div>
              <div className="max-w-[min(100%,26rem)] rounded-2xl rounded-tl-sm border border-[#9C77F5]/18 bg-white/95 px-3.5 py-2.5 text-[14px] leading-relaxed text-foreground shadow-sm dark:border-[#2A2F3F] dark:bg-[#1A1D29]">
                <div className="whitespace-pre-wrap">{parseBold(m.content)}</div>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[min(100%,22rem)] rounded-2xl rounded-tr-sm bg-linear-to-br from-dilo-500 to-dilo-600 px-3.5 py-2.5 text-left text-[14px] leading-relaxed text-white shadow-md shadow-dilo-500/30">
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ),
        )}
      </div>

      <div className="shrink-0 border-t border-border bg-white/90 px-3 py-3 backdrop-blur-md dark:border-[#2A2F3F] dark:bg-[#1A1D29]/95 sm:px-4">
        <div className="mx-auto w-full max-w-xl space-y-3">
          {error ? (
            <p className="text-center text-xs font-medium text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          ) : null}

          {step === 'welcome' ? (
            <button
              type="button"
              disabled={loading || messages.length === 0}
              onClick={startChat}
              className="w-full rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-dilo-500/25 transition hover:opacity-95 disabled:opacity-40"
            >
              Empezar →
            </button>
          ) : null}

          {step === 'intent' ? (
            <div className="space-y-2">
              <textarea
                value={promptDraft}
                onChange={(e) => {
                  setPromptDraft(e.target.value.slice(0, FLOW_GENERATE_PROMPT_MAX_CHARS))
                  setError(null)
                }}
                rows={5}
                maxLength={FLOW_GENERATE_PROMPT_MAX_CHARS}
                placeholder="Ej: Freelance web — quiero leads con tipo de web, páginas, funcionalidades, presupuesto…"
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none ring-0 focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20"
              />
              <p className="text-right text-[10px] text-muted-foreground tabular-nums">{promptDraft.length} caracteres</p>
              <button
                type="button"
                disabled={loading}
                onClick={submitIntent}
                className="w-full rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 py-3 text-sm font-bold text-white shadow-md shadow-dilo-500/25 hover:opacity-95 disabled:opacity-40"
              >
                Continuar →
              </button>
            </div>
          ) : null}

          {step === 'title' ? (
            <div className="space-y-2">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => {
                  setTitleDraft(e.target.value.slice(0, 200))
                  setError(null)
                }}
                maxLength={200}
                placeholder="Ej: Leads web freelance"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20"
              />
              <button
                type="button"
                disabled={loading}
                onClick={submitTitle}
                className="w-full rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 py-3 text-sm font-bold text-white shadow-md shadow-dilo-500/25 hover:opacity-95 disabled:opacity-40"
              >
                Continuar →
              </button>
            </div>
          ) : null}

          {step === 'tone' ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {NEW_FLOW_TONE_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  disabled={loading}
                  onClick={() => pickTone(p.value)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-border bg-background px-3 py-3 text-left text-sm transition hover:border-dilo-500/50 hover:bg-dilo-50/50 dark:hover:bg-[#2a2040]/50 disabled:opacity-40"
                >
                  <span className="text-lg" aria-hidden>
                    {p.emoji}
                  </span>
                  <span className="font-semibold text-foreground">{p.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          {step === 'description' ? (
            <div className="space-y-2">
              <textarea
                value={descDraft}
                onChange={(e) => {
                  setDescDraft(e.target.value.slice(0, 2000))
                  setError(null)
                }}
                rows={4}
                maxLength={2000}
                placeholder="Para quién es, qué obtiene al terminar y en qué tono va el flow…"
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20"
              />
              <button
                type="button"
                disabled={loading}
                onClick={submitDescription}
                className="w-full rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 py-3 text-sm font-bold text-white shadow-md shadow-dilo-500/25 hover:opacity-95 disabled:opacity-40"
              >
                Continuar →
              </button>
            </div>
          ) : null}

          {step === 'scoring' ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {NEW_FLOW_SCORING_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={loading}
                  onClick={() => pickScoring(p.goal, `${p.emoji} ${p.label}`)}
                  className="flex flex-col items-start gap-1 rounded-xl border border-border bg-background px-3 py-3 text-left text-sm transition hover:border-dilo-500/50 hover:bg-dilo-50/50 dark:hover:bg-[#2a2040]/50 disabled:opacity-40"
                >
                  <span className="text-lg" aria-hidden>
                    {p.emoji}
                  </span>
                  <span className="font-semibold text-foreground">{p.label}</span>
                </button>
              ))}
            </div>
          ) : null}

          {step === 'scoring_other' ? (
            <div className="space-y-2">
              <textarea
                value={scoringOtherDraft}
                onChange={(e) => {
                  setScoringOtherDraft(e.target.value.slice(0, FLOW_GENERATE_SCORING_GOAL_MAX_CHARS))
                  setError(null)
                }}
                rows={4}
                maxLength={FLOW_GENERATE_SCORING_GOAL_MAX_CHARS}
                placeholder="Describe qué es una respuesta excelente, buena o mala para tu caso…"
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20"
              />
              <button
                type="button"
                disabled={loading}
                onClick={submitScoringOther}
                className="w-full rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 py-3 text-sm font-bold text-white shadow-md shadow-dilo-500/25 hover:opacity-95 disabled:opacity-40"
              >
                Continuar →
              </button>
            </div>
          ) : null}

          {step === 'saludo' ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                disabled={loading}
                onClick={pickSaludoAuto}
                className="rounded-xl border border-border bg-background px-3 py-4 text-left text-sm font-semibold transition hover:border-dilo-500/50 hover:bg-dilo-50/50 dark:hover:bg-[#2a2040]/50 disabled:opacity-40"
              >
                <span className="text-xl" aria-hidden>
                  ✨
                </span>
                <span className="mt-1 block">Que Dilo arme el saludo desde la descripción</span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={goSaludoCustom}
                className="rounded-xl border border-border bg-background px-3 py-4 text-left text-sm font-semibold transition hover:border-dilo-500/50 hover:bg-dilo-50/50 dark:hover:bg-[#2a2040]/50 disabled:opacity-40"
              >
                <span className="text-xl" aria-hidden>
                  ✍️
                </span>
                <span className="mt-1 block">Lo escribo yo</span>
              </button>
            </div>
          ) : null}

          {step === 'saludo_custom' ? (
            <div className="space-y-2">
              <textarea
                value={chatIntroDraft}
                onChange={(e) => {
                  setChatIntroDraft(e.target.value.slice(0, 4000))
                  setError(null)
                }}
                rows={5}
                maxLength={4000}
                placeholder="Saludo inicial para tus visitantes…"
                className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20"
              />
              <button
                type="button"
                disabled={loading}
                onClick={() => void submitSaludoCustom()}
                className="w-full rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 py-3 text-sm font-bold text-white shadow-md shadow-dilo-500/25 hover:opacity-95 disabled:opacity-40"
              >
                Generar flow →
              </button>
            </div>
          ) : null}

          {loading ? (
            <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
              <ButtonSpinner size="sm" />
              Generando pasos y scoring…
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
