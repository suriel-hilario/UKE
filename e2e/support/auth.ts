import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'

const DIR = path.dirname(fileURLToPath(import.meta.url))

export type Role = 'admin' | 'director' | 'coordinador' | 'entrenador'

export const ROLES: Role[] = ['admin', 'director', 'coordinador', 'entrenador']

export function authFile(role: Role): string {
  return path.join(DIR, '..', '.auth', `${role}.json`)
}

interface Credentials {
  email: string
  password: string
}

const ENV_PREFIX: Record<Role, string> = {
  admin: 'E2E_ADMIN',
  director: 'E2E_DIRECTOR',
  coordinador: 'E2E_COORDINADOR',
  entrenador: 'E2E_ENTRENADOR',
}

export function credentialsFor(role: Role): Credentials {
  const prefix = ENV_PREFIX[role]
  const email = process.env[`${prefix}_EMAIL`]
  const password = process.env[`${prefix}_PASSWORD`]
  if (!email || !password) {
    throw new Error(
      `Missing ${prefix}_EMAIL/${prefix}_PASSWORD env vars — see .env.test.example`,
    )
  }
  return { email, password }
}

/**
 * Drives the real Auth0 Universal (hosted) Login page: navigates to the app,
 * follows the SPA's `loginWithRedirect()` bounce to Auth0, submits the given
 * role's test credentials, and waits for the redirect back into the app.
 */
export async function loginAsRole(page: Page, role: Role): Promise<void> {
  const { email, password } = credentialsFor(role)

  await page.goto('/')
  await page.waitForURL(/\/u\/login|\.auth0\.com/)

  await page.locator('input[name="username"], input#username').fill(email)
  await page.locator('input[name="password"], input#password').fill(password)
  await page.locator('button[type="submit"]').click()

  await page.waitForURL((url) => !url.hostname.includes('auth0.com'), { timeout: 30_000 })
  await page.waitForLoadState('networkidle')
}
