import { z } from 'zod'
import {
  CLIENT_STATUSES,
  CLIENT_TAX_ID_TYPES,
  normalizeCountryCode,
  normalizeEmail,
  normalizeOptionalText,
  normalizeWebsite,
} from '@/lib/client-fields'

const optionalText = (max: number) =>
  z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : normalizeOptionalText(v, max)))

export const ClientBodySchema = z.object({
  name: z.string().trim().min(2).max(200),
  legalName: optionalText(200),
  externalId: optionalText(120),
  taxIdType: z.enum(CLIENT_TAX_ID_TYPES).nullable().optional(),
  taxId: optionalText(80),
  email: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : normalizeEmail(v))),
  phone: optionalText(80),
  website: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : normalizeWebsite(v))),
  addressLine1: optionalText(200),
  addressLine2: optionalText(200),
  city: optionalText(120),
  stateRegion: optionalText(120),
  postalCode: optionalText(32),
  countryCode: z
    .union([z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : normalizeCountryCode(v))),
  notes: optionalText(4000),
  status: z.enum(CLIENT_STATUSES).optional(),
  embedAllowedDomains: z.array(z.string().max(200)).max(20).optional(),
})

export const ClientPatchSchema = ClientBodySchema.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'Debe enviar al menos un campo',
})
