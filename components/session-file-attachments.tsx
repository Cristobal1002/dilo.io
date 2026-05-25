'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { readApiResult } from '@/lib/read-api-result'
import { countSessionFiles, downloadSessionFileGroups } from '@/lib/download-session-file-resources'
import type { FileResourceGroup } from '@/lib/flow-results-file-resources'
import { fileAnswerRawHasDownloadableSource, fileAnswerRawHasListedAttachments } from '@/lib/flow-results-file-resources'

type Props = {
  flowId: string
  sessionId: string
  /** Respuestas crudas por stepId (opcional, para avisar si solo hay nombres sin binario). */
  fileAnswersByStep?: Record<string, string | null>
}

export function SessionFileAttachments({ flowId, sessionId, fileAnswersByStep }: Props) {
  const [groups, setGroups] = useState<FileResourceGroup[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const listedOnly =
    fileAnswersByStep &&
    Object.values(fileAnswersByStep).some(
      (raw) => fileAnswerRawHasListedAttachments(raw) && !fileAnswerRawHasDownloadableSource(raw),
    )

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch(
        `/api/flows/${encodeURIComponent(flowId)}/sessions/${encodeURIComponent(sessionId)}/file-resources`,
      )
      const r = await readApiResult<{ groups: FileResourceGroup[] }>(res)
      if (!r.ok) {
        setMsg(r.message)
        setGroups([])
        return
      }
      setGroups(r.data.groups)
    } finally {
      setLoading(false)
    }
  }, [flowId, sessionId])

  useEffect(() => {
    void load()
  }, [load])

  const downloadAll = async () => {
    if (!groups?.length) return
    setBusy(true)
    try {
      const n = await downloadSessionFileGroups(groups)
      if (n === 0) setMsg('No hay archivos descargables.')
      else setMsg(null)
    } finally {
      setBusy(false)
    }
  }

  const downloadOne = async (group: FileResourceGroup, fileIndex: number) => {
    const file = group.files[fileIndex]
    if (!file) return
    setBusy(true)
    try {
      await downloadSessionFileGroups([{ question: group.question, files: [file] }])
    } finally {
      setBusy(false)
    }
  }

  const fileCount = groups ? countSessionFiles(groups) : 0

  if (loading) {
    return (
      <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">Comprobando adjuntos…</p>
    )
  }

  if (fileCount === 0 && !listedOnly) {
    return null
  }

  return (
    <div className="rounded-2xl border border-[#E8EAEF] bg-[#FAFBFC] p-4 dark:border-[#2A2F3F] dark:bg-[#161821]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[#6B7280] dark:text-[#9CA3AF]">
          Archivos adjuntos
        </h2>
        {fileCount > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void downloadAll()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#9C77F5] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="h-4 w-4" aria-hidden />
            {busy ? 'Descargando…' : `Descargar todo (${fileCount})`}
          </button>
        ) : null}
      </div>

      {listedOnly && fileCount === 0 ? (
        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
          Esta sesión registra nombres de archivo pero no el contenido (suele pasar si no se llegó a
          completar el flow). Pide al cliente que reenvíe el archivo o que complete el formulario de nuevo.
        </p>
      ) : null}

      {msg ? (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{msg}</p>
      ) : null}

      {groups && fileCount > 0 ? (
        <ul className="mt-4 space-y-4">
          {groups.map((g) => (
            <li key={g.question}>
              <p className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">{g.question}</p>
              <ul className="mt-2 space-y-1.5">
                {g.files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#E8EAEF] bg-white px-3 py-2 dark:border-[#2A2F3F] dark:bg-[#1A1D29]"
                  >
                    <span className="text-sm text-[#1A1A1A] dark:text-[#F8F9FB]">{f.name}</span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void downloadOne(g, i)}
                      className="text-xs font-semibold text-[#6B4DD4] hover:underline disabled:opacity-50 dark:text-[#D4C4FC]"
                    >
                      Descargar
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
