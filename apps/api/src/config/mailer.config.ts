export interface MailerConfig {
  host: string
  port: number
  user?: string
  pass?: string
  from: string
  appBaseUrl: string
  tz: string
}

export function loadMailerConfig(env: NodeJS.ProcessEnv = process.env): MailerConfig {
  const host = env.SMTP_HOST
  const port = env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined
  const from = env.SMTP_FROM
  const appBaseUrl = env.APP_BASE_URL
  const tz = env.TZ ?? 'Europe/Madrid'

  const missing = [!host && 'SMTP_HOST', !port && 'SMTP_PORT', !from && 'SMTP_FROM', !appBaseUrl && 'APP_BASE_URL']
    .filter(Boolean)
    .map(String)

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return { host: host!, port: port!, user: env.SMTP_USER, pass: env.SMTP_PASS, from: from!, appBaseUrl: appBaseUrl!, tz }
}
