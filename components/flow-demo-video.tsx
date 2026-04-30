'use client'

import { useMemo, useState } from 'react'
import { resolveDemoVideoEmbed, type DemoVideoEmbed } from '@/lib/demo-video-embed'
import { cn } from '@/lib/utils'

function EmbedFrame({ embed, className }: { embed: DemoVideoEmbed; className?: string }) {
  if (embed.kind === 'iframe') {
    return (
      <div className={cn('relative w-full overflow-hidden rounded-2xl border border-[#9C77F5]/15 bg-black/5 shadow-sm dark:border-[#2A2F3F] dark:bg-black/20', className)}>
        <div className="aspect-video w-full">
          <iframe
            src={embed.src}
            title={embed.title}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      </div>
    )
  }
  if (embed.kind === 'video') {
    return (
      <div className={cn('overflow-hidden rounded-2xl border border-[#9C77F5]/15 shadow-sm dark:border-[#2A2F3F]', className)}>
        <video src={embed.src} controls className="aspect-video w-full bg-black" preload="metadata" />
      </div>
    )
  }
  return (
    <div className={cn('overflow-hidden rounded-2xl border border-[#9C77F5]/15 shadow-sm dark:border-[#2A2F3F]', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- URL https validada en resolveDemoVideoEmbed */}
      <img src={embed.src} alt="" className="mx-auto max-h-[min(50vh,360px)] w-full object-contain" loading="lazy" />
    </div>
  )
}

type Props = {
  url: string | null | undefined
  /** Si false, solo muestra aviso si la URL no es válida (panel editor). */
  showInvalidHint?: boolean
  /** En el dashboard: el visitante hace clic antes de cargar el iframe (menos peso). En /f/: embed al visto. */
  clickToLoadIframe?: boolean
  className?: string
}

export function FlowDemoVideo({
  url,
  showInvalidHint = false,
  clickToLoadIframe = false,
  className,
}: Props) {
  const [show, setShow] = useState(!clickToLoadIframe)
  const embed = useMemo(() => {
    const t = typeof url === 'string' ? url.trim() : ''
    if (!t) return null
    return resolveDemoVideoEmbed(t)
  }, [url])

  const trimmed = typeof url === 'string' ? url.trim() : ''

  if (!trimmed) return null

  if (!embed) {
    if (!showInvalidHint) return null
    return (
      <p className={cn('text-left text-xs text-amber-700 dark:text-amber-400', className)}>
        Esta URL no se puede incrustar. Usá un enlace de YouTube, Vimeo, Loom, o un .gif / .mp4 / .webm en https.
      </p>
    )
  }

  if (embed.kind === 'iframe' && clickToLoadIframe && !show) {
    return (
      <div className={cn('w-full max-w-md', className)}>
        <button
          type="button"
          onClick={() => setShow(true)}
          className="w-full rounded-2xl border border-[#9C77F5]/25 bg-[#9C77F5]/8 px-4 py-3 text-sm font-semibold text-[#6B4DD4] transition hover:bg-[#9C77F5]/14 dark:border-[#9C77F5]/35 dark:bg-[#9C77F5]/12 dark:text-[#D4C4FC]"
        >
          Cargar vista previa del video
        </button>
      </div>
    )
  }

  return (
    <div className={cn('w-full max-w-md', className)}>
      <EmbedFrame embed={embed} />
    </div>
  )
}
