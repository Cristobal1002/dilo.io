'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonSpinner } from '@/components/spinners'

const EXAMPLES = [
  {
    prompt: 'Quiero calificar leads de clientes que buscan proyectos web con presupuesto y urgencia',
    scoringGoal: 'Si tienen presupuesto real (mín. $3.000) y urgencia de arrancar en menos de 2 meses',
  },
  {
    prompt: 'Discovery de proyectos de branding: nombre, industria, competidores y referencias visuales',
    scoringGoal: 'Qué tan definida está la identidad de marca y si el proyecto es concreto o exploratorio',
  },
  {
    prompt: 'Pre-calificar compradores de inmuebles: tipo de propiedad, presupuesto, zona y financiamiento',
    scoringGoal: 'Si el comprador tiene financiamiento listo y el presupuesto encaja con la oferta disponible',
  },
  {
    prompt: 'Onboarding para nuevos clientes de mi agencia de marketing digital',
    scoringGoal: 'Qué tan completa es la información del cliente y si están listos para empezar de inmediato',
  },
]

export default function NewFlowPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [scoringGoal, setScoringGoal] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canGenerate = prompt.trim().length >= 10 && scoringGoal.trim().length >= 5

  const handleGenerate = async () => {
    if (!canGenerate) {
      setError('Completa las dos preguntas antes de generar')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/flows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), scoringGoal: scoringGoal.trim() }),
      })

      const json = (await res.json()) as
        | { success: true; data: { flow: { id: string } } }
        | { success: false; error: { message?: string } }

      if (!res.ok || !json.success) {
        throw new Error(
          json.success === false && json.error?.message
            ? json.error.message
            : 'Error generando el flow',
        )
      }

      router.push(`/dashboard/flows/${json.data.flow.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo salió mal, intenta de nuevo')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Volver
        </Link>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Nuevo Flow</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Dos preguntas y Dilo genera el flujo completo con scoring personalizado
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm space-y-6">
        {/* Pregunta 1 */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">
            ¿Qué formulario quieres construir?
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Describe el objetivo y el tipo de información que quieres capturar
          </p>
          <textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError('') }}
            placeholder="Ej: Quiero calificar leads de clientes que buscan proyectos web con presupuesto, funcionalidades y urgencia…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-dilo-500/30 focus:border-dilo-500 transition-shadow text-sm"
            disabled={loading}
            autoFocus
          />
          <p className="text-right text-xs text-muted-foreground mt-1 tabular-nums">{prompt.length}/500</p>
        </div>

        {/* Divisor */}
        <div className="border-t border-border" />

        {/* Pregunta 2 */}
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1">
            ¿Qué quieres medir o evaluar de las respuestas?
          </label>
          <p className="text-xs text-muted-foreground mb-3">
            Dilo usa esto para clasificar cada respuesta automáticamente y sugerirte el siguiente paso
          </p>
          <textarea
            value={scoringGoal}
            onChange={(e) => { setScoringGoal(e.target.value); setError('') }}
            placeholder="Ej: Si tienen presupuesto real y urgencia de arrancar pronto, o si solo están explorando opciones…"
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-dilo-500/30 focus:border-dilo-500 transition-shadow text-sm"
            disabled={loading}
          />
          <p className="text-right text-xs text-muted-foreground mt-1 tabular-nums">{scoringGoal.length}/300</p>
        </div>

        {error ? (
          <p className="text-xs text-red-500 -mt-2">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          aria-busy={loading}
          className="w-full rounded-xl py-4 font-semibold text-base text-white bg-linear-to-br from-dilo-500 to-dilo-600 shadow-lg shadow-dilo-500/25 hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-opacity"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <ButtonSpinner size="sm" variant="inverse" />
              Generando tu flow… (10-20 segundos)
            </span>
          ) : (
            '✨ Generar flow con IA'
          )}
        </button>
      </div>

      {/* Ejemplos */}
      <div className="mt-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ejemplos para inspirarte
        </p>
        <div className="space-y-2">
          {EXAMPLES.map((ex, i) => (
            <button
              type="button"
              key={i}
              onClick={() => {
                setPrompt(ex.prompt)
                setScoringGoal(ex.scoringGoal)
                setError('')
              }}
              disabled={loading}
              className="w-full text-left px-4 py-3 rounded-xl border border-border bg-background transition-colors disabled:opacity-50 hover:border-dilo-500/40 hover:bg-dilo-50/60 dark:hover:bg-[#2a2040]/60"
            >
              <p className="text-sm text-foreground/80">{ex.prompt}</p>
              <p className="text-xs text-muted-foreground mt-1">Mide: {ex.scoringGoal}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
