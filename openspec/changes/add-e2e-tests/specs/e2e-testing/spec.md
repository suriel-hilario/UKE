## ADDED Requirements

### Requirement: One Playwright spec file per user-facing capability
The e2e suite SHALL contain exactly one Playwright spec file per user-facing capability defined in `openspec/specs/`: `auth`, `catalogo-equipos`, `backoffice`, `historico`, `panel-estado`, `asistencia-entrenadores`, `asistencia-jugadores`, `asistencias-f11`, and `minutaje`. Each spec file SHALL cover at least the happy path and the main error scenarios described in that capability's spec.

#### Scenario: Full suite run executes every capability spec file
- **WHEN** the e2e suite is run in full (`playwright test`)
- **THEN** all nine capability spec files execute and each reports pass/fail independently

#### Scenario: A capability spec file covers its happy path and main error scenarios
- **WHEN** the `backoffice` spec file runs
- **THEN** it exercises at least the successful admin CRUD flow (usuarios/temporadas/equipos, including password reset) and at least one main error scenario (e.g. validation failure or unauthorized access) drawn from `openspec/specs/backoffice/spec.md`

### Requirement: Real Auth0 authentication with cached session state
The e2e suite SHALL authenticate against the real Auth0 hosted login page using dedicated test users (one per role required by the suite: admin, director/coordinador, entrenador), rather than mocking the SPA's Auth0 client. The suite SHALL log in at most once per role per run and reuse the resulting session (`storageState`) across all spec files that need that role.

#### Scenario: First test needing a role performs a real hosted login
- **WHEN** the suite's global setup runs for a role that has no cached session state
- **THEN** Playwright navigates the real Auth0 hosted login page, submits that role's test credentials, completes the redirect back to the app, and persists the resulting session to disk

#### Scenario: Subsequent tests reuse the cached session
- **WHEN** a spec file needs a role whose session was already cached by global setup
- **THEN** the test loads the persisted session state and starts already authenticated, without a new hosted-login redirect

#### Scenario: MFA does not block automated login
- **WHEN** an e2e test user (identified by its `skip_mfa` app_metadata flag) logs in
- **THEN** Auth0 skips the MFA challenge for that user so the automated login completes without manual intervention

### Requirement: Deterministic seed and reset between spec files
The e2e suite SHALL seed the database with the minimal fixtures each capability needs before the run, and SHALL reset that data before each spec file executes, so no spec file's outcome depends on state left behind by a previously-run spec file.

#### Scenario: A spec file runs in isolation
- **WHEN** any single capability spec file is run on its own (not as part of the full suite)
- **THEN** it passes using only the seeded/reset fixtures for its own scenarios

#### Scenario: Spec files run out of order or in parallel
- **WHEN** two capability spec files that both mutate shared entities (e.g. `backoffice` and `panel-estado`) run in a different order than usual, or concurrently in separate workers
- **THEN** each still finds its expected seeded state at `beforeAll` because the reset step ran immediately before it

### Requirement: Suite runs against the production Docker Compose topology
The e2e suite SHALL run against the stack defined in `docker-compose.prod.yml` (built images), not the development compose file, so the tests exercise the same artifacts that ship to production.

#### Scenario: Global setup brings up the prod stack
- **WHEN** the e2e suite starts
- **THEN** global setup runs `docker compose -f docker-compose.prod.yml up -d --wait` and waits for all services to report healthy before any test executes

#### Scenario: Stack is torn down after the run
- **WHEN** the e2e suite finishes (whether tests passed or failed)
- **THEN** global teardown stops and removes the `docker-compose.prod.yml` stack it started

### Requirement: CI executes the e2e suite after API tests pass
CI SHALL run a dedicated `e2e-tests` job that depends on the `test-api` job succeeding first, and SHALL upload the Playwright HTML report and traces as a build artifact when the job fails.

#### Scenario: e2e-tests only runs after test-api succeeds
- **WHEN** a pull request is opened and `test-api` fails
- **THEN** the `e2e-tests` job does not run

#### Scenario: Failure produces a debuggable artifact
- **WHEN** the `e2e-tests` job fails on any spec
- **THEN** CI uploads the Playwright HTML report and trace files as a downloadable build artifact

### Requirement: CI job stability gate before becoming blocking
The `e2e-tests` CI job SHALL run with `continue-on-error: true` (advisory, non-blocking) until it has completed five consecutive green runs on the default branch, after which `continue-on-error` SHALL be removed so the job blocks merges on failure.

#### Scenario: Job is advisory during stabilization
- **WHEN** the `e2e-tests` job fails while still in advisory mode
- **THEN** the overall CI run is still reported as successful, and the failure is visible only in that job's own status

#### Scenario: Job becomes blocking after the stability gate
- **WHEN** the `e2e-tests` job has recorded five consecutive green runs on the default branch
- **THEN** `continue-on-error` is removed from the job definition and a subsequent failure blocks the pipeline

### Requirement: Selectors avoid hardcoded bilingual literals
Playwright specs SHALL prefer accessible roles/labels for selectors, and SHALL use a stable `data-testid` attribute instead of asserting on translated (eu/es) copy whenever a selector would otherwise need to match both languages or is otherwise ambiguous.

#### Scenario: An ambiguous bilingual control is targeted via data-testid
- **WHEN** a spec needs to interact with a control whose visible text differs between `eu` and `es`
- **THEN** the spec selects it via a `data-testid` attribute rather than matching either language's literal text
