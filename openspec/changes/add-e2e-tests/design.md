## Context

The app has two existing automated layers: Vitest component tests for `apps/web` (which mock `@auth0/auth0-react`) and Jest e2e tests for `apps/api` (`apps/api/test/*.e2e-spec.ts`) that mock `jwks-rsa` to sign locally-built JWTs, so they never talk to a real Auth0 tenant. CI (`.github/workflows/ci.yml`) reflects this: `test-api` runs against placeholder `AUTH0_*` values (`uke-ci.eu.auth0.com`, fake client id/secret) that are never actually contacted.

Nothing today drives the app through a real browser with a real Auth0 hosted-login redirect, so integration bugs in the SPA↔Auth0↔API wiring (redirect URIs, audience, role claim, session refresh) are invisible until manual QA. This change adds that missing layer with Playwright, seeded against `docker-compose.prod.yml`.

## Goals / Non-Goals

**Goals:**
- Drive the real app (web + API + Postgres + MinIO + mailpit, via `docker-compose.prod.yml`) through a browser using Playwright.
- Authenticate via the real Auth0 hosted login page with dedicated test users (one per role needed: admin, director/coordinador, entrenador), per the earlier decision to use real credentials rather than a mock.
- One spec file per user-facing capability (mirroring `openspec/specs/*`), each covering its happy path and main error scenarios.
- Deterministic, idempotent test data: seed before the run, reset between specs so tests don't depend on execution order.
- Wire a new `e2e-tests` CI job after `test-api`.

**Non-Goals:**
- Mocking or stubbing Auth0 in the browser layer (Vitest component tests already do this at the unit level; this suite exists specifically to catch what those mocks hide).
- Dedicated e2e specs for `notificaciones` (email cron/idempotency) or `design-system` (pure visual tokens) — not driven by a discrete user-facing browser flow the same way. May get incidental coverage (e.g. mailpit assertions) later in a dedicated follow-up change if the club requests it.
- Perf/load testing, visual regression testing, or exhaustive UI micro-state coverage.
- Changing any production code behavior; any `data-testid` additions are additive-only.

## Decisions

**D1. Real Auth0 hosted-login flow, dedicated e2e test users in the existing tenant.**
Playwright drives the actual redirect to Auth0's hosted login page and back, using test users created for this purpose (email convention `e2e-test+<role>@uke.local`), with MFA skipped via the `app_metadata.skip_mfa` rule. Users live in the existing dev/prod tenant — no dedicated e2e tenant. Credentials documented in `.env.test.example` (never committed). Blast radius if leaked is limited to test users with no real data access.
*Alternative considered:* dedicated Auth0 e2e tenant. Rejected — adds operational complexity (separate tenant config, secrets rotation, MFA policies) with no meaningful security benefit at this scale.
*Alternative considered:* stub `@auth0/auth0-react` client-side like the Vitest suite does. Rejected — that's exactly what the component tests already cover; it would not catch real redirect/audience/role-claim misconfiguration.

**D2. Session reuse via Playwright `storageState`, one real login per role per run.**
A global setup step logs in once per role, saves `storageState` (cookies + localStorage) to disk (`e2e/.auth/<role>.json`), and every spec file that needs that role loads the saved state instead of repeating the hosted-login redirect.
*Alternative considered:* log in fresh in every test. Rejected — slow, and repeated real logins against Auth0 risk rate limiting / bot-detection challenges.

**D3. Docker Compose topology: `docker-compose.prod.yml`, as specified.**
Global setup runs `docker compose -f docker-compose.prod.yml up -d --wait` before the suite and tears it down after. Using the prod compose file (built images, not bind-mounted dev server) exercises the same artifacts that actually ship.
*Trade-off accepted:* slower startup than the dev compose file; mitigated by CI layer caching as a later optimization.

**D4. Seed + reset strategy: dedicated `prisma/seed-e2e.ts`, reset before each spec file.**
`seed-e2e.ts` creates the minimal fixtures each capability needs. A reset step (truncate relevant tables + reseed) runs before each spec file via Playwright's per-file `beforeAll`. The seed creates Auth0 test users' DB rows using their real `auth0_id` values (from env vars `E2E_ADMIN_AUTH0_ID`, `E2E_DIRECTOR_AUTH0_ID`, etc.) — not placeholders — so the role-resolution path (`GET /auth/me` → DB lookup by auth0_id) is exercised correctly.
*Alternative considered:* one shared seed for the whole run. Rejected — creates ordering dependencies between spec files.

**D5. Selectors: accessible roles/labels first, `data-testid` as fallback.**
Where a role/text-based selector would need to match both EU and ES literals (or is otherwise ambiguous), add a stable `data-testid` instead of asserting on translated copy. Existing accessible roles/labels are preferred first; `data-testid` is the fallback, not the default.

**D6. CI job `e2e-tests`: advisory first, blocking after 5 consecutive green runs.**
The job is wired with `continue-on-error: true` initially. Once the suite has been green across 5 consecutive CI runs, `continue-on-error` is removed to make it blocking. This criterion is documented in `e2e/README.md`. The job depends on `test-api` so we don't pay for a real-Auth0, full-stack run until cheaper checks already passed. On failure, the Playwright HTML report and traces are uploaded as a build artifact.
Requires new GitHub Secrets distinct from `test-api`'s placeholder `AUTH0_*` env vars:
`E2E_AUTH0_DOMAIN`, `E2E_AUTH0_CLIENT_ID`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_AUTH0_ID`, `E2E_DIRECTOR_EMAIL`, `E2E_DIRECTOR_PASSWORD`, `E2E_DIRECTOR_AUTH0_ID`, `E2E_ENTRENADOR_EMAIL`, `E2E_ENTRENADOR_PASSWORD`, `E2E_ENTRENADOR_AUTH0_ID`, `E2E_ENV_PROD` (base64 `.env.prod` for the test stack).

**D7. One spec file per capability, named after the capability.**
`e2e/auth.spec.ts`, `e2e/catalogo-equipos.spec.ts`, `e2e/backoffice.spec.ts`, `e2e/historico.spec.ts`, `e2e/panel-estado.spec.ts`, `e2e/asistencia-entrenadores.spec.ts`, `e2e/asistencia-jugadores.spec.ts`, `e2e/asistencias-f11.spec.ts`, `e2e/minutaje.spec.ts`.

## Risks / Trade-offs

- **[Real Auth0 dependency in CI can be flaky/rate-limited/outage-prone]** → Mitigate with `storageState` reuse, sane retry config in Playwright, and `continue-on-error: true` while the suite stabilizes (D6).
- **[`skip_mfa` app_metadata flag is a security-relevant bypass]** → Restricted to `e2e-test+<role>@` users only, documented in `.env.test.example`, reviewed as part of Auth0 tenant access.
- **[`docker-compose.prod.yml` build adds CI time]** → Accepted for now; build-layer caching is a follow-up optimization.
- **[New e2e seed script may diverge from dev seed]** → Keep it minimal; factor out shared fixture logic where practical.
- **[`notificaciones` and `design-system` have no e2e coverage]** → Explicit non-goal; `notificaciones` can get lightweight Mailpit HTTP API coverage in a follow-up change if the club requests it.

## Migration Plan

1. Add `@playwright/test`, `e2e/` config, auth fixtures (hosted login + `storageState`), and `seed-e2e.ts` — runnable locally against `docker compose -f docker-compose.prod.yml up`, no CI wiring yet.
2. Add spec files incrementally, one capability at a time, verifying each locally.
3. Provision the dedicated Auth0 e2e test users (with `skip_mfa` app_metadata) and add the required GitHub Secrets.
4. Add the `e2e-tests` CI job with `continue-on-error: true`. Run until 5 consecutive green runs, then remove `continue-on-error` to make it blocking (document this criterion in `e2e/README.md`).

Rollback: the CI job and `e2e/` directory can be removed independently; no production code path is altered.

## Open Questions

None — all three resolved:
- **Auth0 tenant:** existing tenant, `e2e-test+<role>@` users with `skip_mfa` app_metadata (D1).
- **Notificaciones e2e:** explicit non-goal for this change; follow-up if requested (Non-Goals).
- **Advisory → blocking criterion:** 5 consecutive green CI runs, documented in `e2e/README.md` (D6).