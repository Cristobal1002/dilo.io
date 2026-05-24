export type ResendIntegrationPayload = {
  apiKey: string
  fromEmail?: string | null
}

export type WhatsAppIntegrationPayload = {
  accessToken: string
  tokenType?: string | null
}
