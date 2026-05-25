'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  UserPlusIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'

type Member = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

type Invitation = {
  id: string
  email: string
  role: string
  createdAt: number
}

type TeamLimits = {
  members: number
  used: number
  membersCount: number
  pendingInvites: number
}

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === 'owner'
  const isAdmin = role === 'admin'
  const label = isOwner ? 'Owner' : isAdmin ? 'Admin' : 'Miembro'
  const elevated = isOwner || isAdmin
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        elevated
          ? 'bg-[#EDE9FE] text-[#6D28D9] dark:bg-[#2D1F6E] dark:text-[#C4B5FD]'
          : 'bg-[#F3F4F6] text-[#6B7280] dark:bg-[#252936] dark:text-[#9CA3AF]'
      }`}
    >
      {elevated && <ShieldCheckIcon className="h-2.5 w-2.5" />}
      {label}
    </span>
  )
}

function MemberRow({
  member,
  canManage,
  onRemove,
  removing,
}: {
  member: Member
  canManage: boolean
  onRemove: (id: string) => void
  removing: string | null
}) {
  const initials = (member.name ?? member.email)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const removable = canManage && member.role !== 'owner'

  return (
    <div className="flex items-center gap-3 py-3 [&+&]:border-t [&+&]:border-[#F3F4F6] dark:[&+&]:border-[#252936]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-sm font-semibold">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB] truncate">
            {member.name ?? member.email}
          </span>
          <RoleBadge role={member.role} />
        </div>
        {member.name && (
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] truncate">{member.email}</p>
        )}
      </div>
      {removable ? (
        <button
          type="button"
          disabled={removing === member.id}
          onClick={() => onRemove(member.id)}
          className="shrink-0 rounded-lg p-2 text-[#9CA3AF] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 disabled:opacity-50"
          title="Quitar del equipo"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      ) : (
        <span className="shrink-0 text-[11px] text-[#9CA3AF] dark:text-[#6B7280] hidden sm:block">
          {new Date(member.createdAt).toLocaleDateString('es', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      )}
    </div>
  )
}

export function TeamPanel() {
  const [members, setMembers] = useState<Member[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [limits, setLimits] = useState<TeamLimits | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('member')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState('')
  const [inviteSuccess, setInviteSuccess] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const canManage = currentUserRole === 'owner'
  const atLimit = limits !== null && limits.members !== -1 && limits.used >= limits.members

  const loadTeam = useCallback(() => {
    return fetch('/api/settings/team')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setMembers(res.data.members)
          setInvitations(res.data.invitations)
          setLimits(res.data.limits)
          setCurrentUserRole(res.data.currentUserRole)
          setError('')
        } else {
          setError(res.error?.message ?? 'No se pudieron cargar los miembros.')
        }
      })
      .catch(() => setError('No se pudieron cargar los miembros.'))
  }, [])

  useEffect(() => {
    loadTeam().finally(() => setLoading(false))
  }, [loadTeam])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!canManage || atLimit) return
    setInviting(true)
    setInviteError('')
    setInviteSuccess('')
    setInviteLink(null)
    try {
      const res = await fetch('/api/settings/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const json = await res.json()
      if (!json.success) {
        setInviteError(json.error?.message ?? 'No se pudo enviar la invitación.')
        return
      }
      setInviteEmail('')
      if (json.data.emailSent === false && json.data.inviteUrl) {
        setInviteLink(json.data.inviteUrl)
        setInviteSuccess(
          json.data.message ??
            'Invitación creada. Copia el enlace y envíaselo a esa persona (Resend en local no manda a otros correos).',
        )
      } else {
        setInviteSuccess(`Invitación enviada a ${json.data.invitation.email}`)
      }
      await loadTeam()
    } catch {
      setInviteError('Error de red al invitar.')
    } finally {
      setInviting(false)
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!confirm('¿Quitar a esta persona del workspace? Perderá acceso a flows y respuestas.')) return
    setRemoving(memberId)
    try {
      const res = await fetch(`/api/settings/team/members/${memberId}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) await loadTeam()
      else {
        const json = await res.json()
        alert(json.error?.message ?? 'No se pudo quitar el miembro.')
      }
    } finally {
      setRemoving(null)
    }
  }

  async function handleRevokeInvite(invitationId: string) {
    setRemoving(invitationId)
    try {
      const res = await fetch(`/api/settings/team/invitations/${invitationId}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) await loadTeam()
    } finally {
      setRemoving(null)
    }
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">
        Personas con acceso a tu organización en Dilo.
        {limits && limits.members !== -1 && (
          <span className="block mt-1 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
            {limits.used} / {limits.members} plazas usadas
            {limits.pendingInvites > 0 && ` (${limits.pendingInvites} invitación pendiente)`}
          </span>
        )}
      </p>

      <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] mb-4">
          Miembros actuales
        </p>

        {loading ? (
          <p className="text-sm text-[#6B7280]">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-[#EF4444]">{error}</p>
        ) : members.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <UserCircleIcon className="h-10 w-10 text-[#D1D5DB] dark:text-[#374151] mb-3" />
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF]">No hay miembros aún.</p>
          </div>
        ) : (
          <div>
            {members.map((m) => (
              <MemberRow
                key={m.id}
                member={m}
                canManage={canManage}
                onRemove={handleRemoveMember}
                removing={removing}
              />
            ))}
          </div>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] mb-4">
            Invitaciones pendientes
          </p>
          <ul className="space-y-2">
            {invitations.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-[#F8F9FB] dark:bg-[#252936] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[#111827] dark:text-[#F9FAFB] truncate">
                    {inv.email}
                  </p>
                  <RoleBadge role={inv.role} />
                </div>
                {canManage && (
                  <button
                    type="button"
                    disabled={removing === inv.id}
                    onClick={() => handleRevokeInvite(inv.id)}
                    className="shrink-0 rounded-lg p-2 text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F9FAFB]"
                    title="Cancelar invitación"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {canManage ? (
        <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] p-6">
          <div className="flex items-center gap-2 mb-1">
            <UserPlusIcon className="h-4 w-4 text-[#7C3AED]" />
            <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Invitar al equipo</p>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
            Admin: integraciones y configuración del workspace. Miembro: flows y respuestas.
          </p>

          <form onSubmit={handleInvite} className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="email"
                  required
                  disabled={atLimit || inviting}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="correo@empresa.com"
                  className="w-full rounded-lg border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#252936] pl-9 pr-4 py-2.5 text-sm text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] disabled:opacity-50"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                disabled={atLimit || inviting}
                className="rounded-lg border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#252936] px-3 py-2.5 text-sm text-[#111827] dark:text-[#F9FAFB] disabled:opacity-50"
              >
                <option value="member">Miembro</option>
                <option value="admin">Admin</option>
              </select>
              <button
                type="submit"
                disabled={atLimit || inviting || !inviteEmail.trim()}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#6D28D9] disabled:opacity-40 shrink-0"
              >
                <UserPlusIcon className="h-4 w-4" />
                {inviting ? 'Enviando…' : 'Invitar'}
              </button>
            </div>
            {atLimit && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Has alcanzado el límite de miembros de tu plan. Mejora el plan en la pestaña Plan y uso.
              </p>
            )}
            {inviteError && <p className="text-xs text-red-600 dark:text-red-400">{inviteError}</p>}
            {inviteSuccess && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">{inviteSuccess}</p>
            )}
            {inviteLink ? (
              <div className="flex flex-col gap-2 rounded-lg border border-[#E5E7EB] bg-[#F8F9FB] p-3 dark:border-[#2A2F3F] dark:bg-[#252936]">
                <p className="text-[11px] font-medium text-[#4B5563] dark:text-[#9CA3AF]">Enlace de invitación</p>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="min-w-0 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-2.5 py-2 font-mono text-[11px] text-[#374151] dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#D1D5DB]"
                  />
                  <button
                    type="button"
                    onClick={() => void navigator.clipboard.writeText(inviteLink)}
                    className="shrink-0 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs font-medium text-[#4B5563] hover:bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] dark:text-[#9CA3AF]"
                  >
                    Copiar enlace
                  </button>
                </div>
              </div>
            ) : null}
          </form>
        </div>
      ) : (
        <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          Solo el owner del workspace puede invitar o quitar miembros.
        </p>
      )}
    </div>
  )
}
