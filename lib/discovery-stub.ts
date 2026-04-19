import { z } from 'zod'

/**
 * Segmento de ruta reservado para la demo `/discovery`.
 * No confundir con un `flowId` real de la BD: la persistencia de sesión pública aún no existe.
 */
export const DISCOVERY_STUB_FLOW_SEGMENT = '__discovery'

export function discoveryPublicSessionPath(sessionToken: string): string {
  return `/api/f/${DISCOVERY_STUB_FLOW_SEGMENT}/sessions/${encodeURIComponent(sessionToken)}`
}

/** Cuerpo que envía la UI de discovery al guardar borrador (solo validado; sin escritura en BD). */
export const DiscoverySessionPutBodySchema = z.object({
  answers: z.record(z.string(), z.unknown()).optional(),
  currentStepIndex: z.number().finite().optional(),
  completed: z.boolean().optional(),
})

export type DiscoverySessionPutBody = z.infer<typeof DiscoverySessionPutBodySchema>
