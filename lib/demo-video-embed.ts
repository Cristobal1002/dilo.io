/**
 * Convierte una URL pública de demo (YouTube, Vimeo, Loom, GIF/video directo)
 * en props seguras para el embed en la portada del flow.
 */

export function readDemoVideoUrlFromSettings(settings: unknown): string | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const v = (settings as Record<string, unknown>).demo_video_url
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t ? t : null
}

export type DemoVideoEmbed =
  | { kind: 'iframe'; src: string; title: string }
  | { kind: 'video'; src: string }
  | { kind: 'img'; src: string }

const YT_HOST = /^(www\.)?(youtube\.com|youtube-nocookie\.com|m\.youtube\.com)$/i
const VIMEO_HOST = /^(www\.)?vimeo\.com$/i
const LOOM_HOST = /^(www\.)?loom\.com$/i

function youtubeIdFromUrl(u: URL): string | null {
  if (u.hostname === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '').split('/')[0]
    return id && /^[\w-]{11}$/.test(id) ? id : null
  }
  if (YT_HOST.test(u.hostname)) {
    if (u.pathname.startsWith('/embed/')) {
      const id = u.pathname.slice(7).split('/')[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
    if (u.pathname === '/watch' || u.pathname.startsWith('/watch/')) {
      const v = u.searchParams.get('v')
      return v && /^[\w-]{11}$/.test(v) ? v : null
    }
    if (u.pathname.startsWith('/shorts/')) {
      const id = u.pathname.slice(8).split('/')[0]
      return id && /^[\w-]{11}$/.test(id) ? id : null
    }
  }
  return null
}

function vimeoIdFromUrl(u: URL): string | null {
  if (!VIMEO_HOST.test(u.hostname)) return null
  const m = u.pathname.match(/^\/(\d+)(?:\/|$)/)
  return m?.[1] ?? null
}

function loomIdFromUrl(u: URL): string | null {
  if (!LOOM_HOST.test(u.hostname)) return null
  const m = u.pathname.match(/^\/share\/([a-zA-Z0-9-]+)/)
  return m?.[1] ?? null
}

/** Solo https; rechaza javascript:, data:, etc. */
export function resolveDemoVideoEmbed(raw: string): DemoVideoEmbed | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  let u: URL
  try {
    u = new URL(trimmed)
  } catch {
    return null
  }
  if (u.protocol !== 'https:') return null

  const yt = youtubeIdFromUrl(u)
  if (yt) {
    return {
      kind: 'iframe',
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}`,
      title: 'Video de demo',
    }
  }

  const vim = vimeoIdFromUrl(u)
  if (vim) {
    return {
      kind: 'iframe',
      src: `https://player.vimeo.com/video/${encodeURIComponent(vim)}`,
      title: 'Video de demo',
    }
  }

  const loom = loomIdFromUrl(u)
  if (loom) {
    return {
      kind: 'iframe',
      src: `https://www.loom.com/embed/${encodeURIComponent(loom)}`,
      title: 'Video de demo',
    }
  }

  const path = u.pathname.toLowerCase()
  if (path.endsWith('.gif')) return { kind: 'img', src: u.toString() }
  if (path.endsWith('.mp4') || path.endsWith('.webm')) return { kind: 'video', src: u.toString() }

  return null
}
