## Context

The UKE project is starting from zero. Before any application logic (auth, data models, features) can be implemented, the development, deployment, and quality infrastructure must be established. This change provides:

1. A monorepo structure to manage frontend, backend, and shared code with unified dependency management and consistent tooling
2. Local development environment via docker-compose to simulate production topology (multi-container setup)
3. Automated CI gates on every push to ensure code quality before merge

**Current state**: Empty repository. No code, no CI, no containers.

**Constraints**:
- Stack is non-negotiable: React 18 + TypeScript + Vite (web), NestJS + TypeScript (api), PostgreSQL 16, pnpm workspaces (project.md — Stack técnico)
- No business logic, no authentication, no data models — infrastructure only
- Docker images must be vendor-agnostic (no managed services hardcoded in code)

## Goals / Non-Goals

**Goals:**
- Establish a reproducible local development environment: `docker-compose up` brings up web, api, and postgres with zero additional setup
- Set up monorepo with clear workspace boundaries (apps/web, apps/api, packages/shared) and pnpm configuration
- Automate CI: GitHub Actions runs linting, testing, and builds on every push; produces Docker images as deployment artifacts
- Define initial project structure and tooling conventions for subsequent feature changes

**Non-Goals:**
- Application business logic, authentication, or data models (out of scope for this change)
- Production deployment infrastructure (Kubernetes, cloud hosting, load balancing) — docker-compose is for local/CI only
- Performance optimization, caching strategies, or monitoring
- API documentation or OpenAPI spec generation (scaffolding only, to be refined later)

## Decisions

### 1. pnpm Monorepo Structure

**Decision**: Use pnpm workspaces with three top-level packages: `apps/web`, `apps/api`, `packages/shared`.

**Rationale**:
- pnpm's workspace hoisting and strict dependency management prevent version conflicts between frontend and backend dependencies
- Shared types live in `packages/shared` (shared TypeScript definitions, enums, types for API contracts)
- Each app is independently buildable and deployable but shares a single `pnpm-lock.yaml`

**Alternatives considered**:
- Separate repos: Higher maintenance burden, more difficult to keep types in sync; monorepo is simpler for small team
- npm workspaces: pnpm is faster and more disk-efficient

**Structural details**:
- `pnpm-workspace.yaml` at root lists workspaces
- `package.json` at root defines build, test, lint scripts that run across all workspaces
- Each `apps/*` and `packages/*` has its own `package.json`, `tsconfig.json`, and build configuration
- `packages/shared` initially contains only a `tsconfig.json` (extended by other packages) and is otherwise empty; it will hold shared types as they emerge

### 2. Docker Compose for Local Development

**Decision**: Single `docker-compose.yml` with three services: `web` (React dev server on port 3000), `api` (NestJS on port 3001), `postgres` (port 5432).

**Rationale**:
- Developers run one command (`docker-compose up`) to get the full stack locally; no manual postgres setup, no "works on my machine"
- Healthchecks ensure services are ready before dependent services start
- Mirrors production topology (containerized app + database)
- Postgres 16 matches the stack specification

**Structural details**:
- Web service: Mounts source, runs `pnpm dev` (Vite dev server), exposes port 3000
- API service: Mounts source, runs `pnpm dev` (NestJS dev server), exposes port 3001, depends on postgres healthcheck
- Postgres service: Standard postgres:16 image, volume for persistence, environment variables for db/user/password, healthcheck via `pg_isready`

**Images**:
- Web and API both build from the same Dockerfile initially (Node.js base + pnpm + ts-node for development) — not production-optimized; optimization deferred to deployment change
- Postgres uses official postgres:16 image

### 3. GitHub Actions CI Pipeline

**Decision**: Single workflow file `.github/workflows/ci.yml` that on every push/PR:
  1. Runs `pnpm lint` across all packages
  2. Runs `pnpm test` across all packages
  3. Runs `pnpm build` to verify both apps compile
  4. Builds Docker images for web and api (tagged with commit SHA or branch)

**Rationale**:
- Lint + test + build gates catch issues early before merge
- Docker image builds in CI verify Dockerfile correctness; images are ready for manual testing or staging deployment
- Single workflow reduces configuration complexity; future changes (staging deploy, registry push) extend this workflow

**Structural details**:
- Checkout code → set up Node.js (22 LTS per stack spec) → install pnpm → install dependencies
- Run lint, test, build in sequence
- Build Docker images (web and api) and output artifact names/digests (for debugging)
- Publish images to registry: deferred to a later "deploy" change

### 4. Scaffold and Placeholder Code

**Decision**: Create minimal scaffold in each app (no full functionality):
- **web**: Vite project with React 18, TypeScript, entry point, empty App component, Vitest config (no tests initially)
- **api**: NestJS project with TypeScript, single GET `/health` endpoint (no-op), Jest config (no tests initially)
- **packages/shared**: Empty except for tsconfig.json (inheritance point for other packages)

**Rationale**:
- Verifies the monorepo build and CI pipeline work end-to-end
- Provides entry points for the next change (add-auth) to extend without starting from blank files
- `/health` endpoint on the API is a future requirement (99-decisiones § ...) and scaffolding it now prevents later breaking changes

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Postgres data persistence across `docker-compose down`**: If the postgres volume is accidentally deleted, historical data is lost. | Use named volumes in docker-compose.yml and document backup procedures for production-like environments. Local development doesn't require backups. |
| **Docker image bloat in dev**: Building images with dev dependencies (typescript, vitest, jest) increases image size. | Accept larger dev images for local simplicity; production images (post-deployment change) will use multi-stage builds and production dependencies only. |
| **Monorepo lock file conflicts**: Multiple developers editing dependencies can cause merge conflicts in pnpm-lock.yaml. | Document workflow: always run `pnpm install` after pulling; rebase conflicts in lock file by re-running install. |
| **Shared types package remains empty**: If `packages/shared` is not populated early, developers may create duplicate type definitions across apps. | Establish convention: every API contract type (request, response, domain model) shared between web and api lives in `packages/shared`. Review PRs for this. |
| **CI pipeline grows linearly with features**: As more packages are added, CI time increases. | Mitigate with faster machines, parallel steps in workflow, or filtered test runs. Defer advanced optimization to later changes. |

## Migration Plan

**Deployment steps**:
1. Create directory structure and pnpm-workspace.yaml
2. Create `apps/web`, `apps/api`, `packages/shared` with initial scaffolds
3. Create `docker-compose.yml` at project root
4. Create `.github/workflows/ci.yml`
5. Commit and push; CI runs automatically on GitHub

**Rollback**: Not applicable. This is foundational infrastructure with no runtime state or data migration.

**Verification**: 
- `docker-compose up` succeeds; web and api are healthy
- All CI jobs pass on first push
- Subsequent feature changes (add-auth, add-data-model) build on top without rework

## Open Questions

- **Image registry**: Where should Docker images be pushed after CI builds them? (Docker Hub, GitHub Container Registry, private registry?) — Deferred to a later deployment change.
- **pnpm version pinning**: Should pnpm version be pinned in CI and locally (e.g., via `.npmrc` or `engine` field)? — Recommended: yes, use `.npmrc` with `engine-strict=true`, but exact version deferred to initial project setup.
- **Development certificate for HTTPS**: Do local dev and docker-compose need HTTPS/TLS setup? — No: HTTP is sufficient for dev. Production TLS is out of scope for this change.
- **Secrets management in CI**: How are Auth0 credentials or database passwords managed in GitHub Actions for integration tests? — Deferred to add-auth change; for now, CI has no secrets.
