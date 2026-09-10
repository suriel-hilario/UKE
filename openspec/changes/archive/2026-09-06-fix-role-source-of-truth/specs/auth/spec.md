## MODIFIED Requirements

### Requirement: Control de acceso por rol (backend)
El sistema SHALL exponer un decorador `@Roles(...)` que, aplicado a un endpoint, exige que el rol del usuario autenticado esté en la lista indicada; en caso contrario responde 403. El rol SHALL resolverse buscando el `usuario` local por `auth0_id` (el `sub` del JWT) y leyendo su campo `rol` en BD — no el claim del JWT — con el mismo patrón que usa `CatalogoAccessService.resolveUsuario` (`design.md` § D1). Si no existe una fila `usuario` local para el `auth0_id` autenticado, el sistema SHALL responder 403. Los roles válidos son `admin`, `director`, `coordinador`, `entrenador` (`99-decisiones.md` § G-B1, matriz de permisos; § G-A1).

#### Scenario: Rol de BD no está en la lista permitida
- **WHEN** un cliente con JWT válido cuyo `usuario` local tiene `rol: 'entrenador'` hace un request a un endpoint marcado `@Roles('admin')`
- **THEN** el sistema responde 403

#### Scenario: Rol de BD está en la lista permitida
- **WHEN** un cliente con JWT válido cuyo `usuario` local tiene `rol: 'admin'` hace un request a un endpoint marcado `@Roles('admin')`
- **THEN** el sistema procesa el request normalmente

#### Scenario: JWT sin fila usuario local correspondiente
- **WHEN** un cliente con JWT válido pero sin ninguna fila `usuario` local con ese `auth0_id` hace un request a un endpoint marcado `@Roles(...)` (cualquier rol)
- **THEN** el sistema responde 403

#### Scenario: Rol de BD desactualizado respecto al claim del JWT
- **WHEN** el claim de rol del JWT de un usuario dice `admin` pero su fila `usuario` local tiene `rol: 'director'`, y hace un request a un endpoint marcado `@Roles('admin')`
- **THEN** el sistema responde 403, reflejando el rol de BD y no el del JWT

### Requirement: Endpoint de identidad del usuario autenticado
El sistema SHALL exponer `GET /auth/me`, que devuelve `{ id, email, rol }` donde `rol` SHALL resolverse desde el campo `rol` del `usuario` local (buscado por `auth0_id` = `sub` del JWT), no desde los claims del JWT (`design.md` § D1, D3). Si no existe una fila `usuario` local para el `auth0_id` autenticado, el sistema SHALL responder 404 en vez de devolver `rol` indefinido. El campo `equipos` no se incluye en esta fase (se resuelve desde BD en un change posterior) (`99-decisiones.md` § D; `project.md` § Roles).

#### Scenario: Usuario autenticado consulta su identidad
- **WHEN** un cliente con JWT válido y una fila `usuario` local correspondiente hace `GET /auth/me`
- **THEN** el sistema responde 200 con `{ id, email, rol }`, donde `rol` es el valor actual de `usuario.rol` en BD

#### Scenario: Cliente sin JWT consulta /auth/me
- **WHEN** un cliente sin cabecera `Authorization` hace `GET /auth/me`
- **THEN** el sistema responde 401

#### Scenario: JWT válido sin fila usuario local
- **WHEN** un cliente con JWT válido pero sin ninguna fila `usuario` local con ese `auth0_id` hace `GET /auth/me`
- **THEN** el sistema responde 404 en vez de 200 con un `rol` indefinido

#### Scenario: Rol de BD refleja un cambio reciente del backoffice
- **WHEN** un admin cambia el `rol` de un usuario vía `PATCH /admin/users/:id` y ese usuario, sin volver a iniciar sesión, hace `GET /auth/me`
- **THEN** el sistema responde con el `rol` actualizado, no con el que tenía el JWT al emitirse

### Requirement: Hook de estado de autenticación (frontend)
El sistema SHALL exponer un hook `useAuth()` que expone `isAuthenticated`, `isLoading`, `user` (`id`, `email`, `rol`), `login()` y `logout()`, respaldado por `Auth0Provider` configurado con `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID` y `VITE_AUTH0_AUDIENCE` (`project.md` § Autenticación). El campo `rol` de `user` SHALL obtenerse de `GET /auth/me` (backend, respaldado por BD), no decodificándolo directamente del JWT/objeto `user` del SDK de Auth0 (`design.md` § D4). `isLoading` SHALL permanecer `true` hasta que tanto la sesión de Auth0 como la petición a `GET /auth/me` hayan resuelto.

#### Scenario: Consumo del hook durante la carga inicial de sesión
- **WHEN** la aplicación arranca y Auth0 todavía está resolviendo la sesión
- **THEN** `useAuth()` expone `isLoading: true` y `isAuthenticated: false`

#### Scenario: Consumo del hook mientras se resuelve /auth/me
- **WHEN** Auth0 ya resolvió la sesión pero la petición a `GET /auth/me` todavía está en curso
- **THEN** `useAuth()` expone `isLoading: true`

#### Scenario: Consumo del hook con sesión y rol resueltos
- **WHEN** Auth0 termina de resolver la sesión y `GET /auth/me` responde con éxito
- **THEN** `useAuth()` expone `isLoading: false`, `isAuthenticated: true` y `user` con `id`, `email` y `rol` tomado de la respuesta de `GET /auth/me`

#### Scenario: Rol reflejado sin volver a iniciar sesión
- **WHEN** el rol de un usuario cambia en BD mientras su JWT sigue siendo válido, y la aplicación vuelve a montar `useAuth()` (p.ej. recarga de página)
- **THEN** `user.rol` refleja el rol actual de BD, no el que tenía el JWT al emitirse
