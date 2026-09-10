## ADDED Requirements

### Requirement: Autenticación obligatoria por defecto (backend)
El sistema SHALL rechazar con 401 cualquier request a `apps/api` que no incluya un JWT válido (firma RS256 verificada contra el JWKS de `AUTH0_DOMAIN`, `audience` = `AUTH0_AUDIENCE`), salvo los endpoints marcados explícitamente con `@Public()` (`project.md` § Autenticación; `99-decisiones.md` § G-B2).

#### Scenario: Request sin token a un endpoint protegido
- **WHEN** un cliente hace un request a un endpoint no marcado `@Public()` sin cabecera `Authorization`
- **THEN** el sistema responde 401

#### Scenario: Request con JWT inválido o expirado
- **WHEN** un cliente hace un request con un JWT cuya firma no valida, cuyo `audience`/`issuer` no coincide, o que está expirado
- **THEN** el sistema responde 401

#### Scenario: Request con JWT válido a endpoint protegido
- **WHEN** un cliente hace un request con un JWT válido (firma, audience e issuer correctos, no expirado)
- **THEN** el sistema procesa el request normalmente

### Requirement: Endpoints públicos explícitos
El sistema SHALL exponer un decorador `@Public()` que exime a un endpoint del guard de autenticación global. En esta fase solo `/health` está marcado como público; `/auth/me` exige JWT válido a través del guard global normal (project.md § Autenticación).

#### Scenario: Health check accesible sin token
- **WHEN** un cliente hace `GET /health` sin cabecera `Authorization`
- **THEN** el sistema responde 200 sin exigir JWT

### Requirement: Control de acceso por rol (backend)
El sistema SHALL exponer un decorador `@Roles(...)` que, aplicado a un endpoint, exige que el JWT contenga en el claim `AUTH0_ROLE_CLAIM` (`https://uke.local/rol`) uno de los roles listados; en caso contrario responde 403. Los roles válidos son `admin`, `director`, `coordinador`, `entrenador` (`99-decisiones.md` § G-B1, matriz de permisos; § G-A1).

#### Scenario: Rol del JWT no está en la lista permitida
- **WHEN** un cliente con JWT válido y rol `entrenador` hace un request a un endpoint marcado `@Roles('admin')`
- **THEN** el sistema responde 403

#### Scenario: Rol del JWT está en la lista permitida
- **WHEN** un cliente con JWT válido y rol `admin` hace un request a un endpoint marcado `@Roles('admin')`
- **THEN** el sistema procesa el request normalmente

#### Scenario: JWT sin claim de rol
- **WHEN** un cliente con JWT válido pero sin el claim `AUTH0_ROLE_CLAIM` hace un request a un endpoint marcado `@Roles(...)` (cualquier rol)
- **THEN** el sistema responde 403

### Requirement: Endpoint de identidad del usuario autenticado
El sistema SHALL exponer `GET /auth/me`, que devuelve `{ id, email, rol }` extraídos directamente de los claims del JWT válido del request. El campo `equipos` no se incluye en esta fase (se resuelve desde BD en un change posterior) (`99-decisiones.md` § D; `project.md` § Roles).

#### Scenario: Usuario autenticado consulta su identidad
- **WHEN** un cliente con JWT válido hace `GET /auth/me`
- **THEN** el sistema responde 200 con `{ id, email, rol }` correspondientes a los claims del token

#### Scenario: Cliente sin JWT consulta /auth/me
- **WHEN** un cliente sin cabecera `Authorization` hace `GET /auth/me`
- **THEN** el sistema responde 401

### Requirement: Acceso protegido por sesión Auth0 (frontend)
El sistema SHALL envolver las rutas de la aplicación en un `ProtectedRoute` que, si no hay sesión Auth0 activa, redirige al login universal de Auth0; si hay sesión activa, renderiza el contenido protegido. No existe ningún flujo de login alternativo ni autoregistro (`project.md` § Autenticación, "Autoregistro DESACTIVADO"; `99-decisiones.md` § G-B2).

#### Scenario: Usuario no autenticado accede a una ruta protegida
- **WHEN** un usuario sin sesión activa navega a una ruta envuelta en `ProtectedRoute`
- **THEN** la aplicación redirige al login universal de Auth0

#### Scenario: Usuario autenticado accede a una ruta protegida
- **WHEN** un usuario con sesión activa navega a una ruta envuelta en `ProtectedRoute`
- **THEN** la aplicación renderiza el contenido de la ruta

### Requirement: Restricción de UI por rol (frontend)
El sistema SHALL exponer un componente `RoleGuard` que recibe una lista `roles=[...]`; si el rol del usuario autenticado no está en la lista, muestra una pantalla "Sin permiso / Baimenik ez" en lugar del contenido, sin redirigir al login (`99-decisiones.md` § G-B1, matriz de permisos; § G-C5, literales bilingües EU/ES).

#### Scenario: Usuario autenticado sin el rol requerido
- **WHEN** un usuario autenticado con rol `entrenador` accede a contenido envuelto en `RoleGuard roles={['admin']}`
- **THEN** la aplicación muestra la pantalla "Sin permiso / Baimenik ez" y no renderiza el contenido protegido

#### Scenario: Usuario autenticado con el rol requerido
- **WHEN** un usuario autenticado con rol `admin` accede a contenido envuelto en `RoleGuard roles={['admin']}`
- **THEN** la aplicación renderiza el contenido protegido

### Requirement: Hook de estado de autenticación (frontend)
El sistema SHALL exponer un hook `useAuth()` que expone `isAuthenticated`, `isLoading`, `user` (`id`, `email`, `rol`), `login()` y `logout()`, respaldado por `Auth0Provider` configurado con `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` y `VITE_AUTH0_AUDIENCE` (`project.md` § Autenticación).

#### Scenario: Consumo del hook durante la carga inicial de sesión
- **WHEN** la aplicación arranca y Auth0 todavía está resolviendo la sesión
- **THEN** `useAuth()` expone `isLoading: true` y `isAuthenticated: false`

#### Scenario: Consumo del hook con sesión resuelta
- **WHEN** Auth0 termina de resolver la sesión y el usuario está autenticado
- **THEN** `useAuth()` expone `isLoading: false`, `isAuthenticated: true` y `user` con `id`, `email` y `rol` del token

### Requirement: Pantalla de verificación post-login
El sistema SHALL mostrar, tras un login exitoso, una pantalla mínima con el saludo "Hola \<nombre\>" (usando el nombre del usuario autenticado) y un botón "Salir" que invoca `logout()`. Esta pantalla es únicamente para verificar el flujo end-to-end en esta fase y no contiene funcionalidad de negocio (alcance definido en el proposal de este change).

#### Scenario: Usuario autenticado ve la pantalla de verificación
- **WHEN** un usuario completa el login universal de Auth0 y vuelve a la aplicación
- **THEN** la aplicación muestra "Hola \<nombre\>" con el nombre del usuario y un botón "Salir"

#### Scenario: Usuario cierra sesión desde la pantalla de verificación
- **WHEN** un usuario autenticado pulsa el botón "Salir"
- **THEN** la aplicación invoca `logout()` y el usuario deja de tener sesión activa
