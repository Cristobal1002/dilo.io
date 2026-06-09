'use client'

import { useCallback, useEffect, useState } from 'react'
import { readApiResult } from '@/lib/read-api-result'
import {
  CLIENT_PORTAL_ROLE_LABEL,
  CLIENT_PORTAL_ROLES,
  type ClientPortalRole,
} from '@/lib/client-portal-roles'
import { alertError, alertSuccess, btnPrimarySm, btnSecondary, inputField, selectField } from '@/lib/dashboard-ui'
import { cn } from '@/lib/utils'

type Member = { id: string; email: string; name: string | null; role: string; createdAt: string }
type Invitation = { id: string; email: string; role: ClientPortalRole; createdAt: number }

export function ClientPortalPanel({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<ClientPortalRole>('manager')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`/api/clients/${clientId}/portal/members`)
    const r = await readApiResult<{ members: Member[]; invitations: Invitation[] }>(res)
    if (r.ok) {
      setMembers(r.data.members)
      setInvitations(r.data.invitations)
    }
  }, [clientId])

  useEffect(() => {
    void load()
  }, [load])

  const invite = async () => {
    setBusy(true)
    setErr(null)
    setMsg(null)
    setInviteLink(null)
    try {
      const res = await fetch(`/api/clients/${clientId}/portal/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      const r = await readApiResult<{ inviteUrl?: string; linkOnly?: boolean; message?: string }>(res)
      if (!r.ok) {
        setErr(r.message)
        return
      }
      setEmail('')
      setMsg(r.data.message ?? 'Invitación enviada.')
      if (r.data.inviteUrl) setInviteLink(r.data.inviteUrl)
      await load()
    } finally {
      setBusy(false)
    }
  }

  const removeMember = async (memberId: string) => {
    const res = await fetch(`/api/clients/${clientId}/portal/members?memberId=${memberId}`, {
      method: 'DELETE',
    })
    const r = await readApiResult(res)
    if (!r.ok) {
      setErr(r.message)
      return
    }
    await load()
  }

  const revokeInvite = async (invitationId: string) => {
    const res = await fetch(
      `/api/clients/${clientId}/portal/members?invitationId=${invitationId}`,
      { method: 'DELETE' },
    )
    const r = await readApiResult(res)
    if (!r.ok) {
      setErr(r.message)
      return
    }
    await load()
  }

  return (
    <div className="mt-6 border-t border-[#E8EAEF] pt-6 dark:border-[#2A2F3F]">
      <h3 className="text-sm font-semibold text-[#111827] dark:text-[#F8F9FB]">Portal de soporte</h3>
      <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8]">
        Invita gerentes o coordinadores de <strong>{clientName}</strong>. No entran a tu workspace de Dilo; solo ven
        casos de esta empresa en <code className="text-[11px]">/portal</code>.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="gerente@empresa.com"
            className={inputField}
          />
        </div>
        <div className="sm:w-44">
          <label className="mb-1 block text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">Rol</label>
          <select value={role} onChange={(e) => setRole(e.target.value as ClientPortalRole)} className={selectField}>
            {CLIENT_PORTAL_ROLES.map((r) => (
              <option key={r} value={r}>
                {CLIENT_PORTAL_ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <button type="button" disabled={busy || !email.trim()} onClick={() => void invite()} className={btnPrimarySm}>
          {busy ? 'Enviando…' : 'Invitar'}
        </button>
      </div>

      {msg ? <p className={cn('mt-3', alertSuccess)}>{msg}</p> : null}
      {err ? <p className={cn('mt-3', alertError)}>{err}</p> : null}
      {inviteLink ? (
        <p className="mt-2 break-all text-xs text-[#64748B]">
          Enlace:{' '}
          <a href={inviteLink} className="text-[#7C3AED] underline">
            {inviteLink}
          </a>
        </p>
      ) : null}

      {members.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Acceso activo</p>
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-[#E8EAEF] px-3 py-2 text-sm dark:border-[#2A2F3F]"
              >
                <div>
                  <p className="font-medium text-[#111827] dark:text-[#F8F9FB]">{m.email}</p>
                  <p className="text-xs text-[#64748B]">
                    {CLIENT_PORTAL_ROLE_LABEL[m.role as ClientPortalRole] ?? m.role}
                  </p>
                </div>
                <button type="button" onClick={() => void removeMember(m.id)} className={btnSecondary}>
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {invitations.length > 0 ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#94A3B8]">Pendientes</p>
          <ul className="space-y-2">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-sm dark:border-[#475569]"
              >
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-xs text-[#64748B]">
                    {CLIENT_PORTAL_ROLE_LABEL[inv.role]} · pendiente
                  </p>
                </div>
                <button type="button" onClick={() => void revokeInvite(inv.id)} className={btnSecondary}>
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
