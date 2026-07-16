## 1. Monorepo Setup (pnpm workspaces)

- [x] 1.1 Create directory structure: `apps/`, `apps/web/`, `apps/api/`, `packages/`, `packages/shared/`
- [x] 1.2 Create `pnpm-workspace.yaml` at project root listing the three workspaces
- [x] 1.3 Create root `package.json` with build scripts: `lint`, `test`, `build` (execute across workspaces via pnpm filtering)
- [x] 1.4 Create `apps/web/package.json` with name `@workspace/web` and initial dependencies for React 18 + TypeScript + Vite
- [x] 1.5 Create `apps/api/package.json` with name `@workspace/api` and initial dependencies for NestJS + TypeScript
- [x] 1.6 Create `packages/shared/package.json` with name `@workspace/shared`
- [x] 1.7 Run `pnpm install` at root to generate `pnpm-lock.yaml`

---

## 2. React Web Application Scaffold

- [x] 2.1 Create Vite React scaffold in `apps/web/` using `create-vite` or manual setup with React 18 + TypeScript
- [x] 2.2 Create `apps/web/tsconfig.json` extending `@workspace/shared/tsconfig.json`
- [x] 2.3 Create `apps/web/vite.config.ts` with React plugin, dev server on port 3000
- [x] 2.4 Create `apps/web/src/App.tsx` with minimal React component
- [x] 2.5 Create `apps/web/src/main.tsx` as entry point
- [x] 2.6 Add ESLint to `apps/web`: install `eslint`, `@typescript-eslint/eslint-plugin`, create `.eslintrc.cjs` or `.eslintrc.json`
- [x] 2.7 Add Vitest to `apps/web`: install `vitest`, `@testing-library/react`, create minimal `vitest.config.ts`
- [x] 2.8 Verify `pnpm --filter @workspace/web dev` starts the Vite dev server on port 3000
- [x] 2.9 Verify `pnpm --filter @workspace/web build` produces a dist directory
- [x] 2.10 Verify `pnpm --filter @workspace/web lint` runs ESLint without critical errors

---

## 3. NestJS API Application Scaffold

- [x] 3.1 Create NestJS scaffold in `apps/api/` using `@nestjs/cli` or manual setup
- [x] 3.2 Create `apps/api/tsconfig.json` extending `@workspace/shared/tsconfig.json`
- [x] 3.3 Create `apps/api/src/main.ts` with NestJS bootstrapping and listening on port 3001
- [x] 3.4 Create `apps/api/src/app.module.ts` as root module
- [x] 3.5 Create `apps/api/src/health/health.controller.ts` with GET `/health` endpoint (no-op, returns `{ status: "ok" }`)
- [x] 3.6 Add ESLint to `apps/api`: install `eslint`, `@typescript-eslint/eslint-plugin`, create `.eslintrc.cjs` or `.eslintrc.json`
- [x] 3.7 Add Jest to `apps/api`: install `jest`, `@types/jest`, `ts-jest`, create `jest.config.js`
- [x] 3.8 Verify `pnpm --filter @workspace/api dev` starts the NestJS dev server on port 3001
- [x] 3.9 Verify `pnpm --filter @workspace/api build` produces a dist directory
- [x] 3.10 Verify `pnpm --filter @workspace/api lint` runs ESLint without critical errors

---

## 4. Shared Package Setup

- [x] 4.1 Create `packages/shared/tsconfig.json` with base TypeScript configuration for the monorepo
- [x] 4.2 Create `packages/shared/package.json` with `main` pointing to appropriate output (initially empty package)
- [x] 4.3 Verify `packages/shared` can be imported via `@workspace/shared` in other apps (dependency path resolution)

---

## 5. Docker Compose Infrastructure

- [x] 5.1 Create `docker-compose.yml` at project root with services: `web`, `api`, `postgres`
- [x] 5.2 Configure `postgres` service: use `postgres:16` image, expose port 5432, set POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB environment variables
- [x] 5.3 Add healthcheck to `postgres` service using `pg_isready` command
- [x] 5.4 Configure `postgres` volume as a named volume (e.g., `postgres_data`) for data persistence
- [x] 5.5 Configure `web` service: build from project root, mount source volume, expose port 3000, run `pnpm dev` (dev server with HMR)
- [x] 5.6 Configure `api` service: build from project root, mount source volume, expose port 3001, run `pnpm dev`, depends on `postgres` healthcheck
- [x] 5.7 Create shared `.dockerignore` to exclude `node_modules`, `.git`, `dist`, etc.
- [x] 5.8 Verify `docker-compose up` starts all three services without errors
- [x] 5.9 Verify web is accessible at `http://localhost:3000`
- [x] 5.10 Verify api is accessible at `http://localhost:3001` and `/health` endpoint responds with 200
- [x] 5.11 Verify postgres is accessible at `localhost:5432` with healthcheck passing
- [x] 5.12 Verify source code changes in `apps/web/src` trigger hot reload in the running web container

---

## 6. GitHub Actions CI Pipeline

- [x] 6.1 Create `.github/workflows/` directory
- [x] 6.2 Create `.github/workflows/ci.yml` workflow file
- [x] 6.3 Configure workflow trigger: `on: [push, pull_request]` for all branches
- [x] 6.4 Add job setup: checkout code, install Node.js 22 LTS, install pnpm, run `pnpm install`
- [x] 6.5 Add lint job: runs `pnpm lint` across all packages, fails if ESLint reports errors
- [x] 6.6 Add test job: runs `pnpm test` across all packages, reports test results
- [x] 6.7 Add build job: runs `pnpm build` to compile both apps, fails if build fails
- [x] 6.8 Add Docker build job: builds Docker images for web and api, tags with commit SHA
- [x] 6.9 Configure job dependencies: lint/test → build → Docker build (sequential)
- [x] 6.10 Verify workflow runs successfully on push to a development branch
- [x] 6.11 Verify workflow shows all job statuses in GitHub PR checks

---

## 7. Validation and Testing

- [x] 7.1 Run `pnpm lint` at root and verify no critical errors
- [x] 7.2 Run `pnpm test` at root and verify tests pass (or no tests initially, but command succeeds)
- [x] 7.3 Run `pnpm build` at root and verify all apps compile
- [x] 7.4 Run `docker-compose up` and verify all services are healthy (wait ~10 seconds)
- [x] 7.5 Test web app connectivity: curl `http://localhost:3000` returns HTML
- [x] 7.6 Test api health endpoint: curl `http://localhost:3001/health` returns JSON with 200 status
- [x] 7.7 Push to GitHub and verify CI workflow completes successfully
- [x] 7.8 Verify Docker images were built and tagged correctly in CI logs
