'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'
import { cn } from '@/lib/utils'

export type WhatsAppIntegrationStatus = {
  connected: boolean
  sendReady?: boolean
  metaConfigured?: boolean
  displayPhone: string | null
  wabaId: string | null
  phoneNumberId: string | null
  status?: string | null
  lastError?: string | null
}

type WhatsAppIntegrationFormProps = {
  embedded?: boolean
  onStatusChange?: (payload: {
    status: WhatsAppIntegrationStatus | null
    loadComplete: boolean
    loadError: boolean
  }) => void
}

declare global {
  interface Window {
    FB?: {
      init: (opts: Record<string, unknown>) => void
      login: (cb: (response: unknown) => void, opts: Record<string, unknown>) => void
    }
    fbAsyncInit?: () => void
  }
}

type EmbeddedSignupMessage = {
  type?: string
  event?: string
  data?: {
    waba_id?: string
    phone_number_id?: string
    current_phone_number?: string
    phone_number?: string
  }
}

export function WhatsAppIntegrationForm({ embedded = false, onStatusChange }: WhatsAppIntegrationFormProps) {
  const [status, setStatus] = useState<WhatsAppIntegrationStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const signupRef = useRef<{ wabaId?: string; phoneNumberId?: string; displayPhone?: string }>({})

  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
  const configId = process.env.NEXT_PUBLIC_FACEBOOK_CONFIG_ID

  const load = useCallback(async () => {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/integrations/whatsapp')
      const r = await readApiResult<WhatsAppIntegrationStatus>(res)
      if (r.ok) {
        setLoadError(false)
        setStatus(r.data)
      } else {
        setLoadError(true)
        setMsg(r.message)
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!loading) {
      onStatusChange?.({ status, loadComplete: true, loadError })
    }
  }, [status, loading, loadError, onStatusChange])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') return
      let payload: EmbeddedSignupMessage | null = null
      try {
        const raw = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        payload = raw as EmbeddedSignupMessage
      } catch {
        return
      }
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP' && payload?.event !== 'FINISH') return
      const d = payload.data
      if (d?.waba_id) signupRef.current.wabaId = d.waba_id
      if (d?.phone_number_id) signupRef.current.phoneNumberId = d.phone_number_id
      const phone = d?.current_phone_number ?? d?.phone_number
      if (phone) signupRef.current.displayPhone = phone
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!appId || typeof window === 'undefined') return
    if (document.getElementById('facebook-jssdk')) return

    window.fbAsyncInit = function () {
      window.FB?.init({
        appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      })
    }

    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    document.body.appendChild(script)
  }, [appId])

  const connect = () => {
    if (!appId || !configId) {
      setMsg('Faltan NEXT_PUBLIC_FACEBOOK_APP_ID o NEXT_PUBLIC_FACEBOOK_CONFIG_ID en el entorno.')
      return
    }
    if (!status?.metaConfigured) {
      setMsg('El servidor no tiene configuradas las variables de Meta (FACEBOOK_APP_ID, etc.).')
      return
    }
    if (!window.FB) {
      setMsg('Cargando SDK de Meta… Intenta de nuevo en unos segundos.')
      return
    }

    signupRef.current = {}
    setBusy(true)
    setMsg(null)

    window.FB.login(
      (response: unknown) => {
        void (async () => {
          try {
            const r = response as { authResponse?: { code?: string } }
            const code = r.authResponse?.code
            const { wabaId, phoneNumberId, displayPhone } = signupRef.current
            if (!code) {
              setMsg('Conexión cancelada o sin código de autorización.')
              return
            }
            if (!wabaId || !phoneNumberId) {
              setMsg(
                'No se recibieron WABA o número desde Meta. Completa el flujo en la ventana y vuelve a intentar.',
              )
              return
            }
            const res = await fetch('/api/settings/integrations/whatsapp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, wabaId, phoneNumberId, displayPhone: displayPhone ?? null }),
            })
            const result = await readApiResult<WhatsAppIntegrationStatus>(res)
            if (!result.ok) {
              setMsg(result.message)
              return
            }
            setStatus(result.data)
            setMsg('WhatsApp conectado correctamente.')
            await load()
          } finally {
            setBusy(false)
          }
        })()
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { sessionInfoVersion: 2 },
      },
    )
  }

  const doDisconnect = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/settings/integrations/whatsapp', { method: 'DELETE' })
      if (!res.ok) {
        const r = await readApiResult(res)
        setMsg(r.ok ? null : r.message)
        return
      }
      setConfirmDisconnect(false)
      await load()
      setMsg('WhatsApp desconectado.')
    } finally {
      setBusy(false)
    }
  }

  const shell = embedded
    ? ''
    : 'rounded-2xl border border-[#E8EAEF] bg-white p-5 dark:border-[#2A2F3F] dark:bg-[#1A1D29]'

  return (
    <div className={shell}>
      {!embedded ? (
        <h2 className="text-base font-bold text-[#1A1A1A] dark:text-[#F8F9FB]">WhatsApp Business</h2>
      ) : null}

      <p className={cn('text-sm leading-relaxed text-[#64748B] dark:text-[#94A3B8]', !embedded && 'mt-2')}>
        Necesitas Meta Business Manager, una cuenta WABA y un número exclusivo para la API. Al conectar, Dilo podrá
        enviar plantillas aprobadas cuando un visitante complete un flow (si lo activas en Conectores).
      </p>

      {loading ? (
        <p className="mt-4 text-sm text-[#64748B]">Comprobando estado…</p>
      ) : (
        <div className="mt-4 space-y-3">
          {status?.connected && status.sendReady ? (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Conectado{status.displayPhone ? `: ${status.displayPhone}` : ''}
            </p>
          ) : status?.connected ? (
            <p className="text-sm font-medium text-amber-700 dark:text-amber-300">Conectado con datos incompletos</p>
          ) : (
            <p className="text-sm text-[#64748B]">No conectado</p>
          )}

          {msg ? (
            <p className="text-sm text-[#64748B] dark:text-[#94A3B8]" role="status">
              {msg}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!status?.sendReady ? (
              <button
                type="button"
                disabled={busy}
                onClick={connect}
                className="rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1ebe57] disabled:opacity-60"
              >
                {busy ? 'Conectando…' : 'Conectar WhatsApp Business'}
              </button>
            ) : null}
            {status?.connected ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmDisconnect(true)}
                className="rounded-xl border border-[#E8EAEF] px-4 py-2 text-sm font-semibold text-[#64748B] hover:bg-[#F1F5F9] dark:border-[#2A2F3F] dark:hover:bg-[#252936]"
              >
                Desconectar
              </button>
            ) : null}
          </div>
        </div>
      )}

      {confirmDisconnect ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">¿Desconectar WhatsApp?</p>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-200">
            Los flows dejarán de poder enviar mensajes hasta que vuelvas a conectar.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void doDisconnect()}
              disabled={busy}
              className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Sí, desconectar
            </button>
            <button
              type="button"
              onClick={() => setConfirmDisconnect(false)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:text-amber-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
