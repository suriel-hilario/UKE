## Context

Three code paths currently decide "what is this user's role" independently:

1. **`RolesGuard`** (`apps/api/src/auth/roles.guard.ts`), registered globally as an `APP_GUARD` alongside `JwtAuthGuard` in `AuthModule`. It reads `request.user[roleClaim]` — the Auth0 JWT's `https://uke.local/rol` claim — and gates every `@Roles(...)`-decorated endpoint (`/admin/*`).
2. **`GET /auth/me`** (`apps/api/src/auth/auth.controller.ts`), which also reads `req.user[roleClaim]` for the `rol` field it returns, though it separately queries the local `usuario` row for `nombre_visible`/`idioma`.
3. **`CatalogoAccessService.resolveUsuario`** (`apps/api/src/catalogo/catalogo-access.service.ts`), which looks up the local `usuario` row by `auth0_id` (the JWT's `sub`) and uses `usuario.rol` from Postgres — already the DB, not the JWT — to compute scope for `/catalogo`, `/equipos`, and (transitively, via the same pattern) `/panel`.

On the frontend, `useAuth()` (`apps/web/src/auth/useAuth.ts`) decodes `rol` from the Auth0 SPA SDK's `user` object — i.e., from the JWT — and that value drives `RoleGuard` and the `Home()` redirect logic in `App.tsx`.

Because the JWT claim is fixed at token-issuance time (login) while `usuario.rol` in Postgres is mutable at any time via the backoffice (`PATCH /admin/users/:id`), (1) and the frontend can show/enforce a stale role until the affected user logs out and back in, while (2)'s `/catalogo`/`/equipos`/`/panel` family already reflects the current DB value. This was discovered empirically while live-verifying `add-design-system`: two real accounts had a JWT role that didn't match their DB row, one of which caused a user to be silently redirected away from a screen they should have had access to.

## Goals / Non-Goals

**Goals:**
- Make the local `usuario.rol` row the single source of truth for every authorization decision made *after* a JWT has been validated (signature/audience/issuer/expiry — that part of `JwtAuthGuard` is unchanged).
- Bring `RolesGuard` and `GET /auth/me` in line with the pattern `CatalogoAccessService` already uses.
- Surface a clear, explicit error when an authenticated Auth0 identity has no corresponding local `usuario` row, instead of silently proceeding with an undefined role.

**Non-Goals:**
- Not changing how or when the Auth0 Action injects the `rol` claim into the JWT — that mechanism still seeds the role at first provisioning and remains useful there.
- Not changing the JWT validation itself (signature, audience, issuer, expiry) in `JwtAuthGuard`/`JwtStrategy`.
- Not introducing a caching/invalidation layer for the DB role lookup — this change accepts the same per-request DB cost `CatalogoAccessService` already pays.
- Not reconciling the specific drifted rows found during testing (`suriel`, `test@gmail.com`) as part of this change — that's a one-off data fix, not a spec requirement.

## Decisions

### D1. `RolesGuard` resolves role via a DB lookup by `auth0_id`, mirroring `CatalogoAccessService`
Both `JwtAuthGuard` and `RolesGuard` are registered as `APP_GUARD` in that order (`auth.module.ts`), so `req.user.sub` (the Auth0 `sub`, used as `auth0_id`) is already populated by the time `RolesGuard` runs. `RolesGuard` becomes `async canActivate()`, injects `PrismaService` (already `@Global()`, no new module wiring needed), and looks up `usuario.rol` the same way `CatalogoAccessService.resolveUsuario` does.

**Alternative considered:** fall back to the JWT claim if no DB row exists, or if the DB lookup fails. Rejected — that reintroduces exactly the silent-drift behavior this change removes and would mask a genuine provisioning bug (an Auth0 identity with no matching `usuario` row should never quietly succeed).

### D2. No caching of the per-request DB role lookup
This change does not add request-scoped caching, a short-TTL cache, or a role-claim-refresh mechanism.

**Alternative considered:** cache the resolved `usuario` row for the lifetime of a request (useful if a request also calls `CatalogoAccessService`, doubling the lookup) or for a few seconds across requests. Rejected for this change: it's a real but separate optimization, the added complexity isn't justified without a measured perf problem, and `CatalogoAccessService` already accepts this same cost today at the traffic this app serves.

### D3. Different status codes for guard rejection vs. identity lookup
`RolesGuard` responds `403 Forbidden` when the local `usuario` row is missing — consistent with its existing behavior when the role claim itself was missing or not in the allowed list (a `@Roles(...)`-guarded endpoint has always used 403 for "you may not do this"). `GET /auth/me` responds `404 Not Found` when the local row is missing, consistent with `CatalogoAccessService.resolveUsuario`'s existing convention (`El usuario no existe en la base de datos local`) — `/auth/me` is an identity-lookup endpoint, so "the identity doesn't exist locally" is a 404, not a 403.

### D4. `useAuth()` keeps its existing shape; only its internals change
`useAuth()` still returns `{ isAuthenticated, isLoading, user: { id, email, rol }, login, logout }`. Internally, it now also calls `GET /auth/me` (once Auth0 has resolved) and takes `rol` from that response instead of decoding the SPA SDK's `user` object. `isLoading` becomes `true` until *both* the Auth0 SDK and the `/auth/me` fetch have resolved.

**Alternative considered:** add a separate hook (e.g. `useUserRole()`) and leave `useAuth()` JWT-based. Rejected — every consumer (`RoleGuard`, `Home()`, `AppShell`, etc.) already reads `useAuth().user.rol`; keeping the same interface means zero changes at call sites, only inside the hook.

### D5. The Auth0 JWT role claim is left untouched at issuance
No changes to the Auth0 Action or `AUTH0_ROLE_CLAIM`. The claim remains a reasonable seed value the first time a `usuario` row is provisioned, but is no longer read for any authorization decision covered by this change.

## Risks / Trade-offs

- **[Risk]** Every `@Roles(...)`-guarded backend request now does one extra DB round trip. → **Mitigation**: this is the same cost `CatalogoAccessService`-gated routes already pay per request; Prisma's connection pool absorbs it at this app's scale. Revisit with real profiling data if it ever becomes a bottleneck (see D2).
- **[Risk]** A user with a valid Auth0 session but no local `usuario` row (e.g., mid-provisioning between the Auth0 account being created and the local insert completing) now gets a hard 403/404 everywhere instead of silently falling through. → **Mitigation**: this is the intended fix, not a regression — `POST /admin/users` already creates the Auth0 account and the local row as a single flow (`add-backoffice` spec), so the failure window is the same one that already existed; it's now surfaced instead of hidden.
- **[Risk]** The frontend's role now depends on an additional network round trip before `RoleGuard`/`Home()` can make a routing decision. → **Mitigation**: `isLoading` already gates rendering in `ProtectedRoute`; this only extends what it waits for, it doesn't introduce a new loading state consumers have to handle.
- **[Risk]** Existing tests that mock the Auth0 JWT payload directly, or stub `useAuth()`'s Auth0 dependency without a `/auth/me` mock, will break since role now comes from a different code path. → **Mitigation**: tracked as implementation tasks — update `RolesGuard` unit tests to mock `PrismaService`, and update frontend tests that exercise `useAuth()` to also mock the `/auth/me` fetch.

## Migration Plan

- No database schema changes; no data migration.
- Deploy order is not strict: `GET /auth/me`'s response shape (`{ id, email, rol }`) is unchanged, only the source of the `rol` value changes, so deploying the backend first does not break the current frontend (which would just start seeing the up-to-date DB role slightly before the frontend change ships). Deploying frontend-first would briefly leave `RoleGuard` calling the old JWT-based `/auth/me`... which doesn't exist (frontend calls a hook, not directly the old logic) — in practice, ship both together in the same release to avoid any transitional window.
- Rollback: revert both the backend and frontend commits together; no data to unwind.

## Open Questions

- The two accounts found drifted during `add-design-system` verification (`suriel.hilario@gmail.com`: JWT admin / DB director; `test@gmail.com`: JWT coordinador / DB entrenador with no `categoria_asignada`) will keep behaving exactly as their **DB** row says once this ships. Is that the desired end-state for those two specific accounts, or do they need a manual DB correction as a follow-up? (Operational question, not a spec requirement — flagging so it doesn't get lost.)
