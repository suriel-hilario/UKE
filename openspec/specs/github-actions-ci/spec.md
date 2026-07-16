## ADDED Requirements

### Requirement: GitHub Actions workflow file is configured for CI

A GitHub Actions workflow SHALL be defined at `.github/workflows/ci.yml` that triggers on every push and pull request to the repository.

#### Scenario: Workflow file exists

- **WHEN** the repository is pushed to GitHub
- **THEN** the file `.github/workflows/ci.yml` exists in the repository

#### Scenario: Workflow triggers on push and pull request

- **WHEN** code is pushed to any branch or a pull request is opened
- **THEN** the workflow automatically starts and runs all CI jobs

---

### Requirement: CI pipeline runs linting across all packages

The workflow SHALL execute linting (e.g., ESLint) on code in `apps/web`, `apps/api`, and `packages/shared`.

#### Scenario: Lint job runs and reports results

- **WHEN** the CI workflow executes
- **THEN** a linting job runs and reports results (pass or fail) in the GitHub Actions UI

#### Scenario: Lint failures block merge

- **WHEN** linting finds errors in any package
- **THEN** the workflow marks the lint job as failed, and the GitHub UI shows the linting failures in the PR

---

### Requirement: CI pipeline runs tests across all packages

The workflow SHALL execute test suites (Vitest for web, Jest for api) on code in `apps/web` and `apps/api`.

#### Scenario: Test job runs and reports results

- **WHEN** the CI workflow executes
- **THEN** a test job runs and reports results (pass or fail) in the GitHub Actions UI

#### Scenario: Test failures block merge

- **WHEN** tests fail in any app
- **THEN** the workflow marks the test job as failed, and the GitHub UI shows the test failures in the PR

---

### Requirement: CI pipeline builds both applications

The workflow SHALL verify that both `apps/web` and `apps/api` successfully compile and produce build artifacts.

#### Scenario: Build job compiles web and api

- **WHEN** the CI workflow executes
- **THEN** a build job runs `pnpm build` and verifies that both apps compile without errors

#### Scenario: Build failures block merge

- **WHEN** the build fails in either app
- **THEN** the workflow marks the build job as failed, and the GitHub UI shows build errors in the PR

---

### Requirement: CI pipeline builds Docker images for web and api

The workflow SHALL build Docker images for the web and api services and produce image artifacts or log image names for debugging.

#### Scenario: Docker images are built

- **WHEN** the CI workflow executes after lint, test, and build succeed
- **THEN** a Docker build job creates images for the web and api services

#### Scenario: Image names include commit reference

- **WHEN** Docker images are built
- **THEN** image names or tags include a reference to the commit SHA or branch name for traceability

#### Scenario: Build failure does not block image build job

- **WHEN** Docker image build fails
- **THEN** the workflow fails, but any earlier job output (lint, test, build) is still visible in logs for debugging

---

### Requirement: CI pipeline uses Node.js 22 LTS

The workflow SHALL set up Node.js 22 LTS (long-term support) as specified in the project stack.

#### Scenario: Node.js 22 LTS is installed

- **WHEN** the CI workflow runs
- **THEN** it installs Node.js 22 LTS (or a later 22.x patch version) and makes it available to all subsequent steps

---

### Requirement: CI pipeline uses pnpm for dependency installation

The workflow SHALL install and use pnpm for all dependency operations.

#### Scenario: pnpm is installed and used

- **WHEN** the CI workflow installs dependencies
- **THEN** it uses pnpm (not npm or yarn) to run `pnpm install` and subsequent build, lint, and test commands

---

### Requirement: CI steps execute in sequence (lint → test → build → docker)

The workflow jobs SHALL execute in a defined order: lint and test in parallel (or sequentially after setup), build, then Docker image build, so that early failures prevent downstream steps.

#### Scenario: Lint and test run before build

- **WHEN** the CI workflow executes
- **THEN** linting and testing complete before the build job starts

#### Scenario: Build runs before Docker image build

- **WHEN** lint and test succeed
- **THEN** the build job runs; Docker image build does not start until the build job completes

---

### Requirement: CI workflow logs all failures and successes

The workflow jobs SHALL output clear pass/fail status and logs visible in the GitHub Actions UI.

#### Scenario: Job status is visible in PR

- **WHEN** a CI workflow runs on a pull request
- **THEN** each job (lint, test, build, docker) shows a status badge (✓ or ✗) in the PR checks

#### Scenario: Logs are available for debugging

- **WHEN** a job fails
- **THEN** detailed logs are accessible in the GitHub Actions "Checks" tab for debugging
