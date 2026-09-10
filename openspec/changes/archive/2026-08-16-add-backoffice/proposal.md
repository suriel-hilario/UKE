## Why

`add-auth` resuelve identidad y roles, `add-data-model` deja el schema Prisma listo, pero no existe ningún punto de gestión: nadie puede dar de alta usuarios (autoregistro está desactivado, `99-decisiones.md` § G-B2) ni configurar temporadas/equipos/festivos, que son prerrequisito de catálogo único para todos los módulos deportivos (`99-decisiones.md` § G-C1). Es el cuarto change de la secuencia prevista (`project.md` § Secuencia de changes prevista, punto 4).

## What Changes

Backend (`apps/api`):
- Módulo de Auth0 Management API: token M2M vía client credentials (`AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`, `AUTH0_M2M_AUDIENCE`). Todo alta/baja/edición de usuario pasa por este cliente — nunca se escribe `auth0_id` a mano (`99-decisiones.md` § G-B2, § D: "usuarios creados desde backoffice vía Management API").
- Endpoints de usuarios (todos `@Roles('admin')`, guard ya existente de `add-auth`):
  - `GET /admin/users` — lista desde BD local.
  - `POST /admin/users` — crea cuenta en Auth0 vía Management API, luego crea `usuario` en BD con el `auth0_id` devuelto (`98-modelo-datos.md` § usuario).
  - `PATCH /admin/users/:id` — actualiza `nombre_visible`, `rol`, `categoria_asignada`, `equipo_ids` (N:M vía `usuario_equipo`, `98-modelo-datos.md` § usuario_equipo; G-A8); sincroniza email/nombre en Auth0 si cambian.
  - `DELETE /admin/users/:id` — bloquea en Auth0 (`blocked: true`); NO borra la fila local (preserva histórico, coherente con `99-decisiones.md` § G-A7 sobre no destruir datos).
  - `POST /admin/users/:id/reset-password` — dispara email de reset estándar de Auth0 (`project.md` § Autenticación: "Reset de contraseña = flujo estándar Auth0").
- Endpoints de catálogo (todos `@Roles('admin')`):
  - `temporadas` (GET/POST/PATCH) y `temporadas/:id/bloques` (GET/POST/PATCH) — `98-modelo-datos.md` § temporada, § bloque; G-A3.
  - `temporadas/:id/close` — `estado = cerrada`, irreversible (`99-decisiones.md` § G-A7: todos los datos de la temporada pasan a solo lectura).
  - `equipos` (GET/POST/PATCH/DELETE) — `98-modelo-datos.md` § equipo; G-C1, G-C6, G-C7.
  - `temporadas/:id/festivos` (GET/POST/DELETE) — `98-modelo-datos.md` § festivo (`temporada_id` FK, no `equipo_id`); G-C11.
  - `equipos/:id/miembros` (GET/POST/PATCH/DELETE) — gestiona `miembro_equipo`; `fecha_incorporacion` obligatoria (G-A4), `PATCH` soporta `fecha_baja` (`98-modelo-datos.md` § D2).
- Import de jugadores desde Excel (`99-decisiones.md` § G-A2): `POST /admin/equipos/:id/import-jugadores`, `multipart/form-data` (`.xlsx`/`.xls`), columnas `nombre`/`alias?`/`fecha_incorporacion`; primera llamada devuelve preview `{ valid, errors }` sin persistir; segunda llamada con `?confirm=true` persiste. Usa `exceljs` (vendor-agnostic, sin dependencias nativas — `project.md` § Infraestructura).

Frontend (`apps/web`):
- Ruta `/admin` protegida por `ProtectedRoute` + `RoleGuard roles={['admin']}` (componentes ya existentes de `add-auth`).
- Navegación lateral: Usuarios / Temporadas / Equipos.
- Página de usuarios: tabla + modales de Crear/Editar/Reset password/Deshabilitar.
- Página de temporadas: badge de estado, formulario, botón "Cerrar temporada" con confirmación (advertencia de irreversibilidad); bloques anidados por temporada.
- Página de equipos: filtrada por temporada, formulario completo, festivos anidados, tabla de miembros con `fecha_incorporacion`/`fecha_baja`/`grupo`/`orden` (reordenable).
- Importación Excel: selector de archivo, tabla de preview (filas válidas/con error), botón de confirmación.
- Literales EU/ES en toda la UI (`99-decisiones.md` § G-C5, euskera por defecto).
- Layout mobile-first (`project.md` § Stack técnico, Frontend).

- PATCH /admin/users/:id replaces the full set of usuario_equipo rows for that user
  (delete existing + insert new). Semantically a PUT on the relationship.
  Source: 99-decisiones.md § G-A8 (N:M); decision taken in proposal, not deferred.

- Excel import accepts exactly these columns (case-insensitive header match, EU or ES):
  nombre / izena (required), alias (optional), fecha_incorporacion / sarrera_data
  (required, accepts ISO YYYY-MM-DD or DD/MM/YYYY). Extra columns are ignored.
  Source: 99-decisiones.md § G-A2; inventario 01 § miembro_equipo.

- Import preview error format: { row: number, field: string, message: string }.
  Top-level response: { valid: MiembroPreview[], errors: ImportError[] }.
  Source: proposal scope (G-A2); no further specification needed.

## Capabilities

### New Capabilities
- `backoffice`: gestión de usuarios (Auth0 Management API + BD local) y gestión de catálogo (temporadas, bloques, equipos, festivos, miembros, import Excel), backend + frontend, solo rol `admin`.

### Modified Capabilities
(ninguna — `auth` y `data-model` no cambian sus requirements; este change los consume tal como están)

## Impact

- **apps/api**: nuevo módulo `admin` (o `backoffice`) con sub-recursos usuarios/temporadas/bloques/equipos/festivos/miembros/import; nuevo cliente Auth0 Management API; nueva dependencia `exceljs`; nuevas variables de entorno `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`, `AUTH0_M2M_AUDIENCE`.
- **apps/web**: nueva ruta `/admin` con sub-páginas, nuevos componentes de tabla/modal/formulario, nueva llamada a la API del backoffice.
- **BD**: ningún cambio de schema — usa los modelos ya migrados en `add-data-model` tal cual.
- **Fuera de alcance** (explícito): módulos deportivos (asistencia, minutaje); notificaciones; acceso de lectura para roles no-admin (eso es `add-catalogo-equipos`, siguiente en la secuencia).