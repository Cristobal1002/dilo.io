import Image from 'next/image'
import { cn } from '@/lib/utils'

function IntegrationLogo({
  src,
  alt,
  invertInDark,
  className,
}: {
  src: string
  alt: string
  invertInDark?: boolean
  className?: string
}) {
  return (
    <span className={cn('relative block h-7 w-7', invertInDark && 'dark:invert', className)}>
      <Image src={src} alt={alt} fill className="object-contain" sizes="28px" />
    </span>
  )
}

export function LogoResend() {
  return <IntegrationLogo src="/integrations/resend-icon-black.svg" alt="Resend" invertInDark />
}

export function LogoGoogleDrive() {
  return <IntegrationLogo src="/integrations/google-drive-logo.svg" alt="Google Drive" />
}

export function LogoN8n() {
  return <IntegrationLogo src="/integrations/n8n_icon-logo.png" alt="n8n" className="h-8 w-8" />
}

export function LogoWhatsApp() {
  return <IntegrationLogo src="/integrations/whatsapp-logo.png" alt="WhatsApp" />
}

export function BadgeAvailable() {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
      Disponible
    </span>
  )
}

export function BadgeSoon() {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#64748B] dark:bg-[#252936] dark:text-[#94A3B8]">
      Próximamente
    </span>
  )
}

export const integrationCardShell =
  'flex h-full min-h-[200px] flex-col rounded-2xl border border-[#E8EAEF] bg-white p-5 dark:border-[#2A2F3F] dark:bg-[#1A1D29]'

export const integrationLogoWrap =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#E8EAEF] bg-[#FAFBFC] dark:border-[#2A2F3F] dark:bg-[#161821]'
