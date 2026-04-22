'use client'

import { useEffect, useState } from 'react'
import { UserPlusIcon, UserCircleIcon, ShieldCheckIcon, EnvelopeIcon } from '@heroicons/react/24/outline'

type Member = {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: string
}

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === 'owner'
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
        isOwner
          ? 'bg-[#EDE9FE] text-[#6D28D9] dark:bg-[#2D1F6E] dark:text-[#C4B5FD]'
          : 'bg-[#F3F4F6] text-[#6B7280] dark:bg-[#252936] dark:text-[#9CA3AF]'
      }`}
    >
      {isOwner && <ShieldCheckIcon className="h-2.5 w-2.5" />}
      {isOwner ? 'Owner' : 'Miembro'}
    </span>
  )
}

function MemberRow({ member }: { member: Member }) {
  const initials = (member.name ?? member.email)
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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
      <span className="shrink-0 text-[11px] text-[#9CA3AF] dark:text-[#6B7280] hidden sm:block">
        {new Date(member.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
      </span>
    </div>
  )
}

function SkeletonRows() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <div className="h-9 w-9 rounded-full bg-[#F3F4F6] dark:bg-[#252936]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-[#F3F4F6] dark:bg-[#252936]" />
            <div className="h-2.5 w-48 rounded bg-[#F3F4F6] dark:bg-[#252936]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  useEffect(() => {
    fetch('/api/settings/team')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setMembers(res.data.members)
        else setError('No se pudieron cargar los miembros.')
      })
      .catch(() => setError('No se pudieron cargar los miembros.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-lg font-semibold text-[#111827] dark:text-[#F9FAFB]">Equipo</h1>
        <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA3AF]">
          Personas con acceso a tu organización en Dilo.
        </p>
      </div>

      {/* Members list */}
      <div className="rounded-xl border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#1A1D29] p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-[#6B7280] mb-4">
          Miembros actuales
        </p>

        {loading ? (
          <SkeletonRows />
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
              <MemberRow key={m.id} member={m} />
            ))}
          </div>
        )}
      </div>

      {/* Invite (coming soon) */}
      <div className="rounded-xl border border-dashed border-[#D1D5DB] bg-[#FAFAFA] dark:border-[#374151] dark:bg-[#1A1D29] p-6">
        <div className="flex items-center gap-2 mb-1">
          <UserPlusIcon className="h-4 w-4 text-[#7C3AED]" />
          <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">Invitar al equipo</p>
          <span className="rounded-full bg-[#7C3AED]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#7C3AED]">
            Próximamente
          </span>
        </div>
        <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mb-4">
          Pronto podrás invitar personas por correo para que colaboren en tus flows.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <EnvelopeIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              type="email"
              disabled
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="correo@empresa.com"
              className="
                w-full rounded-lg border border-[#E5E7EB] bg-white dark:border-[#2A2F3F] dark:bg-[#252936]
                pl-9 pr-4 py-2.5 text-sm text-[#111827] dark:text-[#F9FAFB]
                placeholder:text-[#9CA3AF] opacity-50 cursor-not-allowed
              "
            />
          </div>
          <button
            type="button"
            disabled
            className="
              flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-4 py-2.5 text-sm font-medium text-white
              opacity-40 cursor-not-allowed shrink-0
            "
          >
            <UserPlusIcon className="h-4 w-4" />
            Invitar
          </button>
        </div>
        <p className="mt-3 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          Por ahora, escríbenos a{' '}
          <a href="mailto:hola@getdilo.io" className="text-[#7C3AED] hover:underline">
            hola@getdilo.io
          </a>{' '}
          y te ayudamos a añadir tu equipo.
        </p>
      </div>
    </div>
  )
}
