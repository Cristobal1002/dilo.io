'use client'

import type { PublicFlowRecord } from '@/lib/load-published-flow'
import { publicAppOrigin } from '@/lib/public-site'

function hidePublicBranding(settings: unknown): boolean {
  if (!settings || typeof settings !== 'object') return false
  return (settings as { hide_branding?: unknown }).hide_branding === true
}

export function PublicFlowBrandingFooter({ flow }: { flow: PublicFlowRecord }) {
  if (hidePublicBranding(flow.settings)) return null

  const origin = publicAppOrigin()
  const href = `${origin}/?ref=flow`

  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-1 px-4 py-3 text-center text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">
      <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5">
        <span>Hecho con</span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#6B4DD4] underline-offset-2 hover:underline dark:text-[#B8A4FC]"
        >
          Dilo
        </a>
        <span className="hidden sm:inline">·</span>
        <span className="max-w-56 leading-snug sm:max-w-none">Crea el tuyo en segundos →</span>
      </div>
    </div>
  )
}
