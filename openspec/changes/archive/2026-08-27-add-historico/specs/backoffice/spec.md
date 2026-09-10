## MODIFIED Requirements

### Requirement: Todos los endpoints de backoffice exigen rol admin
Todo endpoint bajo `/admin/*` SHALL estar marcado `@Roles('admin')`, apoyándose en el guard global de `add-auth` (401 sin JWT, 403 con JWT de otro rol) (proposal; `99-decisiones.md` § G-B1, matriz de permisos), **con la única excepción de `GET /admin/historico`**, que vive en un controller separado con `@Roles('admin', 'director')` propio (`99-decisiones.md` § G-A7: "accesible para admin y director"; `add-historico` `design.md` § D1).

#### Scenario: Usuario con rol distinto de admin accede a /admin/*
- **WHEN** un cliente con JWT válido y rol `coordinador` o `entrenador` hace un request a cualquier endpoint `/admin/*`
- **THEN** el sistema responde 403

#### Scenario: Usuario admin accede a /admin/*
- **WHEN** un cliente con JWT válido y rol `admin` hace un request a un endpoint `/admin/*`
- **THEN** el sistema procesa el request normalmente

#### Scenario: Director accede a /admin/historico pero no al resto de /admin/*
- **WHEN** un cliente con JWT válido y rol `director` hace `GET /admin/historico`, y por separado un request a cualquier otro endpoint `/admin/*`
- **THEN** el primer request se procesa normalmente y el segundo responde 403

### Requirement: Ruta /admin protegida por autenticación y rol
El frontend SHALL envolver la ruta `/admin` en `ProtectedRoute` y `RoleGuard roles={['admin', 'director']}` (componentes ya existentes de `add-auth`); cada ruta hija existente (`usuarios`, `temporadas`, `equipos`) SHALL envolverse además, individualmente, en su propio `RoleGuard roles={['admin']}`, de forma que su acceso neto siga restringido a `admin`; la ruta nueva `historico` no lleva guard adicional, quedando accesible a `admin` y `director` (proposal; `99-decisiones.md` § G-A7; `add-historico` `design.md` § D4).

#### Scenario: Usuario sin rol admin ni director accede a /admin
- **WHEN** un usuario autenticado con rol `coordinador` o `entrenador` navega a `/admin`
- **THEN** la aplicación muestra la pantalla "Sin permiso / Baimenik ez"

#### Scenario: Usuario admin accede a /admin
- **WHEN** un usuario autenticado con rol `admin` navega a `/admin`
- **THEN** la aplicación renderiza la navegación de backoffice (Usuarios / Temporadas / Equipos / Histórico)

#### Scenario: Usuario director accede a /admin/historico
- **WHEN** un usuario autenticado con rol `director` navega a `/admin/historico`
- **THEN** la aplicación renderiza la página de histórico

#### Scenario: Usuario director bloqueado en las rutas admin-only de /admin
- **WHEN** un usuario autenticado con rol `director` navega a `/admin/usuarios`, `/admin/temporadas` o `/admin/equipos`
- **THEN** la aplicación muestra la pantalla "Sin permiso / Baimenik ez" para cada una

