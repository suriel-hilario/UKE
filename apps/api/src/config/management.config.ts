export interface ManagementConfig {
  domain: string
  clientId: string
  clientSecret: string
  audience: string
}

export function loadManagementConfig(env: NodeJS.ProcessEnv = process.env): ManagementConfig {
  const domain = env.AUTH0_DOMAIN
  const clientId = env.AUTH0_M2M_CLIENT_ID
  const clientSecret = env.AUTH0_M2M_CLIENT_SECRET
  const audience = env.AUTH0_M2M_AUDIENCE

  const missing = [
    !domain && 'AUTH0_DOMAIN',
    !clientId && 'AUTH0_M2M_CLIENT_ID',
    !clientSecret && 'AUTH0_M2M_CLIENT_SECRET',
    !audience && 'AUTH0_M2M_AUDIENCE',
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return { domain: domain!, clientId: clientId!, clientSecret: clientSecret!, audience: audience! }
}
