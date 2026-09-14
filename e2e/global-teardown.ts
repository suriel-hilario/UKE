import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.join(DIR, '..')
const COMPOSE_FILE = 'docker-compose.prod.yml'
const ENV_FILE = process.env.E2E_ENV_FILE ?? '.env.test'

export default async function globalTeardown(): Promise<void> {
  execFileSync(
    'docker',
    ['compose', '-f', COMPOSE_FILE, '--env-file', ENV_FILE, 'down', '-v'],
    { cwd: REPO_ROOT, stdio: 'inherit' },
  )
}
