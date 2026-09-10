## 1. Backend: dependencias y configuración

- [x] 1.1 Añadir `@nestjs/passport`, `passport`, `passport-jwt`, `jwks-rsa` (y tipos) a `apps/api/package.json`
- [x] 1.2 Añadir `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ROLE_CLAIM` a `.env.example` y a la config de `docker-compose.yml` del servicio `api`
- [x] 1.3 Crear módulo de configuración tipado (validación de las 3 env vars al arrancar, falla rápido si falta alguna)

## 2. Backend: módulo Auth0 y guards

- [x] 2.1 Crear `AuthModule` con `JwtStrategy` (passport-jwt + jwks-rsa) validando firma RS256, `audience` y `issuer` contra `AUTH0_DOMAIN`/`AUTH0_AUDIENCE`
- [x] 2.2 Crear decorador `@Public()` (metadata via `SetMetadata` + `Reflector`)
- [x] 2.3 Crear `JwtAuthGuard` global (registrado como `APP_GUARD`) que respeta `@Public()` y responde 401 si no hay JWT válido
- [x] 2.4 Crear decorador `@Roles(...roles)` (metadata via `SetMetadata`)
- [x] 2.5 Crear `RolesGuard` que lee `payload[AUTH0_ROLE_CLAIM]`, lo compara contra `@Roles(...)` del handler, y responde 403 si no coincide o el claim no existe
- [x] 2.6 Registrar `RolesGuard` como `APP_GUARD` (después de `JwtAuthGuard` en el orden de ejecución)

## 3. Backend: endpoint /auth/me

- [x] 3.1 Marcar `/health` con `@Public()`
- [x] 3.2 Crear `AuthController` con `GET /auth/me` (sin `@Public()`; el guard global ya exige JWT válido y responde 401 automáticamente)
- [x] 3.3 Mapear `id`, `email`, `rol` desde los claims del JWT (`payload.sub`, `payload.email`, `payload[AUTH0_ROLE_CLAIM]`) a la respuesta de `/auth/me`

## 4. Backend: tests

- [x] 4.1 Test e2e: request sin token a endpoint protegido → 401
- [x] 4.2 Test e2e: request con JWT inválido/expirado → 401
- [x] 4.3 Test e2e: `GET /health` sin token → 200
- [x] 4.4 Test e2e: request con rol no permitido a endpoint `@Roles(...)` → 403
- [x] 4.5 Test e2e: request con rol permitido → 200
- [x] 4.6 Test e2e: `GET /auth/me` con JWT válido → 200 con `{ id, email, rol }`
- [x] 4.7 Test e2e: `GET /auth/me` sin JWT → 401

## 5. Frontend: dependencias y configuración

- [x] 5.1 Añadir `@auth0/auth0-react` a `apps/web/package.json`
- [x] 5.2 Añadir `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` a `.env.example` y a la config de `docker-compose.yml` del servicio `web`

## 6. Frontend: provider, hook y guards

- [x] 6.1 Envolver la app en `Auth0Provider` (domain, clientId, audience desde env, `redirect_uri` a la ruta post-login)
- [x] 6.2 Crear hook `useAuth()` que envuelve `useAuth0` y expone `isAuthenticated`, `isLoading`, `user` (`id`, `email`, `rol` extraídos del token), `login()`, `logout()`
- [x] 6.3 Crear componente `ProtectedRoute` (usa `useAuth()`; redirige a `login()` si no autenticado; renderiza `children` si autenticado)
- [x] 6.4 Crear componente `RoleGuard` (prop `roles=[...]`; muestra pantalla "Sin permiso / Baimenik ez" si el rol no está en la lista; renderiza `children` si sí)

## 7. Frontend: pantalla de verificación

- [x] 7.1 Crear pantalla post-login con "Hola \<nombre\>" (desde `user`) y botón "Salir" que invoca `logout()`
- [x] 7.2 Envolver la pantalla post-login en `ProtectedRoute`

## 8. Frontend: tests

- [x] 8.1 Test: `ProtectedRoute` redirige a login cuando `isAuthenticated: false`
- [x] 8.2 Test: `ProtectedRoute` renderiza `children` cuando `isAuthenticated: true`
- [x] 8.3 Test: `RoleGuard` muestra "Sin permiso / Baimenik ez" cuando el rol no está permitido
- [x] 8.4 Test: `RoleGuard` renderiza `children` cuando el rol está permitido
- [x] 8.5 Test: pantalla post-login muestra el nombre del usuario y el botón "Salir" invoca `logout()`

## 9. Verificación end-to-end manual

- [x] 9.1 Configurar Auth0 Action en el tenant de desarrollo (claim `https://uke.local/rol`, y posteriormente `email`) — prerrequisito operativo fuera del repo
- [x] 9.2 Levantar `docker compose up` con las env vars nuevas configuradas
- [x] 9.3 Verificar login completo: redirect a Auth0, vuelta a la app, pantalla "Hola \<nombre\>"
- [x] 9.4 Verificar `curl` a un endpoint protegido sin token → 401, y con token válido → 200
- [x] 9.5 Verificar acceso denegado por rol ("Sin permiso / Baimenik ez") en frontend con un usuario cuyo rol no está en la lista permitida
- [x] 9.6 Verificar `GET /auth/me` devuelve `{ id, email, rol }` correctos tras login
