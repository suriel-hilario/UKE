## 1. Backend: setup

- [x] 1.1 Añadir dependencias a `apps/api/package.json`: `auth0` (Management SDK), `exceljs`
- [x] 1.2 Añadir `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`, `AUTH0_M2M_AUDIENCE` a `.env.example` y a `docker-compose.yml` (servicio `api`)
- [x] 1.3 Extender la config tipada (`loadAuthConfig` o una nueva `loadManagementConfig`) para validar las 3 variables al arrancar, fail-fast si falta alguna

## 2. Backend: cliente Auth0 Management API

- [x] 2.1 Crear `AdminModule` con `ManagementService`, instanciando un único `ManagementClient` del SDK `auth0` a nivel de módulo
- [x] 2.2 `ManagementService.createUser(email, nombre)` — crea la cuenta en Auth0, devuelve `auth0_id`
- [x] 2.3 `ManagementService.updateUser(auth0Id, { email?, nombre? })` — sincroniza campos
- [x] 2.4 `ManagementService.blockUser(auth0Id)` — `blocked: true`
- [x] 2.5 `ManagementService.deleteUser(auth0Id)` — usado solo como compensación best-effort
- [x] 2.6 `ManagementService.triggerPasswordReset(email)` — `POST /dbconnections/change_password`

## 3. Backend: endpoints de usuarios

- [x] 3.1 `GET /admin/users` (`@Roles('admin')`) — lista desde Prisma, no desde Auth0
- [x] 3.2 `POST /admin/users` — crea en Auth0 primero; si falla, no toca BD; si la creación en Auth0 tiene éxito pero la inserción en BD falla, invoca `deleteUser` como compensación y loguea a nivel error si también falla
- [x] 3.3 `PATCH /admin/users/:id` — actualiza `nombre_visible`/`rol`/`categoria_asignada` en BD; si `email`/`nombre_visible` cambian, sincroniza en Auth0
- [x] 3.4 `PATCH /admin/users/:id` — `equipo_ids`: reemplazo completo de `usuario_equipo` (delete + insert transaccional)
- [x] 3.5 `DELETE /admin/users/:id` — bloquea en Auth0, no borra la fila local
- [x] 3.6 `POST /admin/users/:id/reset-password` — invoca `triggerPasswordReset`

## 4. Backend: temporadas y bloques

- [x] 4.1 `GET/POST/PATCH /admin/temporadas` (`@Roles('admin')`)
- [x] 4.2 `POST /admin/temporadas/:id/close` — `estado: cerrada`; responde error si ya está cerrada
- [x] 4.3 `GET/POST/PATCH /admin/temporadas/:id/bloques`
- [x] 4.4 `GET/POST/DELETE /admin/temporadas/:id/festivos`

## 5. Backend: equipos y miembros

- [x] 5.1 `GET/POST/PATCH/DELETE /admin/equipos` (`@Roles('admin')`)
- [x] 5.2 `DELETE /admin/equipos/:id` — capturar violación de FK (Prisma `P2003`/`P2014`) y responder 409 si el equipo tiene sesiones/miembros/jornadas asociadas
- [x] 5.3 `GET/POST/PATCH/DELETE /admin/equipos/:id/miembros` — `fecha_incorporacion` obligatoria en creación (validación 400 si falta)
- [x] 5.4 `PATCH /admin/equipos/:id/miembros/:miembroId` — soporta `fecha_baja` y `orden`

## 6. Backend: import de Excel

- [x] 6.1 `POST /admin/equipos/:id/import-jugadores` con `FileInterceptor` (multer en memoria) — parseo con `exceljs`, columnas `nombre`/`izena`, `alias`, `fecha_incorporacion`/`sarrera_data` (encabezado insensible a mayúsculas)
- [x] 6.2 Validación por fila: `nombre` y `fecha_incorporacion` obligatorias, fecha parseable en ISO o `DD/MM/YYYY`
- [x] 6.3 Sin `?confirm=true`: devolver `{ valid, errors }` sin persistir nada
- [x] 6.4 Con `?confirm=true`: re-parsear y re-validar el archivo recibido (sin estado de sesión entre llamadas) y persistir `persona`/`miembro_equipo` de las filas válidas

## 7. Backend: tests e2e

- [x] 7.1 Test: cualquier endpoint `/admin/*` sin rol admin → 403
- [x] 7.2 Test: `POST /admin/users` éxito → 201, usuario en BD con `auth0_id`
- [x] 7.3 Test: `POST /admin/users` con fallo simulado de Auth0 → no crea fila en BD
- [x] 7.4 Test: `PATCH /admin/users/:id` con `equipo_ids` → reemplazo completo verificado
- [x] 7.5 Test: `DELETE /admin/users/:id` → usuario sigue en BD, bloqueado en Auth0 (mock)
- [x] 7.6 Test: `POST /admin/temporadas/:id/close` sobre temporada ya cerrada → error
- [x] 7.7 Test: `DELETE /admin/equipos/:id` con miembros asociados → 409
- [x] 7.8 Test: `POST /admin/equipos/:id/miembros` sin `fecha_incorporacion` → 400
- [x] 7.9 Test: import preview con fila válida + fila con error → `valid`/`errors` correctos, sin persistir
- [x] 7.10 Test: import confirm → filas persistidas correctamente

## 8. Frontend: setup y ruta /admin

- [x] 8.1 Crear ruta `/admin` (routing mínimo si no existe ya un router — decidir enfoque consistente con `App.tsx` actual)
- [x] 8.2 Envolver `/admin` en `ProtectedRoute` + `RoleGuard roles={['admin']}` (reutilizar de `add-auth`, sin modificarlos)
- [x] 8.3 Layout de navegación lateral (Usuarios / Temporadas / Equipos)

## 9. Frontend: página de usuarios

- [x] 9.1 Tabla de usuarios (`nombre_visible`, `email`, `rol`, `categoria_asignada`/equipos)
- [x] 9.2 Modal de creación (llama `POST /admin/users`)
- [x] 9.3 Modal de edición (llama `PATCH /admin/users/:id`, incluye selector de `equipo_ids`)
- [x] 9.4 Acción de reset password (llama `POST /admin/users/:id/reset-password`)
- [x] 9.5 Acción de deshabilitar (llama `DELETE /admin/users/:id`, confirmación antes de ejecutar)

## 10. Frontend: página de temporadas

- [x] 10.1 Lista de temporadas con badge de `estado`
- [x] 10.2 Formulario de creación/edición
- [x] 10.3 Bloques anidados por temporada (lista + formulario)
- [x] 10.4 Botón "Cerrar temporada" con diálogo de confirmación (advertencia de irreversibilidad)
- [x] 10.5 Festivos anidados por temporada (lista + alta/baja)

## 11. Frontend: página de equipos

- [x] 11.1 Lista de equipos filtrada por temporada seleccionada
- [x] 11.2 Formulario de creación/edición (`categoria`, `color`, `icono`, `minutos_por_periodo`, `num_periodos`, `dias_entrenamiento` como checkboxes Lun–Dom)
- [x] 11.3 Tabla de miembros (`fecha_incorporacion`/`fecha_baja`/`grupo`/`orden`) con reordenamiento drag & drop
- [x] 11.4 Alta/edición/baja de miembro individual

## 12. Frontend: import de Excel

- [x] 12.1 Selector de archivo `.xlsx`/`.xls`
- [x] 12.2 Tabla de preview (filas válidas / filas con error) tras llamar al endpoint sin `confirm`
- [x] 12.3 Botón "Confirmar" que reenvía el mismo archivo con `?confirm=true`

## 13. Frontend: tests

- [x] 13.1 Test: modal de creación de usuario llama `POST /admin/users` con el payload correcto
- [x] 13.2 Test: botón "Cerrar temporada" muestra confirmación antes de llamar al endpoint
- [x] 13.3 Test: preview de import muestra filas válidas y con error por separado
- [x] 13.4 Test: confirmar import reenvía el mismo archivo con `?confirm=true`

## 14. Literales EU/ES

- [x] 14.1 Todos los literales nuevos de `/admin` en euskera y castellano (G-C5), euskera por defecto

## 15. Verificación manual end-to-end

- [x] 15.1 Crear un usuario real desde el backoffice y confirmar que aparece en el tenant de Auth0
- [x] 15.2 Editar `equipo_ids` de un entrenador y confirmar en BD que el conjunto de vínculos es exactamente el enviado
- [x] 15.3 Deshabilitar un usuario y confirmar que no puede volver a iniciar sesión (bloqueado en Auth0) pero sigue listado en `/admin/users`
- [x] 15.4 Cerrar una temporada y confirmar que un segundo intento de cierre falla
- [x] 15.5 Importar un Excel de prueba con filas válidas y con error, confirmar el preview, y verificar que solo las filas válidas quedan persistidas tras confirmar
