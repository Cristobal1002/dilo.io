'use client'

import { useMemo, useState } from 'react'
import { DiloPhoneField, isValidPhoneNumber } from '@/components/dilo-phone-field'
import { DiloModal } from '@/components/ui/modal'
import {
  CLIENT_TAX_ID_LABELS,
  type ClientTaxIdType,
} from '@/lib/client-fields'
import {
  CLIENT_COUNTRIES,
  type ClientKind,
  countryHasLocationSelects,
  getCitiesForRegion,
  getCountryIso2,
  getRegionsForCountry,
  getTaxIdTypesForClient,
  regionLabelForCountry,
  resolveStoredCity,
  resolveStoredRegion,
} from '@/lib/client-locations'
import { btnPrimarySm, btnSecondary, inputField, selectField } from '@/lib/dashboard-ui'
import { pillTabActiveClass, pillTabBaseClass, pillTabInactiveClass } from '@/lib/pill-tab-styles'
import { cn } from '@/lib/utils'

export type ClientFormValues = {
  kind: ClientKind
  name: string
  legalName: string
  externalId: string
  taxIdType: ClientTaxIdType | ''
  taxId: string
  email: string
  phone: string
  website: string
  addressLine1: string
  city: string
  stateRegion: string
  countryCode: string
  notes: string
  status: 'active' | 'inactive'
}

export const emptyClientForm = (): ClientFormValues => ({
  kind: 'company',
  name: '',
  legalName: '',
  externalId: '',
  taxIdType: '',
  taxId: '',
  email: '',
  phone: '',
  website: '',
  addressLine1: '',
  city: '',
  stateRegion: '',
  countryCode: 'CO',
  notes: '',
  status: 'active',
})

function FormField({
  label,
  required,
  optional,
  hint,
  children,
}: {
  label: string
  required?: boolean
  optional?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-[#374151] dark:text-[#D1D5DB]">
        {label}
        {required ? <span className="text-[#9C77F5]"> *</span> : null}
        {optional ? <span className="font-normal text-[#9CA3AF]"> (opcional)</span> : null}
      </p>
      {hint ? <p className="mb-1.5 text-[11px] leading-relaxed text-[#9CA3AF]">{hint}</p> : null}
      {children}
    </div>
  )
}

function FormSection({
  title,
  description,
  defaultOpen,
  children,
}: {
  title: string
  description?: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details
      className="rounded-xl border border-[#E8EAEF] bg-[#FAFBFC]/80 open:bg-white dark:border-[#2A2F3F] dark:bg-[#161821]/50 dark:open:bg-[#1A1D29]"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-foreground">{title}</p>
            {description ? (
              <p className="mt-0.5 text-[11px] text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <span className="text-[#94A3B8]" aria-hidden>
            ▾
          </span>
        </div>
      </summary>
      <div className="space-y-4 border-t border-[#E8EAEF] px-4 pb-4 pt-3 dark:border-[#2A2F3F]">
        {children}
      </div>
    </details>
  )
}

function taxLabel(type: ClientTaxIdType, kind: ClientKind): string {
  if (type === 'generic' && kind === 'person') return 'Cédula / documento personal'
  return CLIENT_TAX_ID_LABELS[type]
}

type Props = {
  open: boolean
  editing: boolean
  saving: boolean
  form: ClientFormValues
  onChange: (patch: Partial<ClientFormValues>) => void
  onClose: () => void
  onSave: () => void
}

export function ClientFormModal({ open, editing, saving, form, onChange, onClose, onSave }: Props) {
  const [phoneInvalid, setPhoneInvalid] = useState(false)

  const regions = useMemo(() => {
    const base = getRegionsForCountry(form.countryCode)
    if (form.stateRegion && !base.some((o) => o.value === form.stateRegion)) {
      return [{ value: form.stateRegion, label: form.stateRegion }, ...base]
    }
    return base
  }, [form.countryCode, form.stateRegion])

  const cities = useMemo(() => {
    const base = getCitiesForRegion(form.countryCode, form.stateRegion)
    if (form.city && !base.some((o) => o.value === form.city)) {
      return [{ value: form.city, label: form.city }, ...base]
    }
    return base
  }, [form.countryCode, form.stateRegion, form.city])

  const taxTypes = useMemo(
    () => getTaxIdTypesForClient(form.countryCode, form.kind),
    [form.countryCode, form.kind],
  )

  const showLocation = countryHasLocationSelects(form.countryCode)
  const regionLabel = regionLabelForCountry(form.countryCode)

  const nameOk = form.name.trim().length >= 2
  const phoneOk = !form.phone.trim() || isValidPhoneNumber(form.phone)
  const canSave = nameOk && phoneOk && !saving

  return (
    <DiloModal
      isOpen={open}
      onClose={onClose}
      title={editing ? 'Editar cliente' : 'Nuevo cliente'}
      size="xl"
      footer={
        <>
          <p className="mr-auto hidden text-[11px] text-[#9CA3AF] sm:block">
            <span className="text-[#9C77F5]">*</span> obligatorio
          </p>
          <button type="button" onClick={onClose} className={btnSecondary}>
            Cancelar
          </button>
          <button type="button" disabled={!canSave} onClick={onSave} className={btnPrimarySm}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
        Empresa o persona natural. Solo el nombre es obligatorio; el resto ayuda en soporte e informes.
      </p>

      <div className="space-y-3">
        <FormSection title="Identificación" description="Lo mínimo para reconocer al cliente" defaultOpen>
          <div className="flex flex-wrap gap-2">
            {(
              [
                { id: 'company' as const, label: 'Empresa' },
                { id: 'person' as const, label: 'Persona natural' },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onChange({ kind: o.id, taxIdType: '' })}
                className={cn(
                  pillTabBaseClass,
                  form.kind === o.id ? pillTabActiveClass : pillTabInactiveClass,
                )}
              >
                {o.label}
              </button>
            ))}
          </div>

          <FormField
            label={form.kind === 'person' ? 'Nombre completo' : 'Nombre comercial'}
            required
          >
            <input
              value={form.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder={form.kind === 'person' ? 'Ej. María García' : 'Ej. Acme S.A.S.'}
              className={inputField}
              autoFocus
            />
          </FormField>

          {form.kind === 'company' ? (
            <FormField label="Razón social" optional>
              <input
                value={form.legalName}
                onChange={(e) => onChange({ legalName: e.target.value })}
                placeholder="Si difiere del nombre comercial"
                className={inputField}
              />
            </FormField>
          ) : null}

          <FormField
            label="País"
            required
            hint="Lista fija para evitar errores de escritura."
          >
            <select
              value={form.countryCode}
              onChange={(e) => {
                const code = e.target.value
                onChange({
                  countryCode: code,
                  stateRegion: '',
                  city: '',
                  taxIdType: '',
                })
              }}
              className={selectField}
            >
              {CLIENT_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField
            label="ID en tu sistema"
            optional
            hint="Código que ya usas en tu plataforma (embed multi-tenant)."
          >
            <input
              value={form.externalId}
              onChange={(e) => onChange({ externalId: e.target.value })}
              className={cn(inputField, 'font-mono text-[13px]')}
              placeholder="tenant_123"
            />
          </FormField>
        </FormSection>

        <FormSection title="Contacto" description="Email y teléfono con prefijo internacional">
          <FormField label="Email" optional>
            <input
              type="email"
              value={form.email}
              onChange={(e) => onChange({ email: e.target.value })}
              className={inputField}
              placeholder="contacto@empresa.com"
            />
          </FormField>

          <FormField label="Teléfono" optional>
            <DiloPhoneField
              key={form.countryCode}
              variant="dashboard"
              value={form.phone}
              defaultCountry={getCountryIso2(form.countryCode)}
              onChange={(v) => {
                onChange({ phone: v })
                setPhoneInvalid(Boolean(v.trim()) && !isValidPhoneNumber(v))
              }}
              placeholder="Número con indicativo"
              aria-invalid={phoneInvalid}
            />
            {phoneInvalid ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Introduce un número válido con prefijo internacional.
              </p>
            ) : null}
          </FormField>
        </FormSection>

        <FormSection title="Documento fiscal" description="Opcional — según país y tipo de cliente">
          <FormField label="Tipo de documento" optional>
            <select
              value={form.taxIdType}
              onChange={(e) => onChange({ taxIdType: e.target.value as ClientTaxIdType | '' })}
              className={selectField}
            >
              <option value="">— Sin documento —</option>
              {taxTypes.map((t) => (
                <option key={t} value={t}>
                  {taxLabel(t, form.kind)}
                </option>
              ))}
            </select>
          </FormField>

          {form.taxIdType ? (
            <FormField label="Número de documento" optional>
              <input
                value={form.taxId}
                onChange={(e) => onChange({ taxId: e.target.value })}
                className={cn(inputField, 'font-mono text-[13px]')}
              />
            </FormField>
          ) : null}
        </FormSection>

        {showLocation ? (
          <FormSection title="Ubicación" description="Departamento y ciudad según el país">
            <FormField label={regionLabel} optional>
              <select
                value={form.stateRegion}
                onChange={(e) => onChange({ stateRegion: e.target.value, city: '' })}
                className={selectField}
              >
                <option value="">— Selecciona —</option>
                {regions.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Ciudad" optional>
              <select
                value={form.city}
                onChange={(e) => onChange({ city: e.target.value })}
                disabled={!form.stateRegion}
                className={cn(selectField, !form.stateRegion && 'opacity-50')}
              >
                <option value="">
                  {form.stateRegion ? '— Selecciona —' : 'Elige primero el departamento'}
                </option>
                {cities.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Dirección" optional>
              <input
                value={form.addressLine1}
                onChange={(e) => onChange({ addressLine1: e.target.value })}
                className={inputField}
                placeholder="Calle, número, barrio"
              />
            </FormField>
          </FormSection>
        ) : null}

        <FormSection title="Más datos" description="Sitio web, notas y estado">
          <FormField label="Sitio web" optional>
            <input
              value={form.website}
              onChange={(e) => onChange({ website: e.target.value })}
              className={inputField}
              placeholder="https://…"
            />
          </FormField>

          {editing ? (
            <FormField label="Estado en Dilo" optional>
              <select
                value={form.status}
                onChange={(e) => onChange({ status: e.target.value as 'active' | 'inactive' })}
                className={selectField}
              >
                <option value="active">Activo</option>
                <option value="inactive">Inactivo</option>
              </select>
            </FormField>
          ) : null}

          <FormField label="Notas internas" optional>
            <textarea
              value={form.notes}
              onChange={(e) => onChange({ notes: e.target.value })}
              rows={3}
              className={cn(inputField, 'resize-y')}
              placeholder="Solo visible para tu equipo"
            />
          </FormField>
        </FormSection>
      </div>
    </DiloModal>
  )
}

const COMPANY_TAX_TYPES: ClientTaxIdType[] = [
  'nit_co',
  'ruc_pe',
  'rfc_mx',
  'rut_cl',
  'cuit_ar',
  'ruc_ec',
  'rif_ve',
  'rtn_hn',
  'cedula_juridica_cr',
]

export function clientRowToForm(c: {
  name: string
  legalName: string | null
  externalId: string | null
  taxIdType: string | null
  taxId: string | null
  email: string | null
  phone: string | null
  website: string | null
  addressLine1: string | null
  city: string | null
  stateRegion: string | null
  countryCode: string | null
  notes: string | null
  status: string
}): ClientFormValues {
  const countryCode = c.countryCode?.toUpperCase() || 'CO'
  const taxType = c.taxIdType as ClientTaxIdType | null
  const kind: ClientKind =
    (taxType && COMPANY_TAX_TYPES.includes(taxType)) ||
    (c.legalName?.trim() && c.legalName.trim() !== c.name)
      ? 'company'
      : 'person'

  return {
    kind,
    name: c.name,
    legalName: c.legalName ?? '',
    externalId: c.externalId ?? '',
    taxIdType: (c.taxIdType as ClientTaxIdType) ?? '',
    taxId: c.taxId ?? '',
    email: c.email ?? '',
    phone: c.phone ?? '',
    website: c.website ?? '',
    addressLine1: c.addressLine1 ?? '',
    city: resolveStoredCity(countryCode, c.stateRegion, c.city) || c.city || '',
    stateRegion: resolveStoredRegion(countryCode, c.stateRegion) || c.stateRegion || '',
    countryCode,
    notes: c.notes ?? '',
    status: c.status === 'inactive' ? 'inactive' : 'active',
  }
}
