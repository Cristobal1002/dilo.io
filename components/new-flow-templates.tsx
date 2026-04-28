'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FLOW_TEMPLATE_CARDS, type FlowTemplateId } from '@/lib/flow-templates'
import { cn } from '@/lib/utils'

export function NewFlowTemplates() {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<FlowTemplateId | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clone = async (templateId: FlowTemplateId) => {
    setLoadingId(templateId)
    setError(null)
    try {
      const res = await fetch('/api/flows/from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      const json = (await res.json()) as
        | { success: true; data: { flow: { id: string } } }
        | { success: false; error: { message?: string } }
      if (!res.ok || !json.success) {
        throw new Error(
          json.success === false && json.error?.message ? json.error.message : 'No se pudo crear el flow',
        )
      }
      router.push(`/dashboard/flows/${json.data.flow.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo salió mal')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Clona una plantilla lista en un clic; luego edítala en el workspace como cualquier otro flow.
      </p>
      {error ? (
        <p className="rounded-lg border border-red-200/80 bg-red-50/90 px-3 py-2 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/35 dark:text-red-100">
          {error}
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2">
        {FLOW_TEMPLATE_CARDS.map((card) => {
          const busy = loadingId === card.id
          return (
            <li key={card.id}>
              <button
                type="button"
                disabled={loadingId !== null}
                onClick={() => void clone(card.id)}
                className={cn(
                  'flex h-full w-full flex-col rounded-2xl border border-[#9C77F5]/15 bg-white/90 p-4 text-left shadow-sm transition-colors dark:border-[#2A2F3F] dark:bg-[#151828]/90',
                  'hover:border-[#9C77F5]/35 hover:bg-[#9C77F5]/8 dark:hover:border-[#9C77F5]/30 dark:hover:bg-[#9C77F5]/10',
                  'disabled:cursor-wait disabled:opacity-70',
                )}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[#9C77F5]">
                  {card.audience}
                </span>
                <span className="mt-1 text-base font-semibold text-foreground">{card.title}</span>
                <span className="mt-1 flex-1 text-sm text-muted-foreground">{card.subtitle}</span>
                <span className="mt-3 text-xs text-[#64748B] dark:text-[#94A3B8]">
                  {busy ? 'Creando borrador…' : `${card.stepCount} pasos · borrador`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
