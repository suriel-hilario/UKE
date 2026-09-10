## 1. Backend: RolesGuard resolves role from DB

- [x] 1.1 Make `RolesGuard.canActivate` async and inject `PrismaService`; resolve the caller's `usuario` row by `auth0_id = request.user.sub`, using `usuario.rol` instead of `request.user[roleClaim]` for the allowed-roles check (spec: "Control de acceso por rol (backend)").
- [x] 1.2 Respond 403 when no local `usuario` row exists for the authenticated `auth0_id` (same as the existing missing/invalid-role behavior).
- [x] 1.3 Add/update a unit test for `RolesGuard` (mocking `PrismaService`) covering: DB role in allowed list → passes; DB role not in allowed list → 403; no local `usuario` row → 403. Implemented as e2e tests in `test/auth.e2e-spec.ts` (existing convention in this repo — real Prisma against the test DB, not a mocked unit test) covering both the allow/deny cases and the explicit JWT-says-admin-but-DB-says-entrenador mismatch case.

## 2. Backend: GET /auth/me resolves role from DB

- [x] 2.1 Update `AuthController.me` to take `rol` from the `usuario` row already being queried (drop the `req.user[roleClaim]` read) (spec: "Endpoint de identidad del usuario autenticado").
- [x] 2.2 Respond 404 when no local `usuario` row exists for the authenticated `auth0_id`, instead of returning `rol: undefined`.
- [x] 2.3 Update/add tests for `AuthController.me` covering: existing user → `rol` from DB; no local row → 404. Same `test/auth.e2e-spec.ts` file, rewritten to seed real `usuario` rows and assert DB-sourced `rol` (including a case where the JWT claim and DB role disagree).

## 3. Frontend: useAuth() sources role from /auth/me

- [x] 3.1 Update `useAuth()` to fetch `GET /auth/me` (using `getAccessTokenSilently()` for the token, same pattern as `useCatalogoApi`/`useAdminApi`/`useAsistenciaApi`) once Auth0 has resolved, and take `user.rol` from that response instead of decoding it from the Auth0 SPA `user` object (spec: "Hook de estado de autenticación (frontend)"). Also removed `roleClaim.ts` — no longer referenced anywhere.
- [x] 3.2 Make `isLoading` remain `true` until both the Auth0 SDK and the `/auth/me` fetch have resolved.
- [x] 3.3 Verify `AppShell.test.tsx` (which already mocks `fetch` for `/auth/me` and exercises the real `useAuth()` via mocked `useAuth0`) still passes; adjust its fetch mock if the request shape changed. Passed unchanged — its fetch mock already handles `/auth/me` generically.

## 4. Verification

- [x] 4.1 Run the backend test suite (`pnpm --filter @workspace/api test`) — confirm no regressions. Found and fixed two pre-existing e2e test files (`admin.e2e-spec.ts`, `historico.e2e-spec.ts`) that signed tokens with no matching local `usuario` row — real fallout from the RolesGuard change, now seeding proper rows per role. All 91 e2e tests + 15 unit tests pass.
- [x] 4.2 Run the frontend test suite (`pnpm --filter @workspace/web test`) — confirm no regressions (most consumers mock `useAuth()` at the module level and are unaffected; `AppShell.test.tsx` exercises the real hook). All 66 tests pass, `tsc --noEmit` clean.
- [x] 4.3 Manually verify end-to-end: log in as an account whose JWT role and DB role differ (e.g. the two found during `add-design-system` testing) and confirm both the frontend routing (`Home()`/`RoleGuard`) and `/admin/*` access now follow the DB role, not the JWT. Confirmed live for `test@gmail.com` against the hot-reloaded API (`useAuth()` now sources `rol` from `/auth/me`, correctly showing "coordinador" per the DB row). The `suriel.hilario@gmail.com` (JWT admin / DB director) case relies on the equivalent backend e2e coverage (`test/auth.e2e-spec.ts`, "rejects when the JWT claim says admin but the DB role does not") rather than a second live re-login — that saved session had expired and re-establishing it requires another full Google/MFA cycle for no additional signal, since the underlying mechanism (both endpoints resolving role from DB by `auth0_id`) is identical for both accounts and already proven live for one and via e2e for the other.
