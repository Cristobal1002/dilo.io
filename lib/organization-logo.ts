/** Logo horizontal del workspace (subida vía Uploadthing). */
export const ORG_LOGO = {
  /** Proporción ancho/alto recomendada (p. ej. 400×120). */
  minWidth: 200,
  minHeight: 40,
  maxWidth: 1200,
  maxHeight: 400,
  minAspectRatio: 2,
  maxAspectRatio: 6,
  maxFileBytes: 2 * 1024 * 1024,
  acceptMime: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] as const,
  hint: 'PNG, JPG, WebP o SVG. Recomendado: 400×120 px (horizontal, fondo transparente si aplica).',
} as const

export async function validateOrganizationLogoFile(file: File): Promise<string | null> {
  if (!ORG_LOGO.acceptMime.includes(file.type as (typeof ORG_LOGO.acceptMime)[number])) {
    return 'Formato no permitido. Usa PNG, JPG, WebP o SVG.'
  }
  if (file.size > ORG_LOGO.maxFileBytes) {
    return 'El archivo supera 2 MB.'
  }
  if (file.type === 'image/svg+xml') return null

  try {
    const bitmap = await createImageBitmap(file)
    const { width, height } = bitmap
    bitmap.close()
    if (width < ORG_LOGO.minWidth || height < ORG_LOGO.minHeight) {
      return `Mínimo ${ORG_LOGO.minWidth}×${ORG_LOGO.minHeight} px.`
    }
    if (width > ORG_LOGO.maxWidth || height > ORG_LOGO.maxHeight) {
      return `Máximo ${ORG_LOGO.maxWidth}×${ORG_LOGO.maxHeight} px.`
    }
    const ratio = width / height
    if (ratio < ORG_LOGO.minAspectRatio || ratio > ORG_LOGO.maxAspectRatio) {
      return 'Usa un logo horizontal (proporción entre 2:1 y 6:1).'
    }
    return null
  } catch {
    return 'No se pudo leer la imagen.'
  }
}
