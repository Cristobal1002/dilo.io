type ApiErrorBody = {
  success?: boolean
  error?: { message?: string; code?: string }
  data?: unknown
}

function messageFromBody(body: unknown, fallback: string): string {
  if (!body || typeof body !== 'object') return fallback
  const msg = (body as ApiErrorBody).error?.message
  return typeof msg === 'string' && msg.trim() ? msg.trim() : fallback
}

/**
 * Interpreta la respuesta JSON estándar de `withApiHandler` / `apiSuccess` / `apiError`.
 * Usar después de `fetch` para no tragar errores 4xx/5xx ni `{ success: false }`.
 */
export async function readApiResult<T = unknown>(res: Response): Promise<
  { ok: true; data: T } | { ok: false; message: string }
> {
  const raw = await res.text()
  let body: unknown = null
  if (raw) {
    try {
      body = JSON.parse(raw) as unknown
    } catch {
      return { ok: false, message: 'Respuesta no válida del servidor' }
    }
  }

  if (!res.ok) {
    return {
      ok: false,
      message: messageFromBody(body, `Error (${res.status})`),
    }
  }

  if (!body || typeof body !== 'object' || (body as ApiErrorBody).success !== true) {
    return {
      ok: false,
      message: messageFromBody(body, 'Respuesta inválida del servidor'),
    }
  }

  return { ok: true, data: (body as { data: T }).data }
}
