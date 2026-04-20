'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ChartBarSquareIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline'
import { ButtonSpinner } from '@/components/spinners'
import { readApiResult } from '@/lib/read-api-result'

interface FlowEditorProps {
  flowId: string
  status: string
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

const menuIcon = 'h-5 w-5 shrink-0'

export default function FlowEditor({ flowId, status }: FlowEditorProps) {
  const router = useRouter()
  const menuId = useId()
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
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
    const url = `${window.location.origin}/f/${flowId}`
    navigator.clipboard.writeText(url)
    setMenuOpen(false)
  }

  const isPublished = status === 'published'

  return (
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
              <EllipsisVerticalIcon className="h-5 w-5" strokeWidth={1.5} aria-hidden />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-40" aria-hidden onClick={closeMenu} />
                <div id={menuId} className={menuPanel} role="menu" aria-label="Opciones del flow">
                  <button type="button" role="menuitem" className={menuItemBase} onClick={handleCopyLink}>
                    <LinkIcon className={menuIcon} strokeWidth={1.5} aria-hidden />
                    Copiar enlace público
                  </button>
                  <Link
                    href={`/dashboard/flows/${flowId}/connectors`}
                    role="menuitem"
                    className={menuItemBase}
                    onClick={closeMenu}
                  >
                    <PuzzlePieceIcon className={menuIcon} strokeWidth={1.5} aria-hidden />
                    Conectores
                  </Link>
                  <Link
                    href={`/dashboard/flows/${flowId}/results`}
                    role="menuitem"
                    className={menuItemBase}
                    onClick={closeMenu}
                  >
                    <ChartBarSquareIcon className={menuIcon} strokeWidth={1.5} aria-hidden />
                    Resultados
                  </Link>
                </div>
              </>
            ) : null}
          </>
        ) : (
          <button type="button" onClick={handlePublish} disabled={loading} aria-busy={loading} className={publishBtn}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <ButtonSpinner variant="inverse" />
                Publicando…
              </span>
            ) : (
              '🚀 Publicar flow'
            )}
          </button>
        )}
      </div>
      {publishError ? (
        <p className="max-w-[280px] text-right text-xs font-medium text-red-600 dark:text-red-400" role="alert">
          {publishError}
        </p>
      ) : null}
    </div>
  )
}
