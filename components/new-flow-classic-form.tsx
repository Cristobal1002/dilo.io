'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonSpinner } from '@/components/spinners'
import { cn } from '@/lib/utils'
import {
  FLOW_GENERATE_PROMPT_MAX_CHARS,
  FLOW_GENERATE_SCORING_GOAL_MAX_CHARS,
} from '@/lib/flow-generate-input-limits'
import { NEW_FLOW_SCORING_PRESETS, NEW_FLOW_TONE_OPTIONS } from '@/lib/new-flow-presets'

const SCORING_SELECT_OTHER = '__other__'

export function NewFlowClassicForm() {
  const router = useRouter()
  const [flowTitle, setFlowTitle] = useState('')
  const [prompt, setPrompt] = useState('')
  const [toneValue, setToneValue] = useState<string>(NEW_FLOW_TONE_OPTIONS[0]!.value)
  const [description, setDescription] = useState('')
  const [scoringSelect, setScoringSelect] = useState<string>(NEW_FLOW_SCORING_PRESETS[0]!.goal)
  const [scoringCustom, setScoringCustom] = useState('')
  const [saludoMode, setSaludoMode] = useState<'auto' | 'custom'>('auto')
  const [chatIntro, setChatIntro] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scoringGoal = useMemo(() => {
    if (scoringSelect === SCORING_SELECT_OTHER) return scoringCustom.trim()
    return scoringSelect
  }, [scoringSelect, scoringCustom])

  const submit = async () => {
    setError(null)
    const p = prompt.trim()
    const sg = scoringGoal.trim()
    if (p.length < 10) {
      setError('Describe el flow con al menos 10 caracteres.')
      return
    }
    if (sg.length < 5) {
      setError('El objetivo de medición debe tener al menos 5 caracteres.')
      return
    }
    if (saludoMode === 'custom') {
      const intro = chatIntro.trim()
      if (intro.length < 20) {
        setError('El saludo personalizado: al menos 20 caracteres, o elige saludo automático.')
        return
      }
    }

    setLoading(true)
    try {
      const body: Record<string, string> = {
        prompt: p.slice(0, FLOW_GENERATE_PROMPT_MAX_CHARS),
        scoringGoal: sg.slice(0, FLOW_GENERATE_SCORING_GOAL_MAX_CHARS),
        toneAssistant: toneValue.trim().slice(0, 220),
      }
      const t = flowTitle.trim()
      if (t.length >= 2) body.flowName = t.slice(0, 200)
      const d = description.trim()
      if (d.length >= 1) body.description = d.slice(0, 2000)
      if (saludoMode === 'custom') body.chatIntro = chatIntro.trim().slice(0, 4000)
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
    }
  }

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-linear-to-b from-[#FAF7FF] via-white to-[#F4FBF8] shadow-[0_20px_60px_rgba(156,119,245,0.12)] dark:from-[#12141c] dark:via-[#151828] dark:to-[#0f1117] dark:shadow-[0_24px_70px_rgba(0,0,0,0.45)]',
      )}
    >
      <div className="border-b border-[#9C77F5]/15 bg-white/80 px-4 py-3 backdrop-blur-md dark:border-[#2A2F3F] dark:bg-[#1A1D29]/85">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9C77F5]">Vista clásica</p>
        <p className="text-xs text-muted-foreground">Mismos datos que el chat guiado; rellena todo de una vez.</p>
      </div>

      <form
        className="space-y-4 px-4 py-5 sm:px-5"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="nfc-title" className="text-xs font-semibold text-foreground">
            Título del flow <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="nfc-title"
            type="text"
            value={flowTitle}
            onChange={(e) => setFlowTitle(e.target.value.slice(0, 200))}
            maxLength={200}
            placeholder="Ej: Encuesta post-compra"
            disabled={loading}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nfc-prompt" className="text-xs font-semibold text-foreground">
            Qué debe hacer el flow
          </label>
          <textarea
            id="nfc-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, FLOW_GENERATE_PROMPT_MAX_CHARS))}
            rows={6}
            maxLength={FLOW_GENERATE_PROMPT_MAX_CHARS}
            required
            disabled={loading}
            placeholder="Público, objetivo, preguntas clave, restricciones…"
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20 disabled:opacity-50"
          />
          <p className="text-[11px] text-muted-foreground">
            Mínimo 10 caracteres · {prompt.trim().length} / {FLOW_GENERATE_PROMPT_MAX_CHARS}
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nfc-tone" className="text-xs font-semibold text-foreground">
            Tono del asistente
          </label>
          <select
            id="nfc-tone"
            value={toneValue}
            onChange={(e) => setToneValue(e.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20 disabled:opacity-50"
          >
            {NEW_FLOW_TONE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.emoji} {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nfc-desc" className="text-xs font-semibold text-foreground">
            Descripción del flow <span className="font-normal text-muted-foreground">(recomendado)</span>
          </label>
          <textarea
            id="nfc-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
            rows={4}
            maxLength={2000}
            disabled={loading}
            placeholder="Para quién es, qué obtiene al terminar, contexto del negocio…"
            className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20 disabled:opacity-50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nfc-scoring-preset" className="text-xs font-semibold text-foreground">
            Objetivo de medición (scoring)
          </label>
          <select
            id="nfc-scoring-preset"
            value={scoringSelect}
            onChange={(e) => {
              setScoringSelect(e.target.value)
              setError(null)
            }}
            disabled={loading}
            className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20 disabled:opacity-50"
          >
            {NEW_FLOW_SCORING_PRESETS.map((p) => (
              <option key={p.label} value={p.goal ? p.goal : SCORING_SELECT_OTHER}>
                {p.emoji} {p.label}
              </option>
            ))}
          </select>
          {scoringSelect === SCORING_SELECT_OTHER ? (
            <textarea
              value={scoringCustom}
              onChange={(e) => {
                setScoringCustom(e.target.value.slice(0, FLOW_GENERATE_SCORING_GOAL_MAX_CHARS))
                setError(null)
              }}
              rows={4}
              maxLength={FLOW_GENERATE_SCORING_GOAL_MAX_CHARS}
              disabled={loading}
              placeholder="Qué es una respuesta excelente, buena o mala para tu caso…"
              className="mt-2 w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20 disabled:opacity-50"
            />
          ) : null}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-foreground">Saludo inicial</legend>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm has-checked:border-dilo-500/60 has-checked:bg-dilo-50/40 dark:has-checked:bg-[#2a2040]/40">
              <input
                type="radio"
                name="saludo"
                checked={saludoMode === 'auto'}
                onChange={() => {
                  setSaludoMode('auto')
                  setError(null)
                }}
                disabled={loading}
              />
              Que Dilo lo arme desde la descripción
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm has-checked:border-dilo-500/60 has-checked:bg-dilo-50/40 dark:has-checked:bg-[#2a2040]/40">
              <input
                type="radio"
                name="saludo"
                checked={saludoMode === 'custom'}
                onChange={() => {
                  setSaludoMode('custom')
                  setError(null)
                }}
                disabled={loading}
              />
              Lo escribo yo
            </label>
          </div>
          {saludoMode === 'custom' ? (
            <textarea
              value={chatIntro}
              onChange={(e) => {
                setChatIntro(e.target.value.slice(0, 4000))
                setError(null)
              }}
              rows={5}
              maxLength={4000}
              disabled={loading}
              placeholder="2 a 5 frases; puedes usar **negritas**…"
              className="w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-dilo-500 focus:ring-2 focus:ring-dilo-500/20 disabled:opacity-50"
            />
          ) : null}
        </fieldset>

        {error ? (
          <p className="text-center text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 py-3 text-sm font-bold text-white shadow-md shadow-dilo-500/25 hover:opacity-95 disabled:opacity-40"
        >
          {loading ? (
            <>
              <ButtonSpinner size="sm" />
              Generando…
            </>
          ) : (
            'Generar flow con IA'
          )}
        </button>
      </form>
    </div>
  )
}
