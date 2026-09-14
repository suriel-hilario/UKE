# E2E tests (Playwright)

End-to-end tests that drive the real app — web + API + Postgres + MinIO via
`docker-compose.prod.yml` — through a browser, authenticating via the real
Auth0 hosted login page. See `openspec/changes/add-e2e-tests/design.md` for
the full rationale and `openspec/specs/e2e-testing/spec.md` for the
requirements this suite implements.

## Prerequisites

- Docker and Docker Compose
- Four dedicated Auth0 test users (one per role: admin, director,
  coordinador, entrenador), created in the same tenant as dev/prod, named
  `e2e-test+<role>@uke.local`, with `app_metadata.skip_mfa = true` so the
  Auth0 rule that skips MFA applies to them (see design.md D1).

## Running locally

1. Copy `.env.test.example` (repo root) to `.env.test` and fill in real
   values — the top section is the same shape as `.env.prod` (used to bring
   up `docker-compose.prod.yml`), the bottom section (`E2E_*_EMAIL` /
   `_PASSWORD` / `_AUTH0_ID`) is consumed directly by Playwright's Node
   process to log in and to seed the database with matching `usuario` rows.
2. Install dependencies and Playwright's browser: `pnpm install && pnpm exec playwright install --with-deps chromium`
3. Run the suite: `pnpm test:e2e`

This brings up `docker-compose.prod.yml` (build included), applies
migrations, seeds fixtures via `apps/api/prisma/seed-e2e.ts`, logs in once
per role (caching session state under `e2e/.auth/`), runs every
`*.spec.ts` file, and tears the stack down afterward.

Each spec file resets the database (`e2e/support/reset.ts` re-runs
`seed-e2e.ts`, which truncates its own tables first) in its own
`beforeAll`, so spec files never depend on state left by another spec file
— safe to run individually: `pnpm test:e2e -- catalogo-equipos.spec.ts`.

## Spec files

One file per user-facing capability, matching `openspec/specs/`:
`auth`, `catalogo-equipos`, `backoffice`, `historico`, `panel-estado`,
`asistencia-entrenadores`, `asistencia-jugadores`, `asistencias-f11`,
`minutaje`.

## CI

The `e2e-tests` job in `.github/workflows/ci.yml` runs after `test-api`
succeeds, using GitHub Secrets for the Auth0 test users' credentials and a
base64-encoded `.env.test` (secret `E2E_ENV_PROD`) for the compose stack.

It currently runs with `continue-on-error: true` — a failure is visible on
the job but does not block merges. **Once the job has recorded 5
consecutive green runs on `master`, remove `continue-on-error` from the
job in `ci.yml`** so failures become blocking.

On failure, the Playwright HTML report and traces are uploaded as a build
artifact (`playwright-report`).

## Adding a spec

Prefer accessible roles/labels; match bilingual (eu/es) button text with a
regex alternation (e.g. `/Editatu|Editar/`), consistent with the existing
Vitest suites. Reach for a `data-testid` only when a control's visible
text is genuinely ambiguous between languages and no existing `aria-label`
already disambiguates it.
