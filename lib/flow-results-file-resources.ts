import { isFilePayload } from '@/lib/public-flow-file-helpers'

export type FileResourceFile = {
  name: string
  mime: string
  href: string
  kind: 'dataUrl' | 'url'
}

export type FileResourceGroup = {
  question: string
  files: FileResourceFile[]
}

function itemDownloadSource(item: {
  dataUrl?: string
  url?: string
}): { href: string; kind: 'dataUrl' | 'url' } | null {
  if (typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:')) {
    return { href: item.dataUrl, kind: 'dataUrl' }
  }
  if (typeof item.url === 'string' && /^https?:\/\//i.test(item.url)) {
    return { href: item.url, kind: 'url' }
  }
  return null
}

/** Hay al menos un archivo listado (nombre) en la respuesta, aunque solo queden metadatos sin binario. */
export function fileAnswerRawHasListedAttachments(raw: string | null): boolean {
  if (!raw) return false
  try {
    const p = JSON.parse(raw) as unknown
    if (!isFilePayload(p) || p.skipped || !Array.isArray(p.items)) return false
    return p.items.length > 0
  } catch {
    return false
  }
}

/** Indica si el JSON guardado de un paso `file` incluye al menos un adjunto descargable (data URL o URL http). */
export function fileAnswerRawHasDownloadableSource(raw: string | null): boolean {
  if (!raw) return false
  try {
    const p = JSON.parse(raw) as unknown
    if (!isFilePayload(p) || p.skipped || !Array.isArray(p.items)) return false
    return p.items.some((it) => itemDownloadSource(it) != null)
  } catch {
    return false
  }
}

export function buildFileResourceGroupsFromRaw(
  question: string,
  raw: string | null,
): FileResourceGroup | null {
  if (!raw) return null
  try {
    const p = JSON.parse(raw) as unknown
    if (!isFilePayload(p) || p.skipped || !Array.isArray(p.items)) return null
    const files: FileResourceFile[] = []
    for (const it of p.items) {
      const src = itemDownloadSource(it)
      if (!src) continue
      files.push({
        name: typeof it.name === 'string' ? it.name : 'archivo',
        mime: typeof it.mime === 'string' ? it.mime : 'application/octet-stream',
        href: src.href,
        kind: src.kind,
      })
    }
    if (!files.length) return null
    return { question, files }
  } catch {
    return null
  }
}
