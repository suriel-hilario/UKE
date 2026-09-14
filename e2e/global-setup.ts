import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'
import { ROLES, authFile, loginAsRole } from './support/auth'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(DIR, '..')
const COMPOSE_FILE = 'docker-compose.prod.yml'
const ENV_FILE = process.env.E2E_ENV_FILE ?? '.env.test'

// Vars the api container needs at runtime to seed data keyed to the real
// Auth0 test users, forwarded explicitly since docker-compose.prod.yml's
// `environment:` block doesn't reference them.
const SEED_ENV_VARS = [
  'E2E_ADMIN_AUTH0_ID',
  'E2E_DIRECTOR_AUTH0_ID',
  'E2E_COORDINADOR_AUTH0_ID',
  'E2E_ENTRENADOR_AUTH0_ID',
]

function compose(...args: string[]): void {
  execFileSync('docker', ['compose', '-f', COMPOSE_FILE, '--env-file', ENV_FILE, ...args], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  })
}

function seedEnvArgs(): string[] {
  return SEED_ENV_VARS.flatMap((name) => {
    const value = process.env[name]
    if (!value) throw new Error(`Missing ${name} env var — see .env.test.example`)
    return ['-e', `${name}=${value}`]
  })
}

export default async function globalSetup(): Promise<void> {
  compose('build')
  compose('up', '-d', '--wait')

  compose('exec', '-T', 'api', 'npx', 'prisma', 'migrate', 'deploy')
  compose('exec', '-T', ...seedEnvArgs(), 'api', 'npx', 'ts-node', 'prisma/seed-e2e.ts')

  const browser = await chromium.launch()
  try {
    for (const role of ROLES) {
      const context = await browser.newContext({
        baseURL: process.env.E2E_BASE_URL ?? 'https://localhost',
        ignoreHTTPSErrors: true,
      })
      const page = await context.newPage()
      await loginAsRole(page, role)
      await context.storageState({ path: authFile(role) })
      await context.close()
    }
  } finally {
    await browser.close()
  }
}
