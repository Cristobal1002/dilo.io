'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { readApiResult } from '@/lib/read-api-result'
import { PortalAuthCard } from '@/components/portal/portal-auth-card'
import { PortalMarketingShell } from '@/components/portal/portal-marketing-shell'

type InvitePreview = {
  email: string
  clientName: string
  providerName: string
}

export function PortalEntrarClient({
  initialEmail,
  inviteToken,
}: {
  initialEmail: string
  inviteToken: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>(initialEmail ? 'code' : 'email')
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [autoSent, setAutoSent] = useState(false)

  const loadInvite = useCallback(async () => {
    if (!inviteToken) return
    const res = await fetch(`/api/portal-invitations/${inviteToken}`)
    const r = await readApiResult<InvitePreview>(res)
    if (r.ok) {
      setPreview(r.data)
      setEmail(r.data.email)
      setStep('code')
    }
  }, [inviteToken])

  useEffect(() => {
    void loadInvite()
  }, [loadInvite])

  const sendCode = useCallback(async () => {
    setBusy(true)
    setErr(null)
    setMsg(null)
    try {
      const res = await fetch('/api/portal/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          invite: inviteToken || undefined,
        }),
      })
      const r = await readApiResult<{ message?: string }>(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setStep('code')
      setMsg(r.data.message ?? 'Código enviado. Revisa tu correo.')
    } finally {
      setBusy(false)
    }
  }, [email, inviteToken])

  useEffect(() => {
    if (autoSent || !email) return
    if (initialEmail || (inviteToken && preview)) {
      setAutoSent(true)
      void sendCode()
    }
  }, [autoSent, email, initialEmail, inviteToken, preview, sendCode])

  const verify = async () => {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/portal/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          invite: inviteToken || undefined,
        }),
      })
      const r = await readApiResult(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      router.replace('/portal')
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <PortalMarketingShell>
      <PortalAuthCard
        preview={preview}
        step={step}
        email={email}
        code={code}
        msg={msg}
        err={err}
        busy={busy}
        onEmailChange={setEmail}
        onCodeChange={setCode}
        onSendCode={() => void sendCode()}
        onVerify={() => void verify()}
        onChangeEmail={() => {
          setStep('email')
          setCode('')
          setErr(null)
          setMsg(null)
        }}
      />
    </PortalMarketingShell>
  )
}
