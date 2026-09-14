## Why

The app currently has unit/component tests (Vitest) but no end-to-end coverage that exercises the real stack (web + API + Postgres + MinIO + mailpit) through a browser, driven by real Auth0 login. Regressions like the recently-fixed silent password-reset button ship undetected because no test verifies the full user-facing flow. We need Playwright e2e tests, one file per capability, run against `docker-compose.prod.yml` with seed data, wired into CI after `test-api`.

## What Changes

- Add a new `apps/web/e2e/` (or repo-root `e2e/`) Playwright project: config, fixtures, and a seed/reset mechanism for test data.
- Add a real Auth0 test-login fixture (hosted login page, test users per role: admin, director/coordinador, entrenador).
- Add one Playwright spec file per testable capability, covering the happy path and main error scenarios from each capability's spec:
  - `auth` (login, logout, role resolution, protected routes)
  - `catalogo-equipos` (browse temporadas/equipos, language toggle)
  - `backoffice` (admin CRUD: usuarios, temporadas, equipos — including the password-reset confirmation flow)
  - `historico` (closed-season read-only listing/access)
  - `panel-estado` (director/coordinador semaphore panel)
  - `asistencia-entrenadores`, `asistencia-jugadores`, `asistencias-f11` (attendance recording flows)
  - `minutaje` (playtime tracking flow)
- Add a `e2e-tests` CI job in `.github/workflows/ci.yml` that runs after `test-api` succeeds: brings up `docker-compose.prod.yml`, seeds test data, runs the Playwright suite, tears the stack down, uploads the HTML report/traces as an artifact on failure.
- `notificaciones` and `design-system` are excluded from per-capability e2e specs (email-sending cron / pure visual tokens respectively) — not driven by user-facing browser flows in the same way; may be partially covered incidentally by other specs.

## Capabilities

### New Capabilities
- `e2e-testing`: Playwright end-to-end test suite (config, auth fixtures, seed data, CI job) that verifies the happy path and main error scenarios of every user-facing capability against a real running stack.

### Modified Capabilities
(none — this change adds verification, it does not change the requirements of `auth`, `catalogo-equipos`, `backoffice`, `historico`, `panel-estado`, `asistencia-entrenadores`, `asistencia-jugadores`, `asistencias-f11`, or `minutaje`.)

## Impact

- New dependency: `@playwright/test` (dev dependency), new `e2e/` directory with config + specs.
- New test-only Auth0 users (or reused fixtures) and a documented `.env.test` (not committed) for their credentials.
- New seed script/data for `docker-compose.prod.yml` so e2e runs are deterministic and idempotent.
- `.github/workflows/ci.yml`: new `e2e-tests` job, depends on `test-api`; CI run time increases.
- No production code behavior changes; may require small testability hooks (e.g., stable `data-testid`s) in existing components.
- Auth0 MFA strategy for e2e tests: test users SHALL have MFA disabled via
  Auth0 Dashboard (Security → Multi-factor Auth → Add rule to skip MFA for
  users with app_metadata.skip_mfa = true). This avoids TOTP complexity in CI.
  Test users are created in Auth0 with this metadata flag set.
  Source: project.md § Autenticación (MFA by policy); decision taken in proposal.
