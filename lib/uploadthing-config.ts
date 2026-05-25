export function isUploadthingConfigured(): boolean {
  return Boolean(process.env.UPLOADTHING_TOKEN?.trim())
}
