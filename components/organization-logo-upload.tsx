'use client'

import { useRef, useState } from 'react'
import { ORG_LOGO, validateOrganizationLogoFile } from '@/lib/organization-logo'
import { readApiResult } from '@/lib/read-api-result'

type Props = {
  currentLogoUrl: string | null
  uploadConfigured: boolean
  onUploaded: (url: string) => void
  onRemoved: () => void
  disabled?: boolean
}

export function OrganizationLogoUpload({
  currentLogoUrl,
  uploadConfigured,
  onUploaded,
  onRemoved,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const hasLogo = Boolean(currentLogoUrl && /^https:\/\//i.test(currentLogoUrl))

  const uploadFile = async (file: File) => {
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/settings/organization/logo', {
        method: 'POST',
        body: form,
      })
      const r = await readApiResult<{ logoUrl: string }>(res)
      if (!r.ok) {
        setError(r.message)
        return
      }
      onUploaded(r.data.logoUrl)
    } catch {
      setError('No se pudo subir el logo. Comprueba la conexión e inténtalo de nuevo.')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const err = await validateOrganizationLogoFile(file)
    if (err) {
      setError(err)
      e.target.value = ''
      return
    }
    await uploadFile(file)
  }

  return (
    <div className="mt-5">
      <span className="text-xs font-semibold text-[#4B5563] dark:text-[#9CA3AF]">Logo del workspace</span>
      <p className="mt-1 text-[11px] leading-relaxed text-[#64748B] dark:text-[#94A3B8]">{ORG_LOGO.hint}</p>

      {!uploadConfigured ? (
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          Falta <code className="font-mono">UPLOADTHING_TOKEN</code> en <code className="font-mono">.env.local</code>.
          Créala en{' '}
          <a href="https://uploadthing.com/dashboard" className="underline" target="_blank" rel="noreferrer">
            uploadthing.com
          </a>{' '}
          (API Keys), reinicia <code className="font-mono">npm run dev</code> y vuelve a intentar.
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={ORG_LOGO.acceptMime.join(',')}
        className="hidden"
        disabled={disabled || uploading || !uploadConfigured || hasLogo}
        onChange={(e) => void onFileChange(e)}
      />

      <div className="mt-3 flex items-start gap-5">
        <div className="flex h-14 min-w-[200px] max-w-[280px] shrink-0 items-center justify-center rounded-lg border border-[#E8EAEF] bg-[#FAFBFC] px-3 dark:border-[#2A2F3F] dark:bg-[#151828]">
          {hasLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentLogoUrl!}
              alt=""
              className="max-h-12 w-auto max-w-full object-contain"
            />
          ) : (
            <span className="text-[11px] text-[#9CA3AF] dark:text-[#6B7280]">Sin logo</span>
          )}
        </div>

        <div className="flex min-h-14 flex-col justify-center gap-2">
          {!hasLogo && uploadConfigured ? (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#4B5563] transition-colors hover:bg-[#F8F9FB] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
            >
              {uploading ? 'Subiendo…' : 'Elegir imagen'}
            </button>
          ) : null}

          {hasLogo ? (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => {
                setError(null)
                onRemoved()
              }}
              className="rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#4B5563] transition-colors hover:bg-[#F8F9FB] disabled:opacity-50 dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#9CA3AF] dark:hover:bg-[#252936]"
            >
              Quitar logo
            </button>
          ) : null}

        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
    </div>
  )
}
