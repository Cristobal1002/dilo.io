'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { DiloModal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { resolveFlowShareLogoUrl } from '@/lib/flow-share-logo'
import { publicAppOrigin } from '@/lib/public-site'
import { cn } from '@/lib/utils'

function measureQrPixelSize(): number {
  if (typeof window === 'undefined') return 320
  const w = window.innerWidth
  return Math.min(420, Math.max(200, w - 56))
}

async function drawLogoOnQrCanvas(canvas: HTMLCanvasElement, logoUrl: string): Promise<void> {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('logo-load'))
    img.src = logoUrl
  })
  const w = canvas.width
  const logoSize = Math.round(w * 0.2)
  const pad = 8
  const x = (w - logoSize) / 2
  const y = (w - logoSize) / 2
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x - pad, y - pad, logoSize + pad * 2, logoSize + pad * 2)
  ctx.drawImage(img, x, y, logoSize, logoSize)
}

type Props = {
  isOpen: boolean
  onClose: () => void
  flowId: string
  flowName: string
  flowSettings: unknown
  workspaceLogoUrl: string | null | undefined
}

export function FlowShareModal({ isOpen, onClose, flowId, flowName, flowSettings, workspaceLogoUrl }: Props) {
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tab, setTab] = useState<'link' | 'qr'>('link')
  const [includeLogo, setIncludeLogo] = useState(false)
  const [rendering, setRendering] = useState(false)

  const publicUrl = useMemo(() => `${publicAppOrigin()}/f/${flowId}`, [flowId])
  const resolvedLogo = useMemo(
    () => resolveFlowShareLogoUrl(flowSettings, workspaceLogoUrl),
    [flowSettings, workspaceLogoUrl],
  )

  const paintQr = useCallback(async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setRendering(true)
    try {
      const size = measureQrPixelSize()
      await QRCode.toCanvas(canvas, publicUrl, {
        width: size,
        margin: 2,
        errorCorrectionLevel: 'H',
        color: { dark: '#0f1117', light: '#ffffff' },
      })
      if (includeLogo && resolvedLogo) {
        try {
          await drawLogoOnQrCanvas(canvas, resolvedLogo)
        } catch {
          toast('No se pudo cargar el logo (CORS o URL). El QR se descarga sin logo.', 'error')
          await QRCode.toCanvas(canvas, publicUrl, {
            width: size,
            margin: 2,
            errorCorrectionLevel: 'H',
            color: { dark: '#0f1117', light: '#ffffff' },
          })
        }
      }
    } catch {
      toast('No se pudo generar el código QR.', 'error')
    } finally {
      setRendering(false)
    }
  }, [includeLogo, publicUrl, resolvedLogo, toast])

  useEffect(() => {
    if (!isOpen || tab !== 'qr') return
    void paintQr()
    const onResize = () => void paintQr()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [isOpen, tab, paintQr])

  useEffect(() => {
    if (!isOpen) {
      setTab('link')
      setIncludeLogo(false)
    }
  }, [isOpen])

  const copyLink = () => {
    void navigator.clipboard.writeText(publicUrl)
    toast('Enlace copiado', 'success')
  }

  const downloadPng = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const a = document.createElement('a')
      const safe = flowName.replace(/[^\w\s-]/g, '').trim().slice(0, 40) || 'flow'
      a.href = canvas.toDataURL('image/png')
      a.download = `${safe.replace(/\s+/g, '-')}-qr.png`
      a.click()
      toast('QR descargado', 'success')
    } catch {
      toast('No se pudo descargar la imagen.', 'error')
    }
  }

  const canShowLogoInQr = Boolean(resolvedLogo)

  return (
    <DiloModal
      isOpen={isOpen}
      onClose={onClose}
      title="Compartir flow"
      size="lg"
      footer={
        <>
          <button
            type="button"
            className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F8F9FB] dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#9CA3AF] dark:hover:bg-[#2a3040]"
            onClick={onClose}
          >
            Cerrar
          </button>
          {tab === 'qr' ? (
            <button
              type="button"
              className="rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-dilo-500/20 hover:opacity-95 disabled:opacity-50"
              onClick={downloadPng}
              disabled={rendering}
            >
              Descargar PNG
            </button>
          ) : (
            <button
              type="button"
              className="rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-dilo-500/20 hover:opacity-95"
              onClick={copyLink}
            >
              Copiar enlace
            </button>
          )}
        </>
      }
    >
      <div className="mb-4 flex gap-1 rounded-xl border border-[#E5E7EB] bg-[#F8F9FB] p-1 dark:border-[#2A2F3F] dark:bg-[#0F1117]">
        <button
          type="button"
          onClick={() => setTab('link')}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            tab === 'link'
              ? 'bg-white text-[#1A1A1A] shadow-sm dark:bg-[#1A1D29] dark:text-[#F8F9FB]'
              : 'text-[#6B7280] dark:text-[#9CA3AF]',
          )}
        >
          Enlace
        </button>
        <button
          type="button"
          onClick={() => setTab('qr')}
          className={cn(
            'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
            tab === 'qr'
              ? 'bg-white text-[#1A1A1A] shadow-sm dark:bg-[#1A1D29] dark:text-[#F8F9FB]'
              : 'text-[#6B7280] dark:text-[#9CA3AF]',
          )}
        >
          Código QR
        </button>
      </div>

      {tab === 'link' ? (
        <div className="space-y-3">
          <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            Enlace público del flow publicado. Podés copiarlo o pasar a la pestaña QR para imprimir o pantallas.
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={publicUrl}
              className="min-w-0 flex-1 rounded-xl border border-[#E5E7EB] bg-[#F8F9FB] px-3 py-2 text-xs text-[#1A1A1A] dark:border-[#2A2F3F] dark:bg-[#0F1117] dark:text-[#E5E7EB]"
              onFocus={(e) => e.target.select()}
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#F8F9FB] dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#9CA3AF] dark:hover:bg-[#2a3040]"
            >
              Copiar
            </button>
          </div>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-sm font-medium text-[#6B4DD4] underline-offset-2 hover:underline dark:text-[#B8A4FC]"
          >
            Abrir en nueva pestaña →
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#E5E7EB] bg-[#FAFAFC] px-3 py-3 dark:border-[#2A2F3F] dark:bg-[#0F1117]/80">
            <input
              type="checkbox"
              checked={includeLogo}
              onChange={(e) => setIncludeLogo(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[#9C77F5]/40 text-dilo-600 focus:ring-dilo-500"
            />
            <span>
              <span className="text-sm font-medium text-[#1A1A1A] dark:text-[#F8F9FB]">Incluir logo en el centro</span>
              <span className="mt-0.5 block text-xs text-[#6B7280] dark:text-[#9CA3AF]">
                Usa el logo del flow o el del workspace (solo https). Si no hay logo, el QR va sin imagen.
              </span>
            </span>
          </label>
          {includeLogo && !canShowLogoInQr ? (
            <p className="text-xs text-amber-800 dark:text-amber-200">
              No hay logo configurado: agregá uno en la presentación del flow o en ajustes del workspace.
            </p>
          ) : null}
          <div className="flex flex-col items-center gap-2">
            <div className="relative mx-auto w-full max-w-[min(92vw,420px)] rounded-2xl border border-[#E5E7EB] bg-white p-2 sm:p-3 dark:border-[#2A2F3F] dark:bg-white">
              <canvas ref={canvasRef} className="mx-auto block h-auto max-h-[min(50dvh,320px)] w-full max-w-full object-contain" />
              {rendering ? (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-white/70 text-xs font-medium text-[#6B7280] dark:bg-[#1A1D29]/70 dark:text-[#9CA3AF]">
                  Generando…
                </div>
              ) : null}
            </div>
            <p className="text-center text-[11px] text-[#9CA3AF]">Descargá el PNG para flyers, tarjetas o pantallas.</p>
          </div>
        </div>
      )}
    </DiloModal>
  )
}
