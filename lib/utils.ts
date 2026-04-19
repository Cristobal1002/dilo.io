/** Une clases condicionales (mismo patrón que `clsx` mínimo, sin dependencia). */
export function cn(...parts: (string | false | undefined | null)[]): string {
  return parts.filter(Boolean).join(' ')
}
