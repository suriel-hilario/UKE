import * as jwt from 'jsonwebtoken'
import { testJwtKeys } from './test-jwt-keys'

export const AUTH0_DOMAIN = 'test.auth0.local'
export const AUTH0_AUDIENCE = 'test-audience'
export const AUTH0_ROLE_CLAIM = 'https://uke.local/rol'

export function buildToken(overrides: Record<string, unknown> = {}, expiresInSeconds = 3600) {
  return jwt.sign(
    {
      sub: 'auth0|123',
      email: 'user@example.com',
      [AUTH0_ROLE_CLAIM]: 'admin',
      ...overrides,
    },
    testJwtKeys.privateKey,
    {
      algorithm: 'RS256',
      audience: AUTH0_AUDIENCE,
      issuer: `https://${AUTH0_DOMAIN}/`,
      expiresIn: expiresInSeconds,
    },
  )
}
