import type { FlowGeneration, GeneratedStep } from '@/lib/schemas/flow-generation'
import { TB } from './branch-presets'

export const esTone = 'Profesional, claro y cercano en español.'

export const baseCompletion =
  'Gracias por tu tiempo. Revisaremos tus respuestas y te contactaremos con el siguiente paso.'

export function opts(
  rows: { label: string; value: string; emoji?: string | null }[],
): NonNullable<GeneratedStep['options']> {
  return rows.map((r, i) => ({ label: r.label, value: r.value, emoji: r.emoji ?? null, order: i }))
}

export function scoring(
  hot: string,
  warm: string,
  cold: string,
): FlowGeneration['flow']['scoring_criteria'] {
  return { hot, warm, cold }
}

/** Bloque inicial: contacto (todas las plantillas v2). */
export function contactSteps(): GeneratedStep[] {
  const c = TB.contacto
  return [
    {
      order: 1,
      type: 'text',
      question: '¿Cuál es tu nombre completo?',
      hint: 'Así te contactaremos si hace falta una llamada.',
      placeholder: 'Ej. María López',
      variable_name: 'nombre_contacto',
      required: true,
      conditions: null,
      file_config: null,
      options: null,
      branch_label: c.branch_label,
      branch_color: c.branch_color,
    },
    {
      order: 2,
      type: 'email',
      question: '¿Cuál es tu correo electrónico?',
      hint: null,
      placeholder: 'nombre@empresa.com',
      variable_name: 'email_contacto',
      required: true,
      conditions: null,
      file_config: null,
      options: null,
      branch_label: c.branch_label,
      branch_color: c.branch_color,
    },
    {
      order: 3,
      type: 'phone',
      question: '¿Cuál es tu teléfono o WhatsApp?',
      hint: 'Incluye código de país si no es local.',
      placeholder: null,
      variable_name: 'telefono_contacto',
      required: true,
      conditions: null,
      file_config: null,
      options: null,
      branch_label: c.branch_label,
      branch_color: c.branch_color,
    },
  ]
}

export function st(
  order: number,
  type: GeneratedStep['type'],
  question: string,
  variable_name: string,
  extra: Partial<Omit<GeneratedStep, 'order' | 'type' | 'question' | 'variable_name'>> = {},
): GeneratedStep {
  return {
    order,
    type,
    question,
    hint: extra.hint ?? null,
    placeholder: extra.placeholder ?? null,
    variable_name,
    required: extra.required ?? true,
    conditions: extra.conditions ?? null,
    file_config: extra.file_config ?? null,
    options: extra.options ?? null,
    branch_label: extra.branch_label ?? undefined,
    branch_color: extra.branch_color ?? undefined,
  }
}
