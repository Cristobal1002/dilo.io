import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js/min'

export { isValidPhoneNumber }

/** Ejemplo legible por país (ISO2) para la ayuda bajo el campo. */
const PHONE_FORMAT_EXAMPLES: Record<string, string> = {
  co: '+57 300 123 4567',
  es: '+34 600 000 000',
  mx: '+52 55 1234 5678',
  ar: '+54 9 11 1234 5678',
  cl: '+56 9 1234 5678',
  pe: '+51 987 654 321',
  ec: '+593 99 123 4567',
  us: '+1 202 555 0123',
  ve: '+58 412 1234567',
  br: '+55 11 91234 5678',
  uy: '+598 94 123 456',
  bo: '+591 71234567',
  py: '+595 981 123456',
  cr: '+506 8888 8888',
  pa: '+507 6123 4567',
  gt: '+502 5123 4567',
  hn: '+504 9123 4567',
  ni: '+505 8123 4567',
  sv: '+503 7123 4567',
  do: '+1 809 555 0123',
  pr: '+1 787 555 0123',
}

export function phoneFormatExampleForIso2(iso2: string): string {
  const k = iso2.trim().toLowerCase()
  return PHONE_FORMAT_EXAMPLES[k] ?? 'código de país + número local'
}

/** Pistas tipo "Formato: +34 …" del template que chocan con el país seleccionado. */
export function looksLikePhoneDialFormatHint(hint: string): boolean {
  const t = hint.trim()
  return /^formato\s*:/i.test(t) && /\+\d/.test(t)
}

export function buildPhoneStepFooterHint(stepHint: string | null | undefined, activeIso2: string): string {
  const formatLine = `Formato: ${phoneFormatExampleForIso2(activeIso2)}`
  const raw = stepHint?.trim() ?? ''
  if (!raw) return formatLine
  if (looksLikePhoneDialFormatHint(raw)) return formatLine
  return `${raw} · ${formatLine}`
}

/** Formato legible internacional (p. ej. +57 300 123 4567). */
export function formatPhoneNumberIntl(value: string): string {
  const v = value?.trim()
  if (!v) return ''
  try {
    return parsePhoneNumber(v).formatInternational()
  } catch {
    return value
  }
}
