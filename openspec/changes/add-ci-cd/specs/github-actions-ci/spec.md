## MODIFIED Requirements

### Requirement: GitHub Actions workflow file is configured for CI

A GitHub Actions workflow SHALL be defined at `.github/workflows/ci.yml` that triggers on every push and pull request to any branch (`proposal.md` § What Changes; `design.md` § D10 — the previous version triggered only on `main`/`develop`/`feature/**`, which never matched this repository's actual branch, `master`, so the workflow had never run).

#### Scenario: Workflow file exists

- **WHEN** the repository is pushed to GitHub
- **THEN** the file `.github/workflows/ci.yml` exists in the repository

#### Scenario: Workflow triggers on push and pull request to any branch

- **WHEN** code is pushed to any branch (including `master`) or a pull request is opened against any branch
- **THEN** the workflow automatically starts and runs all CI jobs

---

### Requirement: CI pipeline typechecks both applications

The workflow SHALL run a `lint-and-typecheck` job that executes `tsc --noEmit` for `apps/api` and `apps/web` (`proposal.md` § CI — ci.yml, job `lint-and-typecheck`). This replaces the previous ESLint-based linting job — no ESLint step runs in CI under this workflow (`design.md` § D10).

#### Scenario: Typecheck job runs and reports results

- **WHEN** the CI workflow executes
- **THEN** the `lint-and-typecheck` job runs `tsc --noEmit` for both `apps/api` and `apps/web` and reports pass/fail in the GitHub Actions UI

#### Scenario: Type errors block the job

- **WHEN** `tsc --noEmit` finds a type error in either package
- **THEN** the `lint-and-typecheck` job fails and the GitHub UI shows the errors in the PR

---

### Requirement: CI pipeline tests the API with a real database

The workflow SHALL run a `test-api` job using a `postgres:16` service container, that applies pending Prisma migrations to it and then runs both `pnpm --filter @workspace/api test` (unit) and `pnpm --filter @workspace/api test:e2e` (end-to-end, which exercise real Prisma-backed database queries) (`proposal.md` § CI — ci.yml, job `test-api`; `design.md` § D6 — migrations must be applied before e2e tests can pass against a fresh database).

#### Scenario: Test job runs against a real database

- **WHEN** the CI workflow executes
- **THEN** the `test-api` job starts a `postgres:16` service container, applies migrations to it, and runs both the unit and e2e test suites against it

#### Scenario: Test failures block the job

- **WHEN** any API unit or e2e test fails
- **THEN** the `test-api` job fails and the GitHub UI shows the failures in the PR

---

### Requirement: CI pipeline builds and tests the frontend

The workflow SHALL run a `build-web` job that executes both `pnpm --filter @workspace/web test` (Vitest) and `pnpm --filter @workspace/web build` (`vite build`, which includes a `tsc` type-check pass per the web package's own build script) (`proposal.md` § CI — ci.yml, job `build-web`; `design.md` § D11 — the frontend's existing test suite must keep running in CI, not just its build). `apps/api` has no equivalent separate build job in this workflow — `tsc --noEmit` (above) already validates its buildability, and its actual compiled artifact is produced fresh at deploy time by `Dockerfile.api.prod`, not cached from CI.

#### Scenario: Frontend tests and build both run

- **WHEN** the CI workflow executes
- **THEN** the `build-web` job runs the Vitest suite and then `vite build`, reporting pass/fail for both

#### Scenario: Either a test failure or a build failure blocks the job

- **WHEN** a Vitest test fails, or `vite build` fails (e.g. a TypeScript error)
- **THEN** the `build-web` job fails and the GitHub UI shows the failure in the PR

---

### Requirement: CI jobs run independently and report their own status

The workflow's three jobs (`lint-and-typecheck`, `test-api`, `build-web`) SHALL run independently rather than in an imposed lint→test→build→docker sequence — none of the previous ordering rationale applies since there is no longer a Docker image-build job to gate (`design.md` § D10). Each job SHALL report its own pass/fail status.

#### Scenario: Jobs run without an artificial dependency chain

- **WHEN** the CI workflow executes
- **THEN** `lint-and-typecheck`, `test-api`, and `build-web` are not chained via `needs:` to one another — a failure in one does not prevent the others from running and reporting their own results

#### Scenario: Job status is visible in PR

- **WHEN** a CI workflow runs on a pull request
- **THEN** each job shows its own status badge (✓ or ✗) in the PR checks

---

## REMOVED Requirements

### Requirement: CI pipeline runs linting across all packages

**Reason**: Replaced by the `lint-and-typecheck` job's `tsc --noEmit` checks (`design.md` § D10). ESLint is no longer run as part of this workflow.

**Migration**: Run `pnpm lint` locally (or via a pre-commit hook, if one is added later) — it is no longer enforced as a CI gate under this workflow.

### Requirement: CI pipeline builds Docker images for web and api

**Reason**: Building Docker images in CI duplicated work that now happens on the Droplet during deploy (`deploy.sh`'s `docker compose build` step, using `Dockerfile.api.prod`/`Dockerfile.web.prod`) — the old CI job also referenced the outdated dev Dockerfiles (`Dockerfile.web`/`Dockerfile.api`), not the production ones `add-infra-digitalocean` introduced (`design.md` § D10).

**Migration**: No CI-side replacement needed — image builds are verified as part of every deploy (`.github/workflows/deploy.yml`, which fails the deploy if `docker compose build` fails).
