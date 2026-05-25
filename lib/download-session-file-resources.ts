import type { FileResourceGroup } from '@/lib/flow-results-file-resources'

function triggerAnchorDownload(href: string, filename: string) {
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function nextFilename(used: Map<string, number>, base: string): string {
  const safe = base.trim() || 'archivo'
  const k = used.get(safe) ?? 0
  used.set(safe, k + 1)
  if (k === 0) return safe
  const dot = safe.lastIndexOf('.')
  if (dot > 0) return `${safe.slice(0, dot)} (${k + 1})${safe.slice(dot)}`
  return `${safe} (${k + 1})`
}

/** Descarga todos los archivos de una sesión (data URL o URL remota). */
export async function downloadSessionFileGroups(groups: FileResourceGroup[]): Promise<number> {
  const used = new Map<string, number>()
  let count = 0
  for (const g of groups) {
    for (const f of g.files) {
      const filename = nextFilename(used, f.name)
      if (f.kind === 'dataUrl') {
        triggerAnchorDownload(f.href, filename)
        count += 1
        continue
      }
      try {
        const fr = await fetch(f.href, { mode: 'cors' })
        if (!fr.ok) throw new Error('bad status')
        const blob = await fr.blob()
        const obj = URL.createObjectURL(blob)
        triggerAnchorDownload(obj, filename)
        URL.revokeObjectURL(obj)
        count += 1
      } catch {
        window.open(f.href, '_blank', 'noopener,noreferrer')
        count += 1
      }
    }
  }
  return count
}

export function countSessionFiles(groups: FileResourceGroup[]): number {
  return groups.reduce((n, g) => n + g.files.length, 0)
}
