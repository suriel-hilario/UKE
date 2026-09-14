import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(DIR, '..', '..')
const COMPOSE_FILE = 'docker-compose.prod.yml'
const ENV_FILE = process.env.E2E_ENV_FILE ?? '.env.test'

const SEED_ENV_VARS = [
  'E2E_ADMIN_AUTH0_ID',
  'E2E_DIRECTOR_AUTH0_ID',
  'E2E_COORDINADOR_AUTH0_ID',
  'E2E_ENTRENADOR_AUTH0_ID',
]

/**
 * `seed-e2e.ts` truncates its own tables before recreating fixtures, so
 * re-running it is both the seed and the reset. Call this in each spec
 * file's `test.beforeAll` so no spec depends on state left by another.
 */
export function resetDatabase(): void {
  const envArgs = SEED_ENV_VARS.flatMap((name) => {
    const value = process.env[name]
    if (!value) throw new Error(`Missing ${name} env var — see .env.test.example`)
    return ['-e', `${name}=${value}`]
  })

  execFileSync(
    'docker',
    [
      'compose',
      '-f',
      COMPOSE_FILE,
      '--env-file',
      ENV_FILE,
      'exec',
      '-T',
      ...envArgs,
      'api',
      'npx',
      'ts-node',
      'prisma/seed-e2e.ts',
    ],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  )
}
