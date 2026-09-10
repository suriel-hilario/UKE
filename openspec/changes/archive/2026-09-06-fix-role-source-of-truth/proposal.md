## Why

The system currently has three independent sources of truth for a user's `rol`, and they can drift: the Auth0 JWT claim (set at login time), the local `usuario.rol` in Postgres (editable anytime via the backoffice), and — for scope resolution only — `CatalogoAccessService`, which already reads the DB. In practice this means an admin changing a user's role in the backoffice has no effect until that user logs out and back in, and in the meantime the frontend (JWT-based `useAuth()`) and the `/admin/*` backend guard (JWT-based `RolesGuard`) show/enforce a stale role while `CatalogoAccessService`-gated endpoints (`/catalogo`, `/equipos`, `/panel`) already enforce the current one. This was found while live-verifying `add-design-system`: two real accounts had JWT role ≠ DB role, causing one admin to be silently routed away from a screen and one coordinador to see zero teams.

## What Changes

- `GET /auth/me` (backend) SHALL resolve `rol` from the local `usuario` row (looked up by the JWT's `sub` as `auth0_id`), not from the JWT claim. If no local `usuario` row exists for an authenticated Auth0 identity, it SHALL respond with a clear error instead of a silently undefined role.
- `RolesGuard` (backend, gates all `@Roles(...)` endpoints including `/admin/*`) SHALL resolve the caller's role the same way — DB lookup by `auth0_id` — instead of reading the JWT claim, making it consistent with `CatalogoAccessService`. A caller authenticated with Auth0 but with no local `usuario` row SHALL be denied (403), matching existing behavior for a missing/invalid role.
- `useAuth()` (frontend) SHALL source `user.rol` from `GET /auth/me` instead of decoding it from the Auth0 SPA's JWT/user object. `isLoading` SHALL remain `true` until both the Auth0 SDK and the `/auth/me` call resolve, since `RoleGuard` and `Home()` depend on `user.rol` being the current, authoritative value.
- The Auth0 JWT role claim (`AUTH0_ROLE_CLAIM`) remains the mechanism that gets a role into the system at login/token-issuance time (unchanged); this change only stops the app from *trusting* that claim as current for authorization decisions, in favor of the mutable DB row.

## Capabilities

### New Capabilities
_None._

### Modified Capabilities
- `auth`: three requirements change behavior —
  - "Control de acceso por rol (backend)": `RolesGuard` now resolves role from DB, not JWT claim; denies when no local `usuario` row exists.
  - "Endpoint de identidad del usuario autenticado": `GET /auth/me` now resolves `rol` from DB, not JWT claim; responds with an error when no local `usuario` row exists for the authenticated identity.
  - "Hook de estado de autenticación (frontend)": `useAuth()` now sources `user.rol` from `GET /auth/me`, not from the Auth0 JWT/user object; `isLoading` accounts for that additional fetch.

## Impact

- **Affected code**: `apps/api/src/auth/roles.guard.ts`, `apps/api/src/auth/auth.controller.ts`, `apps/web/src/auth/useAuth.ts`, and any test doubles/mocks that currently stub `useAuth()` or the JWT payload directly for role-based tests.
- **Performance**: `RolesGuard` now does one DB lookup per request to a `@Roles(...)`-guarded endpoint (same cost `CatalogoAccessService` already pays on every catalogo/equipos/panel request — no new pattern introduced).
- **No Auth0 tenant changes**: the JWT claim and Auth0 Action stay as-is; this is purely about which source the backend/frontend trust for authorization after the token is issued.
- **Risk**: a user with a valid Auth0 session but no local `usuario` row (e.g., mid-provisioning) now gets a hard error/403 on every guarded endpoint and on `/auth/me`, instead of silently proceeding with an undefined role. This is the intended fix (per the proposal's own reasoning) but is a behavior change worth calling out.
