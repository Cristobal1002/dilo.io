'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ButtonSpinner } from '@/components/spinners'

const EXAMPLES = [
  'Quiero calificar leads de clientes que buscan proyectos web con presupuesto y urgencia',
  'Necesito hacer discovery de proyectos de branding: nombre, industria, competidores y referencias visuales',
  'Quiero pre-calificar compradores de inmuebles: tipo de propiedad, presupuesto, zona y financiamiento',
  'Formulario de onboarding para nuevos clientes de mi agencia de marketing digital',
]

export default function NewFlowPage() {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleGenerate = async () => {
    if (prompt.trim().length < 10) {
      setError('Describe mejor lo que necesitas (mínimo 10 caracteres)')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/flows/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      const json = (await res.json()) as
        | { success: true; data: { flow: { id: string } } }
        | { success: false; error: { message?: string } }

      if (!res.ok || !json.success) {
        const message =
          json.success === false && json.error?.message
            ? json.error.message
            : 'Error generando el flow'
        throw new Error(message)
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
        <button
          type="button"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground text-sm mb-4 flex items-center gap-1 transition-colors"
        >
          ← Volver
        </button>
        <h2 className="text-2xl font-bold text-foreground tracking-tight">Nuevo Flow</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Describe lo que necesitas en una frase y Dilo genera el flujo completo
        </p>
      </div>

      <div className="bg-surface rounded-2xl border border-border p-6 mb-4 shadow-sm">
        <label className="block text-sm font-medium text-foreground mb-3">
          ¿Qué quieres capturar o calificar?
        </label>
        <textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            setError('')
          }}
          placeholder="Ej: Quiero calificar leads de clientes que buscan proyectos web con presupuesto, funcionalidades y urgencia..."
          className="w-full h-32 px-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-dilo-500/30 focus:border-dilo-500 transition-shadow"
          disabled={loading}
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground tabular-nums">{prompt.length}/500</span>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading || prompt.trim().length < 10}
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

      <div className="mt-8">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Ejemplos para inspirarte
        </p>
        <div className="space-y-2">
          {EXAMPLES.map((example, i) => (
            <button
              type="button"
              key={i}
              onClick={() => setPrompt(example)}
              disabled={loading}
              className="w-full text-left px-4 py-3 rounded-xl border border-border bg-background text-sm text-foreground/80 hover:border-dilo-500/40 hover:bg-dilo-50/60 transition-colors disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
