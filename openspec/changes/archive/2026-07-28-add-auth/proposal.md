## Why

La app no tiene autenticación ni control de acceso. Antes de construir cualquier módulo funcional (backoffice, módulos deportivos), hace falta el mecanismo de identidad y roles del que todo lo demás depende: Auth0 en frontend y backend, con JWT validado y roles aplicados a nivel de guard (`project.md` § Autenticación y Roles; `99-decisiones.md` § G-B2). Es el segundo change de la secuencia prevista, justo después de `add-infrastructure` (`project.md` § Secuencia de changes prevista).

## What Changes

Backend (`apps/api`):
- Módulo Auth0: validación de JWT RS256 con audience e issuer desde variables de entorno (`project.md` § Autenticación).
- Guard global que rechaza cualquier request sin JWT válido con 401 (`project.md` § Autenticación).
- Decorador `@Roles(...)` + guard de rol que lee el claim `https://uke.local/rol` del JWT (via `AUTH0_ROLE_CLAIM=https://uke.local/rol`) y rechaza con 403 si no coincide (`project.md` § Roles; `99-decisiones.md` § G-B1, matriz de permisos).
- Decorador `@Public()` para marcar endpoints sin autenticación — en esta fase solo `/health` y `/auth/me`.
- Endpoint `GET /auth/me`: devuelve `{ id, email, rol }` leídos del JWT. `equipos` no se incluye en este change — se resolverá desde BD en `add-backoffice` cuando exista `usuario_equipo`. (`99-decisiones.md` § D; `project.md` § Roles).
- Variables de entorno requeridas: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ROLE_CLAIM=https://uke.local/rol`.

Frontend (`apps/web`):
- `Auth0Provider` configurado con `domain` y `clientId` desde variables de entorno (`project.md` § Autenticación).
- Hook `useAuth()`: expone `isAuthenticated`, `isLoading`, `user` (`id`, `email`, `rol`), `login()`, `logout()`. `equipos` se añadirá en `add-backoffice`.
- Componente `ProtectedRoute`: si no autenticado, redirige al login universal de Auth0; si autenticado, renderiza children (`project.md` § Autenticación, "Autoregistro DESACTIVADO").
- Componente `RoleGuard`: recibe `roles=[...]`; si el rol del usuario no está en la lista, muestra pantalla "Sin permiso / Baimenik ez" sin redirigir (`99-decisiones.md` § G-B1; § G-C5 bilingüe EU/ES).
- Pantalla post-login: "Hola \<nombre\>" + botón Salir, solo para verificar el flujo en esta fase (smoke test).
- Variables de entorno requeridas: `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE`.

## Capabilities

### New Capabilities
- `auth`: autenticación Auth0 end-to-end (JWT RS256 en backend, guards, `/auth/me`; provider, hook, `ProtectedRoute`, `RoleGuard` en frontend).

### Modified Capabilities
(ninguna — no existen specs previas de autenticación)

## Impact

- **apps/api**: nuevo módulo `auth` (guard global, guard de rol, decoradores, controller `/auth/me`), nuevas dependencias de validación JWT RS256 (JWKS de Auth0).
- **apps/web**: nueva dependencia de Auth0 SDK, nuevo provider en el árbol de la app, nuevos componentes `ProtectedRoute`/`RoleGuard`, nuevo hook `useAuth`.
- **Infra**: nuevas variables de entorno en `docker-compose.yml` / `.env`: `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ROLE_CLAIM=https://uke.local/rol` (api); `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` (web).
- **Fuera de alcance** (explícito): pantallas funcionales de negocio; llamadas a Auth0 Management API (`add-backoffice`); modelos de BD o Prisma (`add-data-model`); claim `equipos` en JWT y su resolución desde BD (`add-backoffice`).