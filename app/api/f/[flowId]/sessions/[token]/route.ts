import { NextRequest } from 'next/server'
import { withApiHandler } from '@/lib/with-api-handler'
import { apiNoContent } from '@/lib/api-response'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { createLogger } from '@/lib/logger'
import {
  DISCOVERY_STUB_FLOW_SEGMENT,
  DiscoverySessionPutBodySchema,
} from '@/lib/discovery-stub'

const log = createLogger('api/f/[flowId]/sessions/[token]')

const MAX_PUT_BYTES = 512_000

function isDiscoveryStubFlow(flowId: string): boolean {
  return flowId === DISCOVERY_STUB_FLOW_SEGMENT
}

/**
 * Sesiones públicas por flow. Hoy solo existe el stub de `/discovery` bajo `flowId === __discovery`
 * (sin persistencia en BD). El resto de flows devuelve 404 hasta que exista el modelo de sesión.
 */
export const GET = withApiHandler(
  async (_req: NextRequest, { params }) => {
    const { flowId } = params
    if (!isDiscoveryStubFlow(flowId)) {
      throw new NotFoundError('Sesión')
    }
    /* Stub: sin snapshot en servidor; la UI de discovery usa solo cliente. */
    throw new NotFoundError('Sesión')
  },
  { requireAuth: false },
)

export const PUT = withApiHandler(
  async (req: NextRequest, { params }) => {
    const { flowId, token } = params
    if (!isDiscoveryStubFlow(flowId)) {
      throw new NotFoundError('Sesión')
    }
    if (!token || token.length > 200) {
      throw new ValidationError('Token de sesión inválido')
    }

    const len = req.headers.get('content-length')
    if (len && Number(len) > MAX_PUT_BYTES) {
      throw new ValidationError('Cuerpo demasiado grande')
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      throw new ValidationError('JSON inválido')
    }

    const parsed = DiscoverySessionPutBodySchema.safeParse(json)
    if (!parsed.success) {
      throw new ValidationError('Datos de sesión inválidos', parsed.error.flatten())
    }

    log.debug(
      {
        stub: 'discovery',
        tokenPrefix: token.slice(0, 8),
        keys: Object.keys(parsed.data.answers ?? {}),
        currentStepIndex: parsed.data.currentStepIndex,
        completed: parsed.data.completed,
      },
      'Discovery session PUT accepted (no persistence)',
    )

    return apiNoContent()
  },
  { requireAuth: false },
)
