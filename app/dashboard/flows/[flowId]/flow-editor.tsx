'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChartBarSquareIcon,
  CodeBracketIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  PuzzlePieceIcon,
  QrCodeIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { ButtonSpinner } from '@/components/spinners'
import { readApiResult } from '@/lib/read-api-result'
import { DeleteFlowModal } from '@/components/ui/delete-flow-modal'
import { DiloModal } from '@/components/ui/modal'
import { FlowShareModal } from '@/components/flow-share-modal'
import { useToast } from '@/components/ui/toast'
import { publicAppOrigin } from '@/lib/public-site'

interface FlowEditorProps {
  flowId: string
  status: string
  flowName: string
  sessionCount: number
  flowSettings?: unknown
  workspaceLogoUrl?: string | null
}

/** Alineado con Mordecai (DashboardShell ⋮ / CaseActionsRow): ghost, sin borde. */
const ellipsisTrigger =
  'p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#252936] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB] transition-colors'

const publishBtn =
  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 bg-linear-to-br from-dilo-500 to-dilo-600 shadow-md shadow-dilo-500/20 hover:opacity-95'

const menuPanel =
  'absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-visible rounded-xl border border-[#E5E7EB] bg-white px-0 pt-2 pb-2 font-sans text-sm antialiased shadow-lg dark:border-[#2A2F3F] dark:bg-[#1A1D29]'

const menuItemBase =
  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium rounded-md transition-colors text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB]'

const menuItemDanger =
  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium rounded-md transition-colors text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'

const menuIcon = 'h-5 w-5 shrink-0'

export default function FlowEditor({
  flowId,
  status,
  flowName,
  sessionCount,
  flowSettings,
  workspaceLogoUrl = null,
}: FlowEditorProps) {
  const router = useRouter()
  const toast = useToast()
  const menuId = useId()
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [embedModalOpen, setEmbedModalOpen] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen, closeMenu])

  const handlePublish = async () => {
    setLoading(true)
    setPublishError(null)
    try {
      const res = await fetch(`/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      const result = await readApiResult(res)
      if (!result.ok) {
        setPublishError(result.message)
        return
      }
      router.refresh()
    } catch {
      setPublishError('No se pudo publicar. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    const url = `${publicAppOrigin()}/f/${flowId}`
    void navigator.clipboard.writeText(url)
    toast('Enlace copiado al portapapeles', 'success')
    closeMenu()
  }

  const embedSnippet = `<!-- Dilo — pega antes de </body> -->
<script src="${publicAppOrigin()}/embed.js" data-flow="${flowId}"></script>`

  const handleCopyEmbed = () => {
    navigator.clipboard.writeText(embedSnippet)
    toast('Código de embed copiado', 'success')
  }

  const handleDeleteConfirm = async () => {
    const res = await fetch(`/api/flows/${flowId}`, { method: 'DELETE' })
    if (res.ok) {
      toast(`"${flowName}" eliminado`, 'success')
      router.push('/dashboard')
    } else {
      const body = await res.json().catch(() => ({}))
      toast(body?.error ?? 'No se pudo eliminar el flow. Inténtalo de nuevo.', 'error')
      throw new Error('delete failed')
    }
  }

  const isPublished = status === 'published'

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="relative flex items-center gap-2">
          {isPublished ? (
            <>
              <button
                type="button"
                className={ellipsisTrigger}
                aria-expanded={menuOpen}
                aria-haspopup="menu"
                aria-controls={menuId}
                title="Opciones del flow"
                onClick={() => setMenuOpen((o) => !o)}
              >
                <EllipsisVerticalIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              </button>
              {menuOpen ? (
                <>
                  <div className="fixed inset-0 z-40" aria-hidden="true" onClick={closeMenu} />
                  <div id={menuId} className={menuPanel} role="menu" aria-label="Opciones del flow">
                    <button
                      type="button"
                      role="menuitem"
                      className={menuItemBase}
                      onClick={() => {
                        closeMenu()
                        setShareModalOpen(true)
                      }}
                    >
                      <QrCodeIcon className={menuIcon} strokeWidth={1.5} aria-hidden="true" />
                      Enlace y código QR
                    </button>
                    <button type="button" role="menuitem" className={menuItemBase} onClick={handleCopyLink}>
                      <LinkIcon className={menuIcon} strokeWidth={1.5} aria-hidden="true" />
                      Copiar enlace público
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className={menuItemBase}
                      onClick={() => {
                        closeMenu()
                        setEmbedModalOpen(true)
                      }}
                    >
                      <CodeBracketIcon className={menuIcon} strokeWidth={1.5} aria-hidden="true" />
                      Código de embed
                    </button>
                    <Link
                      href={`/dashboard/flows/${flowId}/connectors`}
                      role="menuitem"
                      className={menuItemBase}
                      onClick={closeMenu}
                    >
                      <PuzzlePieceIcon className={menuIcon} strokeWidth={1.5} aria-hidden="true" />
                      Conectores
                    </Link>
                    <Link
                      href={`/dashboard/flows/${flowId}/results`}
                      role="menuitem"
                      className={menuItemBase}
                      onClick={closeMenu}
                    >
                      <ChartBarSquareIcon className={menuIcon} strokeWidth={1.5} aria-hidden="true" />
                      Resultados
                    </Link>
                    <div className="my-1.5 border-t border-[#E5E7EB] dark:border-[#2A2F3F]" />
                    <button
                      type="button"
                      role="menuitem"
                      className={menuItemDanger}
                      onClick={() => { closeMenu(); setDeleteModalOpen(true) }}
                    >
                      <TrashIcon className={menuIcon} strokeWidth={1.5} aria-hidden="true" />
                      Eliminar flow
                    </button>
                  </div>
                </>
              ) : null}
            </>
          ) : (
            <>
              <button
                type="button"
                title="Eliminar flow"
                aria-label="Eliminar flow"
                onClick={() => setDeleteModalOpen(true)}
                className="p-2 rounded-lg text-[#C8CED9] dark:text-[#5c6578] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <TrashIcon className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={handlePublish}
                disabled={loading}
                aria-busy={loading}
                className={publishBtn}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <ButtonSpinner variant="inverse" />
                    Publicando…
                  </span>
                ) : (
                  '🚀 Publicar flow'
                )}
              </button>
            </>
          )}
        </div>
        {publishError ? (
          <p className="max-w-[280px] text-right text-xs font-medium text-red-600 dark:text-red-400" role="alert">
            {publishError}
          </p>
        ) : null}
      </div>

      <DeleteFlowModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        flowName={flowName}
        sessionCount={sessionCount}
        onConfirm={handleDeleteConfirm}
      />

      <FlowShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        flowId={flowId}
        flowName={flowName}
        flowSettings={flowSettings}
        workspaceLogoUrl={workspaceLogoUrl}
      />

      <DiloModal
        isOpen={embedModalOpen}
        onClose={() => setEmbedModalOpen(false)}
        title="Embed en tu web"
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="rounded-xl border border-[#E5E7EB] bg-white px-4 py-2 text-sm font-medium text-[#4B5563] transition-colors hover:bg-[#F8F9FB] dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#9CA3AF] dark:hover:bg-[#2a3040]"
              onClick={() => setEmbedModalOpen(false)}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="rounded-xl bg-linear-to-br from-dilo-500 to-dilo-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-dilo-500/20 hover:opacity-95"
              onClick={handleCopyEmbed}
            >
              Copiar código
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Copia este bloque y pégalo antes de <code className="rounded bg-[#F3F4F6] px-1 dark:bg-[#252936]">&lt;/body&gt;</code> en
          tu sitio. El script debe cargarse desde tu dominio público de Dilo (URL absoluta).
        </p>
        <pre className="max-h-[220px] overflow-auto rounded-xl border border-[#E5E7EB] bg-[#0F1117] p-4 text-left text-xs leading-relaxed text-[#E5E7EB] dark:border-[#2A2F3F]">
          {embedSnippet}
        </pre>
        <a
          href={`/f/${flowId}?embed=1`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-medium text-[#6B4DD4] underline-offset-2 hover:underline dark:text-[#B8A4FC]"
        >
          Vista previa en modo embed →
        </a>
      </DiloModal>
    </>
  )
}
