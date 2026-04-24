import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js/min'

export { isValidPhoneNumber }

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
