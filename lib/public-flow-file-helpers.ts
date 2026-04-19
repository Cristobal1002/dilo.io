/** Respuesta persistida / en memoria para pasos tipo `file` (misma forma que discovery). */
export type FileAnswerPayload = {
  skipped: boolean
  items: Array<{ name: string; mime: string; size: number; dataUrl?: string }>
}

export function isFilePayload(v: unknown): v is FileAnswerPayload {
  return Boolean(
    v &&
      typeof v === 'object' &&
      typeof (v as FileAnswerPayload).skipped === 'boolean' &&
      Array.isArray((v as FileAnswerPayload).items),
  )
}

export function formatFileAnswerForBubble(val: FileAnswerPayload) {
  if (val.skipped) return '(Omitido)'
  const n = val.items.length
  if (!n) return '(Sin archivos)'
  const names = val.items.map((i) => i.name).slice(0, 4).join(', ')
  return n === 1 ? `📎 1 archivo: ${names}` : `📎 ${n} archivos: ${names}${n > 4 ? '…' : ''}`
}

/** Evita enviar data URLs al servidor (payload enorme). */
export function stripFileDataUrlsFromAnswers(answers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = { ...answers }
  for (const k of Object.keys(out)) {
    try {
      const p = JSON.parse(out[k]) as unknown
      if (isFilePayload(p) && Array.isArray(p.items)) {
        out[k] = JSON.stringify({
          ...p,
          items: p.items.map(({ name, mime, size }) => ({ name, mime, size })),
        })
      }
    } catch {
      /* no es JSON de archivo */
    }
  }
  return out
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result))
    fr.onerror = () => reject(new Error('No se pudo leer el archivo'))
    fr.readAsDataURL(file)
  })
}

export async function rasterToCompressedDataUrl(file: File, maxDim: number, quality: number) {
  const bitmap = await createImageBitmap(file)
  try {
    let w = bitmap.width
    let h = bitmap.height
    const scale = Math.min(1, maxDim / Math.max(w, h))
    w = Math.round(w * scale)
    h = Math.round(h * scale)
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    if (!ctx) throw new Error('Canvas no disponible')
    ctx.drawImage(bitmap, 0, 0, w, h)
    return c.toDataURL('image/jpeg', quality)
  } finally {
    bitmap.close()
  }
}

type FileBuildStep = {
  accept?: string
  maxBytesPerFile?: number
}

export async function buildFileItemsFromFiles(files: File[], step: FileBuildStep) {
  const maxB = step.maxBytesPerFile ?? 2 * 1024 * 1024
  const accept = (step.accept || '').split(',').map((s) => s.trim()).filter(Boolean)

  const mimeMatches = (file: File) => {
    if (!accept.length) return true
    const type = file.type || ''
    const lower = file.name.toLowerCase()
    return accept.some((pat) => {
      if (pat.startsWith('.')) return lower.endsWith(pat.toLowerCase())
      if (pat.endsWith('/*')) return type.startsWith(pat.slice(0, -1))
      return type === pat
    })
  }

  const out: FileAnswerPayload['items'] = []
  for (const file of files) {
    if (file.size > maxB) {
      throw new Error(`${file.name} supera el máximo de ${Math.round(maxB / (1024 * 1024))} MB`)
    }
    if (!mimeMatches(file)) {
      throw new Error(`${file.name}: formato no permitido en este paso`)
    }
    let dataUrl: string
    const isRaster = file.type.startsWith('image/') && file.type !== 'image/svg+xml'
    if (isRaster) {
      dataUrl = await rasterToCompressedDataUrl(file, 1600, 0.82)
    } else {
      dataUrl = await readFileAsDataUrl(file)
    }
    const approxBytes = Math.round((dataUrl.length * 3) / 4)
    if (approxBytes > maxB * 1.35) {
      throw new Error(`${file.name} sigue siendo demasiado grande; prueba otro archivo o menor resolución`)
    }
    out.push({
      name: file.name,
      mime: isRaster ? 'image/jpeg' : file.type || 'application/octet-stream',
      size: file.size,
      dataUrl,
    })
  }
  return out
}
