/**
 * Metadatos de conexión sin exponer credenciales (solo host / base / hint).
 */
import { createLogger } from '@/lib/logger'

const log = createLogger('database')

export type DatabaseConnectionInfo = {
  host: string
  database: string
  /** Etiqueta legible si reconocemos el endpoint de Neon. */
  branchHint: string
  pooled: boolean
}

/** Subcadenas del host Neon → etiqueta (el id completo incluye hash, ej. ep-curly-rain-amyorugr-pooler). */
const HOST_HINTS: Array<{ includes: string; label: string }> = [
  { includes: 'ep-polished-frost', label: 'production (polished-frost)' },
  { includes: 'ep-curly-rain', label: 'develop (curly-rain)' },
  { includes: 'ep-broad-boat', label: 'legacy-dev (broad-boat)' },
]

function resolveBranchHint(host: string): string {
  for (const { includes, label } of HOST_HINTS) {
    if (host.includes(includes)) return label
  }
  const short = host.match(/^(ep-[a-z0-9-]+)/)?.[1]
  return short ? `neon (${short})` : `neon (${host})`
}

export function getDatabaseConnectionInfo(databaseUrl?: string): DatabaseConnectionInfo | null {
  const url = databaseUrl ?? process.env.DATABASE_URL
  if (!url?.trim()) return null

  try {
    const parsed = new URL(url.replace(/^postgresql:\/\//, 'https://'))
    const host = parsed.hostname
    const database = parsed.pathname.replace(/^\//, '') || 'neondb'
    const branchHint = resolveBranchHint(host)

    return {
      host,
      database,
      branchHint,
      pooled: host.includes('-pooler'),
    }
  } catch {
    return { host: '(invalid DATABASE_URL)', database: '?', branchHint: 'unknown', pooled: false }
  }
}

let loggedOnce = false

/** Log único al arrancar el proceso (dev útil tras cambiar .env.local). */
export function logDatabaseConnectionOnce(): void {
  if (loggedOnce) return
  loggedOnce = true

  const info = getDatabaseConnectionInfo()
  if (!info) {
    log.warn({}, 'DATABASE_URL no está definida')
    return
  }

  log.info(
    {
      dbHost: info.host,
      dbName: info.database,
      dbBranchHint: info.branchHint,
      dbPooled: info.pooled,
    },
    `Conectado a Neon: ${info.branchHint} → ${info.host}/${info.database}`,
  )
}
