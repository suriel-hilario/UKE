## Why

The project requires a modern, scalable development infrastructure supporting local development, containerized deployment, and continuous integration. A monorepo structure enables shared types across frontend and backend, reducing duplication and improving type safety. Docker composition allows consistent environments across development and CI. GitHub Actions automates quality gates (linting, testing, building) before merge.

## What Changes

- **New:** pnpm monorepo with `apps/web`, `apps/api`, and `packages/shared` — eliminates dependency conflicts and centralizes shared type definitions
- **New:** docker-compose.yml with web (React dev server), api (NestJS), postgres 16 (with healthchecks) — enables one-command local environment
- **New:** GitHub Actions CI pipeline that runs lint, test, and build for both apps and produces Docker images — ensures code quality before merge

## Capabilities

### New Capabilities

- `pnpm-workspaces`: Monorepo structure with workspace packages (apps/web, apps/api, packages/shared). pnpm-workspace.yaml, root package.json, per-package configuration.
- `docker-compose-infrastructure`: Local development stack (web, api, postgres 16) with container healthchecks and port exposure.
- `github-actions-ci`: CI pipeline that lints, tests, and builds both apps; produces Docker images for web and api.

### Modified Capabilities

<!-- No existing capabilities are modified by this change; this is the first infrastructure change. -->

## Impact

- **Development**: All future development happens within the monorepo structure; adds build tooling dependency on pnpm.
- **CI/CD**: All changes undergo automated lint, test, and build checks via GitHub Actions.
- **Deployment**: Docker images become the deployment artifact for web and api.
- **Dependencies**: Introduction of root-level package manager (pnpm) and container runtime requirements.
