## 1. Playwright setup

- [x] 1.1 Add `@playwright/test` as a dev dependency (repo root or `apps/web`, per monorepo convention) and install browsers
- [x] 1.2 Create `e2e/` directory with `playwright.config.ts` (baseURL pointing at the compose stack's web port, retries, HTML reporter, trace-on-failure)
- [x] 1.3 Add `global-setup.ts` that runs `docker compose -f docker-compose.prod.yml up -d --wait`
- [x] 1.4 Add `global-teardown.ts` that tears down the compose stack
- [x] 1.5 Add `e2e/.gitignore` entry for `e2e/.auth/` (cached session state) and any local `.env.test`

## 2. Auth fixtures

- [x] 2.1 Create `e2e/support/auth.ts`: a fixture/helper that performs a real Auth0 hosted-login (navigate, fill credentials, submit, wait for redirect back to the app) for a given role
- [x] 2.2 Wire per-role login into global setup: for each role (admin, director/coordinador, entrenador) log in once and persist `storageState` to `e2e/.auth/<role>.json`
- [x] 2.3 Add per-project Playwright config entries (or a `test.use({ storageState })` helper) so each spec file can request a role's cached session
- [x] 2.4 Create `.env.test.example` documenting required env vars: `E2E_AUTH0_DOMAIN`, `E2E_AUTH0_CLIENT_ID`, `E2E_ADMIN_EMAIL`/`PASSWORD`/`AUTH0_ID`, `E2E_DIRECTOR_EMAIL`/`PASSWORD`/`AUTH0_ID`, `E2E_ENTRENADOR_EMAIL`/`PASSWORD`/`AUTH0_ID`
- [ ] 2.5 **BLOCKED — needs manual action in the Auth0 dashboard, outside this repo.** Create the four `e2e-test+<role>@uke.local` users, set `app_metadata.skip_mfa = true` on each, and add/verify the Auth0 rule (or Action) that skips MFA for users carrying that flag. Documented as a prerequisite in `e2e/README.md` and `.env.test.example`, but nothing in the codebase can perform this step.

## 3. Seed and reset infrastructure

- [x] 3.1 Create `apps/api/prisma/seed-e2e.ts`: seeds minimal fixtures (temporadas, equipos, categorías, usuarios) keyed to the real Auth0 test users via `E2E_*_AUTH0_ID` env vars
- [x] 3.2 Add a reset routine (truncate + reseed, or transactional snapshot/restore) invokable before each spec file
- [x] 3.3 Wire the reset routine into Playwright per-file `beforeAll` (or a global fixture that each capability spec imports)
- [x] 3.4 Add an npm script (`pnpm test:e2e` at repo root) and document it in `e2e/README.md`

## 4. Selector conventions

- [x] 4.1 Audit existing components for controls whose visible text differs by language (eu/es) and would be ambiguous to select on
- [x] 4.2 Add stable `data-testid` attributes only where needed per the audit — audit found none needed: existing `aria-label`s (`quitar-dia`, `eliminar-jugador`, `tiene-nota`, `marcar-todos`, `stats-jugador`, `jornada-anterior`/`siguiente`) already disambiguate the interactive controls that matter, and specs use their own non-translated seed fixture names (`E2E Eskola`, `E2E F7`, …) for team/player identification instead of translated copy

## 5. Capability spec files

- [x] 5.1 `e2e/auth.spec.ts` — login (all three roles), logout, protected-route redirect for unauthenticated users, role-based access
- [x] 5.2 `e2e/catalogo-equipos.spec.ts` — browse temporadas/equipos, language toggle, empty-state scenario
- [x] 5.3 `e2e/backoffice.spec.ts` — admin CRUD for usuarios/temporadas/equipos, including the password-reset button and its confirmation message; error scenario for disabled/invalid input
- [x] 5.4 `e2e/historico.spec.ts` — closed-season listing, read-only enforcement, access restricted to admin/director
- [x] 5.5 `e2e/panel-estado.spec.ts` — director/coordinador semaphore panel happy path and an error/edge scenario (e.g. team with no data)
- [x] 5.6 `e2e/asistencia-entrenadores.spec.ts` — attendance recording happy path + a validation error scenario
- [x] 5.7 `e2e/asistencia-jugadores.spec.ts` — attendance recording happy path + a validation error scenario
- [x] 5.8 `e2e/asistencias-f11.spec.ts` — F11-specific attendance flow happy path + a validation error scenario
- [x] 5.9 `e2e/minutaje.spec.ts` — playtime tracking happy path + a validation error scenario

**Caveat:** these spec files were written by reading the component source (routes, roles, i18n keys, aria-labels), not by running them against a live stack — this sandboxed environment has no Docker/Auth0 network access. Some selectors (exact bilingual button copy, dialog/menu roles for a couple of overlays) are best-effort and should be expected to need small fixes on the first real run. Treat task 5 as "drafted, needs a first live run to correct," not "verified."

## 6. CI wiring

- [x] 6.1 Add `e2e-tests` job to `.github/workflows/ci.yml` with `needs: test-api`
- [x] 6.2 Configure the job to build/run `docker-compose.prod.yml`, run `seed-e2e.ts`, then `playwright test`
- [x] 6.3 Add `continue-on-error: true` to the job (advisory phase per design.md D6)
- [x] 6.4 Add a step that uploads the Playwright HTML report and traces as a build artifact on failure
- [ ] 6.5 **BLOCKED — needs repo admin action outside this session.** Add the actual GitHub Secrets (values only obtainable after 2.5 is done): `E2E_AUTH0_DOMAIN`, `E2E_AUTH0_CLIENT_ID`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_AUTH0_ID`, `E2E_DIRECTOR_EMAIL`, `E2E_DIRECTOR_PASSWORD`, `E2E_DIRECTOR_AUTH0_ID`, `E2E_COORDINADOR_EMAIL`, `E2E_COORDINADOR_PASSWORD`, `E2E_COORDINADOR_AUTH0_ID`, `E2E_ENTRENADOR_EMAIL`, `E2E_ENTRENADOR_PASSWORD`, `E2E_ENTRENADOR_AUTH0_ID`, `E2E_ENV_PROD`. `ci.yml` already references these under `secrets.*`; the job will fail (harmlessly, since `continue-on-error: true`) until they're set.

## 7. Documentation and stabilization

- [x] 7.1 Write `e2e/README.md`: how to run the suite locally, env vars required, seed/reset scripts, and the 5-consecutive-green-runs criterion for flipping the CI job from advisory to blocking
- [ ] 7.2 **BLOCKED — inherently post-merge.** Track `e2e-tests` job results after this change merges and starts running for real (i.e. after 2.5 and 6.5 are done); once 5 consecutive green runs are recorded on `master`, remove `continue-on-error: true` from the job in `ci.yml`.
