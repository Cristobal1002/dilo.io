'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizeStepSkipRules, type StepSkipRule } from '@/lib/step-skip'
import { normalizeConditionsForStore, validateStepConditionsInput } from '@/lib/validate-step-conditions'

export type StepConditionsRef = {
  id: string
  order: number
  variableName: string
  question: string
  conditions?: unknown | null
  /** Solo panel: identificar el paso en «Saltar a orden». */
  branchLabel?: string | null
  branchColor?: string | null
}

function truncate(s: string, n: number) {
  const t = s.trim()
  if (t.length <= n) return t
  return `${t.slice(0, n)}…`
}

export function StepConditionsEditor({
  step,
  allSteps,
  saving,
  onSave,
}: {
  step: StepConditionsRef
  allSteps: StepConditionsRef[]
  saving: boolean
  onSave: (conditions: unknown | null) => Promise<void>
}) {
  const sorted = useMemo(
    () => [...allSteps].sort((a, b) => a.order - b.order),
    [allSteps],
  )

  const otherVars = useMemo(() => {
    const names = sorted.filter((s) => s.id !== step.id).map((s) => s.variableName.trim())
    return [...new Set(names)].filter(Boolean).sort()
  }, [sorted, step.id])

  const [rules, setRules] = useState<StepSkipRule[]>(() => normalizeStepSkipRules(step.conditions))
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setRules(normalizeStepSkipRules(step.conditions))
    setMsg(null)
  }, [step.id, step.conditions])

  const stepOrders = useMemo(() => sorted.map((s) => s.order), [sorted])
  const varSet = useMemo(() => new Set(sorted.map((s) => s.variableName.trim())), [sorted])

  const validate = useCallback(
    (next: StepSkipRule[]) => {
      const stored = normalizeConditionsForStore(next)
      return validateStepConditionsInput(stored, {
        stepOrders,
        variableNames: varSet,
        currentVariableName: step.variableName.trim(),
        currentStepOrder: step.order,
      })
    },
    [step.variableName, step.order, stepOrders, varSet],
  )

  const handleSave = async () => {
    for (const r of rules) {
      if (!r.if.trim() || !r.equals.trim()) {
        setMsg('Completa «Si variable» e «Igual a» en cada regla.')
        return
      }
    }
    const err = validate(rules)
    if (err) {
      setMsg(err)
      return
    }
    setMsg(null)
    const payload = normalizeConditionsForStore(rules)
    await onSave(payload)
  }

  const addRule = () => {
    const firstIf = otherVars[0] ?? ''
    const firstDest = sorted.find((s) => s.order !== step.order)?.order ?? step.order
    setRules((r) => [...r, { if: firstIf, equals: '', skip_to: firstDest }])
    setMsg(null)
  }

  const clearAll = () => {
    setRules([])
    setMsg(null)
  }

  return (
    <details className="mt-3 rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] px-3 py-2 dark:border-[#2A2F3F] dark:bg-[#151820]/80">
      <summary className="cursor-pointer select-none text-[11px] font-semibold text-[#64748B] dark:text-[#94A3B8]">
        Condicionales (saltos){' '}
        <span className="font-normal text-[#9CA3AF]">
          {rules.length ? `· ${rules.length} regla(s)` : '· opcional'}
        </span>
        <span className="ml-1 font-normal text-[#9CA3AF]">· usa marcas de rama en cada paso</span>
      </summary>
      <p className="mt-2 text-[10px] leading-relaxed text-[#6B7280] dark:text-[#9CA3AF]">
        Si la respuesta del paso con variable <strong>si variable</strong> es exactamente <strong>igual a</strong> (valor
        guardado, p. ej. de un <em>select</em>), este paso se <strong>omite</strong> y el visitante salta al paso cuyo{' '}
        <strong>orden</strong> (número entre paréntesis) coincide con <strong>saltar a orden</strong>. El <strong># morado</strong>{' '}
        en cada tarjeta es <em>orden + 1</em>; aquí usamos el mismo # para que coincida con la tarjeta. Arriba, en cada paso, usa{' '}
        <strong>marca de rama</strong>: la etiqueta sale aquí en el desplegable; el color te ayuda a escanear la lista (los
        menús del sistema no pintan cada fila).
      </p>
      <div className="mt-2 space-y-2">
        {rules.map((row, idx) => (
          <div
            key={idx}
            className="grid gap-1.5 rounded-lg border border-[#ECEEF2] bg-white/90 p-2 dark:border-[#2A2F3F] dark:bg-[#1A1D29]/90 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <label className="block min-w-0">
              <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                Si variable
              </span>
              <select
                value={row.if}
                onChange={(e) => {
                  const v = e.target.value
                  setRules((prev) => prev.map((x, i) => (i === idx ? { ...x, if: v } : x)))
                }}
                className="w-full rounded-lg border border-[#E8EAEF] bg-[#F8F9FB] px-2 py-1.5 font-mono text-[11px] dark:border-[#2A2F3F] dark:bg-[#252936]"
              >
                {otherVars.length === 0 ? (
                  <option value="">(añade otros pasos)</option>
                ) : (
                  otherVars.map((vn) => (
                    <option key={vn} value={vn}>
                      {vn}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                Igual a
              </span>
              <input
                type="text"
                value={row.equals}
                onChange={(e) => {
                  const v = e.target.value
                  setRules((prev) => prev.map((x, i) => (i === idx ? { ...x, equals: v } : x)))
                }}
                placeholder='ej. "comprar" o "si"'
                className="w-full rounded-lg border border-[#E8EAEF] bg-[#F8F9FB] px-2 py-1.5 text-[11px] dark:border-[#2A2F3F] dark:bg-[#252936]"
              />
            </label>
            <label className="block min-w-0">
              <span className="mb-0.5 block text-[9px] font-medium uppercase tracking-wide text-[#9CA3AF]">
                Saltar a orden
              </span>
              <select
                value={String(row.skip_to)}
                onChange={(e) => {
                  const n = Number(e.target.value)
                  setRules((prev) => prev.map((x, i) => (i === idx ? { ...x, skip_to: n } : x)))
                }}
                className="w-full rounded-lg border border-[#E8EAEF] bg-[#F8F9FB] px-2 py-1.5 text-[11px] dark:border-[#2A2F3F] dark:bg-[#252936]"
              >
                {sorted.map((s) => {
                  const tag = s.branchLabel?.trim()
                  const prefix = tag ? `${tag} · ` : ''
                  const stepNum = s.order + 1
                  return (
                    <option key={s.id} value={String(s.order)}>
                      {prefix}#{stepNum} (orden {s.order}) — {truncate(s.question, 40)}
                    </option>
                  )
                })}
              </select>
            </label>
            <div className="flex items-end justify-end">
              <button
                type="button"
                onClick={() => setRules((prev) => prev.filter((_, i) => i !== idx))}
                className="rounded-lg px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                Quitar
              </button>
            </div>
          </div>
        ))}
      </div>
      {msg ? <p className="mt-2 text-[10px] font-medium text-red-600 dark:text-red-400">{msg}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => addRule()}
          disabled={otherVars.length === 0}
          className="rounded-lg border border-[#E8EAEF] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#64748B] hover:bg-[#F8F9FB] disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#94A3B8]"
        >
          + Añadir regla
        </button>
        <button
          type="button"
          onClick={() => clearAll()}
          className="rounded-lg px-2.5 py-1 text-[10px] font-medium text-[#94A3B8] hover:bg-[#F1F5F9] dark:hover:bg-[#252936]"
        >
          Limpiar
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="rounded-lg bg-[#9C77F5]/15 px-3 py-1 text-[10px] font-bold text-[#6B4DD4] hover:bg-[#9C77F5]/25 disabled:opacity-50 dark:bg-[#9C77F5]/20 dark:text-[#D4C4FC]"
        >
          {saving ? 'Guardando…' : 'Guardar condiciones'}
        </button>
      </div>
    </details>
  )
}
