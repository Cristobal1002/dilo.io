import { NextRequest } from 'next/server'
import { generateText } from 'ai'
import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { sessions } from '@/db/schema'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiSuccess } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { getFastTextModel } from '@/lib/ai-model'
import { createLogger } from '@/lib/logger'
import { loadPublishedFlowWithSteps } from '@/lib/load-published-flow'

const log = createLogger('api/f/acknowledge')

const BodySchema = z.object({
  sessionToken: z.string().min(1).max(200),
  stepId: z.string().uuid(),
  answeredStepQuestion: z.string().min(1).max(4000),
  answer: z.string().max(50_000),
  variableName: z.string().min(1).max(120),
  nextQuestion: z.string().max(4000),
  collectedData: z.record(z.string(), z.string()).optional().default({}),
})

function readTransition(flowSettings: unknown): { style: 'ai' | 'none'; tone: string } {
  const o = flowSettings && typeof flowSettings === 'object' ? (flowSettings as Record<string, unknown>) : {}
  const style = o.transition_style === 'ai' ? 'ai' : 'none'
  const tone =
    typeof o.tone === 'string' && o.tone.trim() ? o.tone.trim().slice(0, 220) : 'cálido, breve y natural'
  return { style, tone }
}

export const maxDuration = 30

export const POST = withApiHandler(
  async (req: NextRequest, { params }) => {
    const flowId = params.flowId
    if (!z.string().uuid().safeParse(flowId).success) {
      throw new NotFoundError('Flow')
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      throw new ValidationError('JSON inválido')
    }

    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      throw new ValidationError('Datos inválidos', parsed.error.flatten())
    }

    const { sessionToken, stepId, answeredStepQuestion, answer, variableName, nextQuestion, collectedData } =
      parsed.data

    const { flow, steps } = await loadPublishedFlowWithSteps(flowId)
    if (!steps.some((s) => s.id === stepId)) {
      throw new ValidationError('Paso no pertenece a este flow')
    }

    const { style, tone } = readTransition(flow.settings)

    if (style !== 'ai') {
      return apiSuccess({ message: '' })
    }

    const sessionRow = await db.query.sessions.findFirst({
      where: and(eq(sessions.flowId, flowId), eq(sessions.token, sessionToken)),
    })
    if (!sessionRow || sessionRow.status !== 'in_progress') {
      throw new NotFoundError('Sesión')
    }

    const system = [
      'Eres el asistente de un formulario conversacional inteligente.',
      'Tu único trabajo es generar un mensaje de acuse de recibo después de que el usuario responde.',
      '',
      'REGLAS ESTRICTAS:',
      '- Máximo 1 frase. Máximo 12 palabras.',
      '- Usa la respuesta del usuario si es relevante (especialmente si es un nombre).',
      '- NO hagas la siguiente pregunta — eso no es tu trabajo.',
      '- NO uses frases genéricas como "Gracias por tu respuesta" o "Entendido".',
      `- Sé ${tone}.`,
      '- Puedes usar 1 emoji si el tono lo permite.',
      '- Si la respuesta es un nombre, úsalo directamente.',
      '- Si la respuesta es un email, teléfono u otro dato técnico, no lo repitas — solo acusa recibo brevemente.',
      '',
      'Responde SOLO el mensaje de acuse. Sin explicaciones. Sin comillas.',
    ].join('\n')

    const userMsg = [
      `Pregunta a la que respondió el usuario: "${answeredStepQuestion}"`,
      `Respuesta del usuario (${variableName}): "${answer}"`,
      `Siguiente pregunta del formulario (NO la incluyas en tu respuesta): "${nextQuestion}"`,
      `Datos recolectados hasta ahora (JSON): ${JSON.stringify(collectedData)}`,
      `Tono requerido: ${tone}`,
      '',
      'Genera el acuse de recibo.',
    ].join('\n')

    try {
      const { text } = await generateText({
        model: getFastTextModel(),
        system,
        prompt: userMsg,
        maxOutputTokens: 48,
        abortSignal: AbortSignal.timeout(22_000),
      })
      const message = (text ?? '').replace(/^["'\s]+|["'\s]+$/g, '').trim().slice(0, 240)
      return apiSuccess({ message })
    } catch (e) {
      log.warn({ err: e, flowId, sessionId: sessionRow.id }, 'Acknowledge LLM failed or timed out')
      return apiSuccess({ message: '' })
    }
  },
  { requireAuth: false },
)
