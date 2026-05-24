export type MetaEnv = {
  appId: string
  appSecret: string
  webhookVerifyToken: string
  publicAppId: string
  configId: string
}

export function getMetaEnv(): MetaEnv | null {
  const appId = process.env.FACEBOOK_APP_ID?.trim()
  const appSecret = process.env.FACEBOOK_APP_SECRET?.trim()
  const webhookVerifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN?.trim()
  const publicAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID?.trim() || appId
  const configId = process.env.NEXT_PUBLIC_FACEBOOK_CONFIG_ID?.trim()

  if (!appId || !appSecret || !webhookVerifyToken || !publicAppId || !configId) {
    return null
  }

  return { appId, appSecret, webhookVerifyToken, publicAppId, configId }
}

export function requireMetaEnv(): MetaEnv {
  const env = getMetaEnv()
  if (!env) {
    throw new Error('META_ENV_INCOMPLETE')
  }
  return env
}
