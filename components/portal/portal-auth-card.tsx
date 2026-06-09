'use client'

import Link from 'next/link'
import { usePortalTheme } from '@/components/portal/portal-theme-context'
import {
  getLandingTheme,
  LANDING_PRIMARY,
  LANDING_SECONDARY,
  type LandingThemeTokens,
} from '@/lib/landing-theme'

const P = LANDING_PRIMARY
const S = LANDING_SECONDARY

type InvitePreview = {
  email: string
  clientName: string
  providerName: string
}

export function PortalAuthCard({
  preview,
  step,
  email,
  code,
  msg,
  err,
  busy,
  onEmailChange,
  onCodeChange,
  onSendCode,
  onVerify,
  onChangeEmail,
}: {
  preview: InvitePreview | null
  step: 'email' | 'code'
  email: string
  code: string
  msg: string | null
  err: string | null
  busy: boolean
  onEmailChange: (v: string) => void
  onCodeChange: (v: string) => void
  onSendCode: () => void
  onVerify: () => void
  onChangeEmail: () => void
}) {
  const { isDark } = usePortalTheme()
  const t = getLandingTheme(isDark, P, S)

  return (
    <div
      style={{
        background: t.cardBg,
        border: `1px solid ${t.border}`,
        borderRadius: 24,
        padding: 32,
        boxShadow: isDark
          ? '0 24px 60px rgba(0,0,0,.35)'
          : '0 24px 60px rgba(124,58,237,.08)',
      }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 800,
          margin: '0 0 6px',
          color: t.headingColor,
          textAlign: 'center',
        }}
      >
        Entrar al portal
      </h2>
      {preview ? (
        <p style={{ textAlign: 'center', fontSize: 14, color: t.textSub, margin: '0 0 24px' }}>
          <strong style={{ color: t.text }}>{preview.clientName}</strong>
          <span style={{ color: t.textMuted }}> · </span>
          {preview.providerName}
        </p>
      ) : (
        <p style={{ textAlign: 'center', fontSize: 14, color: t.textSub, margin: '0 0 24px' }}>
          Correo de acceso + código de 6 dígitos. Sin contraseña.
        </p>
      )}

      {msg ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 12,
            background: t.formGood,
            border: `1px solid ${t.formGoodBorder}`,
            fontSize: 13,
            color: t.textSub,
            textAlign: 'center',
          }}
        >
          {msg}
        </div>
      ) : null}

      {err ? (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 14px',
            borderRadius: 12,
            background: t.formBad,
            border: `1px solid ${t.formBadBorder}`,
            fontSize: 13,
            color: t.formBadText,
            textAlign: 'center',
          }}
        >
          {err}
        </div>
      ) : null}

      {step === 'email' ? (
        <EmailStep
          t={t}
          email={email}
          busy={busy}
          onEmailChange={onEmailChange}
          onSendCode={onSendCode}
        />
      ) : (
        <CodeStep
          t={t}
          email={email}
          code={code}
          busy={busy}
          onCodeChange={onCodeChange}
          onVerify={onVerify}
          onSendCode={onSendCode}
          onChangeEmail={onChangeEmail}
        />
      )}

      <p
        style={{
          marginTop: 20,
          textAlign: 'center',
          fontSize: 12,
          color: t.textMuted,
          lineHeight: 1.5,
        }}
      >
        ¿Operas flows en Dilo?{' '}
        <Link
          href="https://getdilo.io/sign-up"
          style={{ color: P, fontWeight: 600, textDecoration: 'none' }}
        >
          Regístrate en getdilo.io
        </Link>{' '}
        — cuenta aparte del portal.
      </p>
    </div>
  )
}

function inputStyle(t: LandingThemeTokens): React.CSSProperties {
  return {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 12,
    border: `1px solid ${t.border}`,
    background: t.inputBg,
    color: t.text,
    padding: '12px 14px',
    fontSize: 15,
    outline: 'none',
    transition: 'border-color .2s',
  }
}

function primaryBtn(busy: boolean): React.CSSProperties {
  return {
    width: '100%',
    borderRadius: 14,
    border: 'none',
    background: P,
    color: '#fff',
    padding: '14px 20px',
    fontSize: 15,
    fontWeight: 700,
    cursor: busy ? 'wait' : 'pointer',
    opacity: busy ? 0.7 : 1,
    boxShadow: `0 4px 16px ${P}45`,
    transition: 'opacity .15s, transform .15s',
  }
}

function EmailStep({
  t,
  email,
  busy,
  onEmailChange,
  onSendCode,
}: {
  t: LandingThemeTokens
  email: string
  busy: boolean
  onEmailChange: (v: string) => void
  onSendCode: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: t.textLabel }}>
        Correo de acceso
      </label>
      <input
        type="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        placeholder="gerente@empresa.com"
        style={inputStyle(t)}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = P
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = t.border
        }}
      />
      <button
        type="button"
        disabled={busy || !email.trim()}
        onClick={onSendCode}
        style={{
          ...primaryBtn(busy),
          opacity: busy || !email.trim() ? 0.5 : 1,
        }}
      >
        {busy ? 'Enviando…' : 'Enviar código'}
      </button>
    </div>
  )
}

function CodeStep({
  t,
  email,
  code,
  busy,
  onCodeChange,
  onVerify,
  onSendCode,
  onChangeEmail,
}: {
  t: LandingThemeTokens
  email: string
  code: string
  busy: boolean
  onCodeChange: (v: string) => void
  onVerify: () => void
  onSendCode: () => void
  onChangeEmail: () => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ textAlign: 'center', fontSize: 13, color: t.textSub, margin: 0 }}>
        Código enviado a{' '}
        <strong style={{ color: t.text }}>{email}</strong>
      </p>
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        style={{
          ...inputStyle(t),
          textAlign: 'center',
          fontSize: 28,
          letterSpacing: '0.35em',
          fontWeight: 700,
          padding: '16px 14px',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = S
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = t.border
        }}
      />
      <button
        type="button"
        disabled={busy || code.length !== 6}
        onClick={onVerify}
        style={{
          ...primaryBtn(busy),
          opacity: busy || code.length !== 6 ? 0.5 : 1,
        }}
      >
        {busy ? 'Verificando…' : 'Entrar al portal'}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={onSendCode}
        style={{
          background: 'none',
          border: 'none',
          color: P,
          fontSize: 14,
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          padding: 8,
        }}
      >
        Reenviar código
      </button>
      <button
        type="button"
        onClick={onChangeEmail}
        style={{
          background: 'none',
          border: 'none',
          color: t.textMuted,
          fontSize: 12,
          cursor: 'pointer',
          padding: 4,
        }}
      >
        Cambiar correo
      </button>
    </div>
  )
}
