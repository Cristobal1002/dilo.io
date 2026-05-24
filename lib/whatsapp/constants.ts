export const WHATSAPP_PROVIDER = 'whatsapp' as const

export const META_GRAPH_VERSION = 'v21.0'

export function metaGraphUrl(path: string): string {
  const p = path.startsWith('/') ? path.slice(1) : path
  return `https://graph.facebook.com/${META_GRAPH_VERSION}/${p}`
}
