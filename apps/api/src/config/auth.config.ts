export interface AuthConfig {
  domain: string
  audience: string
  roleClaim: string
}

export function loadAuthConfig(env: NodeJS.ProcessEnv = process.env): AuthConfig {
  const domain = env.AUTH0_DOMAIN
  const audience = env.AUTH0_AUDIENCE
  const roleClaim = env.AUTH0_ROLE_CLAIM

  const missing = [
    !domain && 'AUTH0_DOMAIN',
    !audience && 'AUTH0_AUDIENCE',
    !roleClaim && 'AUTH0_ROLE_CLAIM',
  ].filter(Boolean)

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }

  return { domain: domain!, audience: audience!, roleClaim: roleClaim! }
}
