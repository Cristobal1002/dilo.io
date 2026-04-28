import { NextRequest } from 'next/server'
import { z } from 'zod'
import { and, eq, max } from 'drizzle-orm'
import { db } from '@/db'
import { flows, stepOptions, steps } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiCreated } from '@/lib/api-response'
import { ValidationError, NotFoundError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'

const log = createLogger('flows/[flowId]/steps')

const STEP_TYPES = [
  'text',
  'long_text',
  'select',
  'multi_select',
  'email',
  'phone',
  'number',
  'rating',
  'yes_no',
  'file',
] as const

const DEFAULT_QUESTIONS: Record<string, string> = {
  text: '¿Cuál es tu nombre?',
  long_text: 'Cuéntanos más sobre tu proyecto',
  select: '¿Cuál de estas opciones aplica mejor?',
  multi_select: '¿Qué opciones son relevantes para ti?',
  email: '¿Cuál es tu correo electrónico?',
  phone: '¿Cuál es tu número de teléfono?',
  number: '¿Cuál es tu presupuesto estimado?',
  rating: '¿Cómo calificarías tu experiencia hasta ahora?',
  yes_no: '¿Deseas continuar con el proceso?',
  file: '¿Puedes adjuntar un archivo relevante?',
}

const TYPE_VAR_BASE: Record<string, string> = {
  text: 'nombre',
  long_text: 'descripcion',
  select: 'opcion',
  multi_select: 'opciones',
  email: 'email',
  phone: 'telefono',
  number: 'numero',
  rating: 'calificacion',
  yes_no: 'confirmacion',
  file: 'archivo',
}

const CreateStepSchema = z.object({
  type: z.enum(STEP_TYPES),
  question: z.string().min(1).max(2000).optional(),
  hint: z.string().max(500).nullable().optional(),
  variableName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, 'Solo letras, números y guiones bajos')
    .optional(),
})

export const POST = withApiHandler(
  async (req: NextRequest, { auth, params }) => {
    const { org } = auth
    const { flowId } = params

    const body = await req.json()
    const parsed = CreateStepSchema.safeParse(body)
    if (!parsed.success) {
      throw new ValidationError('Tipo de paso inválido', parsed.error.flatten().fieldErrors)
    }

    // Verify flow belongs to org
    const flow = await db.query.flows.findFirst({
      where: and(eq(flows.id, flowId), eq(flows.organizationId, org.id)),
    })
    if (!flow) throw new NotFoundError('Flow')

    // Get current max order
    const [agg] = await db
      .select({ maxOrder: max(steps.order) })
      .from(steps)
      .where(eq(steps.flowId, flowId))

    const order = (agg?.maxOrder ?? -1) + 1
    const { type } = parsed.data
    const varBase = TYPE_VAR_BASE[type] ?? type
    // Use provided values if available, otherwise fall back to defaults
    const variableName = parsed.data.variableName ?? `${varBase}_${order + 1}`
    const question = parsed.data.question ?? DEFAULT_QUESTIONS[type] ?? 'Nueva pregunta'

    const [created] = await db
      .insert(steps)
      .values({
        flowId,
        order,
        type,
        question,
        variableName,
        hint: parsed.data.hint ?? null,
        required: true,
      })
      .returning()

    if (type === 'select' || type === 'multi_select') {
      await db.insert(stepOptions).values({
        stepId: created.id,
        label: 'Opción 1',
        value: 'opcion_1',
        emoji: null,
        order: 0,
      })
    }

    log.info({ flowId, stepId: created.id, type, order }, 'Step created')

    return apiCreated({ step: created })
  },
  { requireAuth: true },
)
