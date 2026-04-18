'use client'

import { useCallback, useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DocumentTextIcon,
  EllipsisVerticalIcon,
  LinkIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { ButtonSpinner, SavingSpinner } from '@/components/spinners'

interface FlowEditorProps {
  flowId: string
  status: string
  name: string
  description: string | null
}

/** Alineado con Mordecai (DashboardShell ⋮ / CaseActionsRow): ghost, sin borde. */
const ellipsisTrigger =
  'p-2 rounded-lg text-[#6B7280] dark:text-[#9CA3AF] hover:bg-[#F3F4F6] dark:hover:bg-[#252936] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB] transition-colors'

const publishBtn =
  'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50 bg-linear-to-br from-dilo-500 to-dilo-600 shadow-md shadow-dilo-500/20 hover:opacity-95'

/** Panel como `ProfileMenuDropdown` en Mordecai `DashboardShell`. */
const menuPanel =
  'absolute right-0 top-full z-50 mt-2 min-w-[220px] overflow-visible rounded-xl border border-[#E5E7EB] bg-white pt-2 px-0 pb-2 shadow-lg dark:border-[#2A2F3F] dark:bg-[#1A1D29]'

/** Ítem con icono a la izquierda — mismo `menuItemBase` que el menú ⋮ del header Mordecai. */
const menuItemBase =
  'flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium rounded-md transition-colors text-[#4B5563] dark:text-[#9CA3AF] hover:bg-[#F8F9FB] dark:hover:bg-[#252936] hover:text-[#1A1A1A] dark:hover:text-[#F8F9FB]'

const menuIcon = 'h-5 w-5 shrink-0'

const menuDivider = 'my-2 border-t border-[#E5E7EB] dark:border-[#2A2F3F]'

function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [locked])
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  useBodyScrollLock(true)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-xl dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="flow-editor-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="flow-editor-modal-title" className="text-lg font-semibold text-[#1A1A1A] dark:text-[#F8F9FB]">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

const inputClass =
  'mt-1 w-full rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm text-[#1A1A1A] dark:border-[#2A2F3F] dark:bg-[#252936] dark:text-[#F8F9FB] focus:outline-none focus:ring-2 focus:ring-[#9C77F5]/25'

const modalSecondaryBtn =
  'rounded-lg border border-[#E5E7EB] bg-transparent px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:bg-[#F8F9FB] dark:border-[#2A2F3F] dark:text-[#9CA3AF] dark:hover:bg-[#252936]'

const modalPrimaryBtn =
  'rounded-lg bg-[#9C77F5] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-95 disabled:opacity-50'

export default function FlowEditor({ flowId, status, name, description }: FlowEditorProps) {
  const router = useRouter()
  const menuId = useId()
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editTitleOpen, setEditTitleOpen] = useState(false)
  const [editDescOpen, setEditDescOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(name)
  const [descDraft, setDescDraft] = useState(description ?? '')
  const [saving, setSaving] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen, closeMenu])

  useEffect(() => {
    setTitleDraft(name)
  }, [name])

  useEffect(() => {
    setDescDraft(description ?? '')
  }, [description])

  const handlePublish = async () => {
    setLoading(true)
    try {
      await fetch(`/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      })
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/f/${flowId}`
    navigator.clipboard.writeText(url)
    setMenuOpen(false)
  }

  const saveTitle = async () => {
    const trimmed = titleDraft.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      await fetch(`/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      setEditTitleOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const saveDescription = async () => {
    setSaving(true)
    try {
      await fetch(`/api/flows/${flowId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descDraft.trim() === '' ? null : descDraft }),
      })
      setEditDescOpen(false)
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  const openEditTitle = () => {
    setMenuOpen(false)
    setTitleDraft(name)
    setEditTitleOpen(true)
  }

  const openEditDescription = () => {
    setMenuOpen(false)
    setDescDraft(description ?? '')
    setEditDescOpen(true)
  }

  const isPublished = status === 'published'

  return (
    <>
      <div className="flex items-center gap-2">
        <div className="relative">
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
              <div
                className="fixed inset-0 z-40"
                aria-hidden
                onClick={closeMenu}
              />
              <div id={menuId} className={menuPanel} role="menu" aria-label="Opciones del flow">
                {isPublished ? (
                  <>
                    <button type="button" role="menuitem" className={menuItemBase} onClick={handleCopyLink}>
                      <LinkIcon className={menuIcon} strokeWidth={1.5} aria-hidden />
                      Copiar enlace público
                    </button>
                    <div className={menuDivider} />
                  </>
                ) : null}
                <button type="button" role="menuitem" className={menuItemBase} onClick={openEditTitle}>
                  <PencilSquareIcon className={menuIcon} strokeWidth={1.5} aria-hidden />
                  Editar título
                </button>
                <button type="button" role="menuitem" className={menuItemBase} onClick={openEditDescription}>
                  <DocumentTextIcon className={menuIcon} strokeWidth={1.5} aria-hidden />
                  Editar descripción
                </button>
              </div>
            </>
          ) : null}
        </div>
        {!isPublished ? (
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
        ) : null}
      </div>

      {editTitleOpen ? (
        <Modal title="Editar título" onClose={() => !saving && setEditTitleOpen(false)}>
          <label className="mt-4 block text-sm font-medium text-[#374151] dark:text-[#E5E7EB]">Título</label>
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            maxLength={200}
            className={inputClass}
            autoFocus
          />
          <p className="mt-1 text-[10px] text-[#9CA3AF]">{titleDraft.length}/200</p>
          {saving ? (
            <p className="mt-2">
              <SavingSpinner />
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className={modalSecondaryBtn}
              onClick={() => setEditTitleOpen(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={modalPrimaryBtn}
              onClick={saveTitle}
              disabled={saving || !titleDraft.trim()}
              aria-busy={saving}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <ButtonSpinner variant="inverse" />
                  Guardando…
                </span>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </Modal>
      ) : null}

      {editDescOpen ? (
        <Modal title="Editar descripción" onClose={() => !saving && setEditDescOpen(false)}>
          <label className="mt-4 block text-sm font-medium text-[#374151] dark:text-[#E5E7EB]">
            Descripción
          </label>
          <textarea
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            maxLength={2000}
            rows={5}
            className={`${inputClass} resize-y`}
            autoFocus
          />
          <p className="mt-1 text-[10px] text-[#9CA3AF]">{descDraft.length}/2000</p>
          {saving ? (
            <p className="mt-2">
              <SavingSpinner />
            </p>
          ) : null}
          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className={modalSecondaryBtn}
              onClick={() => setEditDescOpen(false)}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={modalPrimaryBtn}
              onClick={saveDescription}
              disabled={saving}
              aria-busy={saving}
            >
              {saving ? (
                <span className="inline-flex items-center gap-2">
                  <ButtonSpinner variant="inverse" />
                  Guardando…
                </span>
              ) : (
                'Guardar'
              )}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
