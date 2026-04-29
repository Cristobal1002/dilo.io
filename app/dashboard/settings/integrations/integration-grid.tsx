import {
  BadgeSoon,
  integrationCardShell,
  integrationLogoWrap,
  LogoGoogleDrive,
  LogoN8n,
  LogoWhatsApp,
} from './integration-logos'
import { ResendIntegrationCard } from './resend-integration-card'

const soonCard = `${integrationCardShell} opacity-[0.92]`

export function IntegrationGrid() {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2">
      <ResendIntegrationCard />

      <article className={soonCard}>
        <div className="flex h-full flex-col gap-3">
          <div className="flex gap-3">
            <div className={integrationLogoWrap}>
              <LogoGoogleDrive />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">Google Drive</h2>
                <BadgeSoon />
              </div>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                Adjuntos, exportaciones y archivos generados por flows enlazados a carpetas del equipo.
              </p>
            </div>
          </div>
        </div>
      </article>

      <article className={soonCard}>
        <div className="flex h-full flex-col gap-3">
          <div className="flex gap-3">
            <div className={integrationLogoWrap}>
              <LogoN8n />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">n8n</h2>
                <BadgeSoon />
              </div>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                Webhooks y automatizaciones avanzadas para orquestar Dilo con el resto de tu stack.
              </p>
            </div>
          </div>
        </div>
      </article>

      <article className={soonCard}>
        <div className="flex h-full flex-col gap-3">
          <div className="flex gap-3">
            <div className={integrationLogoWrap}>
              <LogoWhatsApp />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">WhatsApp</h2>
                <BadgeSoon />
              </div>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8]">
                Mensajes y seguimiento con leads por el canal que ya usan tus equipos comerciales.
              </p>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}
