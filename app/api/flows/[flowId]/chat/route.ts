import { NextRequest } from 'next/server'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import { and, asc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { flows, steps, stepOptions } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]/chat')

export const maxDuration = 60

// ── Request schema ────────────────────────────────────────────────────────────

const HistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().max(4000),
})

const ChatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(HistoryMessageSchema).max(20).default([]),
})

// ── AI response schema ────────────────────────────────────────────────────────
// Flat (no discriminated unions) for OpenAI strict JSON schema compatibility.

// All fields required (no .optional()) because OpenAI strict JSON schema
// requires every property to be listed in `required`. Use null for absent values.
const ChangeSchema = z.object({
  action: z.enum(['add_step', 'update_step', 'delete_step', 'add_option']),
  /** add_step, update_step — null when not applicable */
  type: z.string().nullable(),
  question: z.string().nullable(),
  variableName: z.string().nullable(),
  hint: z.string().nullable(),
  /** update_step, delete_step, add_option — null for add_step */
  stepId: z.string().nullable(),
  /** add_option — null when not applicable */
  label: z.string().nullable(),
})

const ChatResponseSchema = z.object({
  message: z.string().describe('Respuesta conversacional breve al usuario (máx 3 frases)'),
  changes: z.array(ChangeSchema).describe('Lista de cambios a aplicar al flow. Vacía si no hay cambios.'),
})

// ── Helpers ───────────────────────────────────────────────────────────────────

const STEP_TYPES = [
  'text', 'long_text', 'select', 'multi_select',
  'email', 'phone', 'number', 'rating', 'yes_no', 'file',
] as const

const TYPE_LABELS: Record<string, string> = {
  text: 'Texto corto', long_text: 'Texto largo', select: 'Selección única',
  multi_select: 'Selección múltiple', email: 'Email', phone: 'Teléfono',
  number: 'Número', rating: 'Calificación', yes_no: 'Sí / No', file: 'Archivo',
}

function toVarSlug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || 'campo'
}

type StepWithOptions = {
  id: string
  order: number
  type: string
  question: string
  variableName: string
  required: boolean
  options: { id: string; label: string; order: number }[]
}

function buildSystemPrompt(flow: { name: string; description: string | null }, stepRows: StepWithOptions[]): string {
  const stepLines = stepRows.map((s) => {
    const optStr = s.options.length
      ? `\n     opciones: ${s.options.map((o) => `"${o.label}" (id:${o.id})`).join(', ')}`
      : ''
    return `  #${s.order + 1} [${s.type}] ${s.variableName} (id:${s.id})\n     pregunta: "${s.question}"${optStr}`
  })

  return [
    `Eres el asistente de edición de Dilo — plataforma de flows conversacionales inteligentes.`,
    `El usuario está editando el flow: "${flow.name}"${flow.description ? ` — ${flow.description}` : ''}.`,
    ``,
    `Estado actual (${stepRows.length} pasos):`,
    stepLines.length ? stepLines.join('\n') : '  (sin pasos)',
    ``,
    `Tipos de paso disponibles: ${STEP_TYPES.map((t) => `${t} (${TYPE_LABELS[t]})`).join(', ')}.`,
    ``,
    `REGLAS IMPORTANTES:`,
    `- stepId debe ser el UUID exacto mostrado arriba. Nunca inventes IDs.`,
    `- variableName: solo letras/números/guion_bajo, empieza con letra, máx 80 chars.`,
    `- Para add_step: type obligatorio, question obligatorio, variableName recomendado.`,
    `- Para update_step: stepId obligatorio, solo envía los campos que cambien.`,
    `- Para delete_step: solo stepId.`,
    `- Para add_option: stepId del paso select/multi_select + label.`,
    `- Si el usuario pide algo que no tiene sentido (ej. añadir opción a un campo de texto), explícalo en message y deja changes vacío.`,
    `- Responde siempre en español, de forma breve y directa (máx 3 frases).`,
    `- Si el usuario solo hace una pregunta sin pedir cambios, responde con message y changes vacío [].`,
    ``,
    `REGLAS ANTI-DUPLICADO (CRÍTICO):`,
    `- El "Estado actual" de arriba es la fuente de verdad: refleja EXACTAMENTE lo que ya está guardado en la base de datos, incluyendo cambios de turnos anteriores.`,
    `- NUNCA agregues pasos, opciones o cambios que ya estén visibles en el estado actual.`,
    `- Aplica los cambios en el mismo turno en que los propones. No esperes confirmación.`,
    `- Si el usuario responde con una sola palabra de confirmación ("porfa", "sí", "ok", "dale", "hazlo", "listo") y los cambios que mencionaste en el turno anterior ya se ven en el estado actual → deja changes: [] y confirma brevemente.`,
    `- Si el usuario pide "agregar X" y X ya existe en el estado actual con pregunta similar → no lo dupliques, actualízalo si hace falta o informa que ya existe.`,
  ].join('\n')
}

// ── Route handler ─────────────────────────────────────────────────────────────

export const POST = withApiHandler(
  async (req: NextRequest, { auth, params }) => {
    const { org } = auth
    const { flowId } = params

    const body = await req.json()
    const parsed = ChatRequestSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Petición inválida', parsed.error.flatten().fieldErrors)
    }

    // Verify ownership
    const flow = await db.query.flows.findFirst({
      where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    })
    if (!flow) throw new NotFoundError('Flow')

    // Load current steps with options for context
    const stepRows = await db.query.steps.findMany({
      where: eq(steps.flowId, flowId),
      orderBy: asc(steps.order),
    })
    const stepsWithOptions: StepWithOptions[] = await Promise.all(
      stepRows.map(async (s) => {
        const opts = await db.query.stepOptions.findMany({
          where: eq(stepOptions.stepId, s.id),
          orderBy: asc(stepOptions.order),
        })
        return {
          id: s.id,
          order: s.order,
          type: s.type,
          question: s.question,
          variableName: s.variableName,
          required: s.required,
          options: opts.map((o) => ({ id: o.id, label: o.label, order: o.order })),
        }
      }),
    )

    const { message, history } = parsed.data
    const systemPrompt = buildSystemPrompt(flow, stepsWithOptions)

    log.info({ flowId, historyLen: history.length, msgLen: message.length }, 'Chat request')

    const { object } = await generateObject({
      model: openai('gpt-4o'),
      schema: ChatResponseSchema,
      system: systemPrompt,
      messages: [
        ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user' as const, content: message },
      ],
    })

    // Sanitize and enrich changes (fill variableName if missing)
    const sanitizedChanges = object.changes
      .filter((c) => c.action)
      .map((c) => ({
        ...c,
        variableName:
          c.variableName?.trim() ||
          (c.question ? toVarSlug(c.question) : undefined),
      }))

    log.info(
      { flowId, changes: sanitizedChanges.length, actions: sanitizedChanges.map((c) => c.action) },
      'Chat response generated',
    )

    return apiSuccess({ message: object.message, changes: sanitizedChanges })
  },
  { requireAuth: true },
)
