## Purpose

Establish a pnpm monorepo structure with clear workspace boundaries for the frontend (React), backend (NestJS), and shared code. This enables consistent dependency management, unified build tooling, and independent app deployments while maintaining a single source of truth for versioning.

## Requirements

### Requirement: Monorepo initialized with pnpm workspaces

The project SHALL be structured as a pnpm monorepo with a root `pnpm-workspace.yaml` that defines three workspace packages: `apps/web`, `apps/api`, and `packages/shared`. Each package SHALL have its own `package.json`, `tsconfig.json`, and build artifacts directory.

#### Scenario: Root workspace configuration exists

- **WHEN** a developer clones the repository
- **THEN** a file `pnpm-workspace.yaml` exists at the project root listing `apps/web`, `apps/api`, and `packages/shared` as workspaces

#### Scenario: Apps and packages directories are created

- **WHEN** the project is initialized
- **THEN** directories `apps/web`, `apps/api`, and `packages/shared` exist with their own `package.json` files

#### Scenario: Shared configuration package is available

- **WHEN** any app requires types or configuration from the shared package
- **THEN** `packages/shared` exports a `tsconfig.json` that can be extended via `"extends": "@workspace/shared/tsconfig.json"` (or similar path reference)

---

### Requirement: Dependencies are managed across the monorepo with pnpm

The project SHALL use a single `pnpm-lock.yaml` at the root that pins all transitive dependencies across all workspace packages. Running `pnpm install` at the root SHALL install dependencies for all workspaces.

#### Scenario: Single lock file for all workspaces

- **WHEN** a developer adds a dependency to any workspace package (e.g., `pnpm add express -w apps/api`)
- **THEN** the root `pnpm-lock.yaml` is updated with the new dependency and all transitive versions

#### Scenario: Installing dependencies updates all workspaces

- **WHEN** a developer runs `pnpm install` at the project root
- **THEN** all packages (`apps/web`, `apps/api`, `packages/shared`) have their dependencies installed in `node_modules`

---

### Requirement: Build scripts are callable at the root level

The root `package.json` SHALL define scripts that execute build tasks across all workspace packages (e.g., `pnpm lint`, `pnpm test`, `pnpm build`).

#### Scenario: Lint script runs across all workspaces

- **WHEN** a developer runs `pnpm lint` at the project root
- **THEN** linting tools run on code in `apps/web`, `apps/api`, and `packages/shared`

#### Scenario: Test script runs across all workspaces

- **WHEN** a developer runs `pnpm test` at the project root
- **THEN** test suites for `apps/web`, `apps/api`, and `packages/shared` execute

#### Scenario: Build script compiles all packages

- **WHEN** a developer runs `pnpm build` at the project root
- **THEN** `apps/web` and `apps/api` produce build output (compiled JS, manifests, etc.)

---

### Requirement: Each app has independent tooling configuration

Each app (web and api) SHALL have its own `tsconfig.json`, build configuration, and development server configuration independent of the other.

#### Scenario: TypeScript configuration per app

- **WHEN** an app needs TypeScript settings specific to its framework (e.g., React for web, Node.js for api)
- **THEN** each app has its own `tsconfig.json` that can be customized independently

#### Scenario: Build and dev server configs are separate

- **WHEN** the web app is built vs. the api app is built
- **THEN** each uses its own build tool configuration (e.g., Vite config for web, NestJS config for api) without affecting the other
