## ADDED Requirements

### Requirement: Todos los endpoints de backoffice exigen rol admin
Todo endpoint bajo `/admin/*` SHALL estar marcado `@Roles('admin')`, apoyándose en el guard global de `add-auth` (401 sin JWT, 403 con JWT de otro rol) (proposal; `99-decisiones.md` § G-B1, matriz de permisos).

#### Scenario: Usuario con rol distinto de admin accede a /admin/*
- **WHEN** un cliente con JWT válido y rol `director`, `coordinador` o `entrenador` hace un request a cualquier endpoint `/admin/*`
- **THEN** el sistema responde 403

#### Scenario: Usuario admin accede a /admin/*
- **WHEN** un cliente con JWT válido y rol `admin` hace un request a un endpoint `/admin/*`
- **THEN** el sistema procesa el request normalmente

### Requirement: Cliente Auth0 Management API aislado
El sistema SHALL exponer un único servicio (`ManagementService`) que centraliza toda comunicación con la Auth0 Management API (autenticación M2M vía `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`, `AUTH0_M2M_AUDIENCE`); ningún otro componente del backend SHALL llamar a Auth0 directamente (`99-decisiones.md` § G-B2, § D).

#### Scenario: Falta alguna variable de entorno M2M
- **WHEN** el backend arranca sin `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET` o `AUTH0_M2M_AUDIENCE`
- **THEN** el proceso falla al arrancar con un error explícito (fail-fast, mismo patrón que `AuthConfig` de `add-auth`)

### Requirement: Listado de usuarios
`GET /admin/users` SHALL devolver todos los `usuario` desde la BD local (no desde Auth0) (proposal; `98-modelo-datos.md` § usuario).

#### Scenario: Admin lista usuarios
- **WHEN** un admin hace `GET /admin/users`
- **THEN** el sistema responde 200 con la lista de usuarios de la BD local, incluyendo `id`, `auth0_id`, `nombre_visible`, `email`, `rol`, `categoria_asignada`

### Requirement: Alta de usuario
`POST /admin/users` SHALL crear la cuenta en Auth0 vía Management API y, solo si esa llamada tiene éxito, crear la fila `usuario` en BD con el `auth0_id` devuelto por Auth0. Si la creación en Auth0 falla, no se crea ninguna fila local. Si la inserción en BD falla después de creada la cuenta en Auth0, el sistema SHALL intentar borrar la cuenta de Auth0 recién creada como compensación best-effort, y si esa compensación también falla, SHALL registrar el `auth0_id` huérfano en logs de nivel error (proposal; `98-modelo-datos.md` § usuario; `99-decisiones.md` § G-B2).

#### Scenario: Alta exitosa
- **WHEN** un admin hace `POST /admin/users` con `email`, `nombre_visible`, `rol` válidos
- **THEN** el sistema crea la cuenta en Auth0, crea el `usuario` en BD con el `auth0_id` devuelto, y responde 201 con el usuario creado

#### Scenario: Falla la creación en Auth0
- **WHEN** la llamada a Auth0 Management API para crear el usuario falla (p.ej. email duplicado en el tenant)
- **THEN** el sistema no crea ninguna fila en BD y responde con un error que refleja el fallo de Auth0

#### Scenario: Falla la inserción en BD tras crear en Auth0
- **WHEN** Auth0 crea la cuenta correctamente pero la inserción del `usuario` en BD falla
- **THEN** el sistema intenta borrar la cuenta recién creada en Auth0; si el borrado también falla, registra el `auth0_id` huérfano en un log de nivel error

### Requirement: Edición de usuario
`PATCH /admin/users/:id` SHALL permitir actualizar `nombre_visible`, `rol`, `categoria_asignada` y `equipo_ids`. Si `email` o `nombre_visible` cambian, el sistema SHALL sincronizar esos campos en Auth0. `equipo_ids`, cuando se incluye, SHALL reemplazar el conjunto completo de vínculos `usuario_equipo` de ese usuario (equivalente semántico a un PUT sobre la relación) (proposal; `98-modelo-datos.md` § usuario_equipo; G-A8).

#### Scenario: Actualizar rol y categoría
- **WHEN** un admin hace `PATCH /admin/users/:id` con un nuevo `rol` y `categoria_asignada`
- **THEN** el sistema actualiza esos campos en BD y responde 200 con el usuario actualizado

#### Scenario: Reemplazo completo de equipo_ids
- **WHEN** un admin hace `PATCH /admin/users/:id` con `equipo_ids: [A, B]` para un usuario que actualmente tiene vínculos a `[A, C]`
- **THEN** el sistema elimina el vínculo a `C`, mantiene el vínculo a `A`, crea el vínculo a `B`, de forma que tras la operación los vínculos del usuario son exactamente `[A, B]`

#### Scenario: Cambio de email sincroniza con Auth0
- **WHEN** un admin hace `PATCH /admin/users/:id` con un `email` distinto al actual
- **THEN** el sistema actualiza el email en Auth0 vía Management API además de en BD

### Requirement: Deshabilitar usuario
`DELETE /admin/users/:id` SHALL bloquear la cuenta en Auth0 (`blocked: true`) y NO SHALL borrar la fila `usuario` de la BD local (proposal; `99-decisiones.md` § G-A7, preservación de histórico).

#### Scenario: Deshabilitar usuario
- **WHEN** un admin hace `DELETE /admin/users/:id`
- **THEN** el sistema bloquea la cuenta en Auth0 y la fila `usuario` sigue existiendo en BD, consultable vía `GET /admin/users`

### Requirement: Reset de contraseña
`POST /admin/users/:id/reset-password` SHALL disparar el flujo estándar de reset de contraseña de Auth0 (`POST /dbconnections/change_password`) para el email del usuario (proposal; `project.md` § Autenticación).

#### Scenario: Admin dispara reset de contraseña
- **WHEN** un admin hace `POST /admin/users/:id/reset-password`
- **THEN** el sistema invoca el endpoint de cambio de contraseña de Auth0 para el email de ese usuario y responde 200

### Requirement: Gestión de temporadas
`GET/POST/PATCH /admin/temporadas` SHALL permitir listar, crear y editar `temporada` (`nombre`, `fecha_inicio`, `fecha_fin`) (`98-modelo-datos.md` § temporada; G-C4).

#### Scenario: Crear temporada
- **WHEN** un admin hace `POST /admin/temporadas` con `nombre`, `fecha_inicio`, `fecha_fin` válidos
- **THEN** el sistema crea la `temporada` con `estado: abierta` y responde 201

### Requirement: Cierre de temporada
`POST /admin/temporadas/:id/close` SHALL establecer `estado = cerrada` en la temporada indicada. Esta operación es irreversible: no existe endpoint de reapertura (proposal; `99-decisiones.md` § G-A7).

#### Scenario: Cerrar una temporada abierta
- **WHEN** un admin hace `POST /admin/temporadas/:id/close` sobre una temporada con `estado: abierta`
- **THEN** el sistema actualiza `estado` a `cerrada` y responde 200

#### Scenario: Cerrar una temporada ya cerrada
- **WHEN** un admin hace `POST /admin/temporadas/:id/close` sobre una temporada con `estado: cerrada`
- **THEN** el sistema responde con un error (no hay operación que realizar, la temporada ya está cerrada)

### Requirement: Gestión de bloques
`GET/POST/PATCH /admin/temporadas/:id/bloques` SHALL permitir listar, crear y editar `bloque` (`tipo`, `fecha_activacion`) de una temporada (`98-modelo-datos.md` § bloque; G-A3).

#### Scenario: Crear bloque de una temporada
- **WHEN** un admin hace `POST /admin/temporadas/:id/bloques` con `tipo` y `fecha_activacion` válidos
- **THEN** el sistema crea el `bloque` vinculado a esa temporada y responde 201

### Requirement: Gestión de equipos
`GET/POST/PATCH/DELETE /admin/equipos` SHALL permitir listar, crear, editar y borrar `equipo` (`temporada_id`, `categoria`, `nombre`, `color`, `icono`, `minutos_por_periodo`, `num_periodos`, `dias_entrenamiento`) (`98-modelo-datos.md` § equipo; G-C1, G-C6, G-C7).

#### Scenario: Crear equipo
- **WHEN** un admin hace `POST /admin/equipos` con `temporada_id`, `categoria`, `nombre` y el resto de campos requeridos válidos
- **THEN** el sistema crea el `equipo` y responde 201

### Requirement: Gestión de festivos
`GET/POST/DELETE /admin/temporadas/:id/festivos` SHALL permitir listar, crear y borrar `festivo` de una temporada (`98-modelo-datos.md` § festivo: `temporada_id` FK; G-C11).

#### Scenario: Crear festivo
- **WHEN** un admin hace `POST /admin/temporadas/:id/festivos` con `fecha` válida
- **THEN** el sistema crea el `festivo` vinculado a esa temporada y responde 201

### Requirement: Gestión de miembros de equipo
`GET/POST/PATCH/DELETE /admin/equipos/:id/miembros` SHALL permitir listar, crear, editar y borrar `miembro_equipo`. `fecha_incorporacion` SHALL ser obligatoria al crear. `PATCH` SHALL permitir establecer `fecha_baja` (`98-modelo-datos.md` § miembro_equipo; G-A4; § D2).

#### Scenario: Crear miembro sin fecha_incorporacion
- **WHEN** un admin hace `POST /admin/equipos/:id/miembros` sin `fecha_incorporacion`
- **THEN** el sistema responde con un error de validación (400) y no crea la fila

#### Scenario: Dar de baja a un miembro
- **WHEN** un admin hace `PATCH /admin/equipos/:id/miembros/:miembroId` con `fecha_baja`
- **THEN** el sistema actualiza `fecha_baja` en `miembro_equipo` y responde 200

### Requirement: Preview de import de jugadores desde Excel
`POST /admin/equipos/:id/import-jugadores` sin `?confirm=true` SHALL aceptar un archivo `.xlsx`/`.xls` (`multipart/form-data`), validar las columnas `nombre` (obligatoria), `alias` (opcional), `fecha_incorporacion` (obligatoria, ISO `YYYY-MM-DD` o `DD/MM/YYYY`; también aceptados los encabezados en euskera `izena`/`sarrera_data`, coincidencia de encabezado insensible a mayúsculas), y devolver un preview `{ valid: MiembroPreview[], errors: { row: number, field: string, message: string }[] }` **sin persistir nada** (`99-decisiones.md` § G-A2).

#### Scenario: Preview con filas válidas y con error
- **WHEN** un admin sube un Excel con una fila válida y una fila sin `fecha_incorporacion`
- **THEN** el sistema responde 200 con `valid` conteniendo la fila válida y `errors` conteniendo la fila inválida con su fila (`row`), campo (`field`) y mensaje; ninguna fila se persiste en BD

### Requirement: Confirmación de import de jugadores
`POST /admin/equipos/:id/import-jugadores?confirm=true` SHALL persistir las filas previamente validadas como `miembro_equipo` (y `persona` si no existen) del equipo indicado (`99-decisiones.md` § G-A2).

#### Scenario: Confirmar import
- **WHEN** un admin hace `POST /admin/equipos/:id/import-jugadores?confirm=true` con el mismo archivo ya validado en el preview
- **THEN** el sistema crea las filas `persona`/`miembro_equipo` correspondientes a las filas válidas y responde 200 con el resumen de filas creadas

### Requirement: Ruta /admin protegida por autenticación y rol
El frontend SHALL envolver la ruta `/admin` en `ProtectedRoute` y `RoleGuard roles={['admin']}` (componentes ya existentes de `add-auth`) (proposal).

#### Scenario: Usuario no admin accede a /admin
- **WHEN** un usuario autenticado con rol distinto de `admin` navega a `/admin`
- **THEN** la aplicación muestra la pantalla "Sin permiso / Baimenik ez" (comportamiento ya cubierto por `RoleGuard` de `add-auth`)

#### Scenario: Usuario admin accede a /admin
- **WHEN** un usuario autenticado con rol `admin` navega a `/admin`
- **THEN** la aplicación renderiza la navegación de backoffice (Usuarios / Temporadas / Equipos)

### Requirement: Página de gestión de usuarios
El frontend SHALL mostrar una tabla de usuarios (`nombre_visible`, `email`, `rol`, `categoria_asignada`/equipos) con acciones Crear, Editar, Reset password y Deshabilitar, cada una como diálogo modal (proposal).

#### Scenario: Crear usuario desde el frontend
- **WHEN** un admin completa el modal de creación con `email`, `nombre_visible`, `rol` y confirma
- **THEN** la aplicación llama a `POST /admin/users` y, si tiene éxito, refresca la tabla incluyendo el nuevo usuario

### Requirement: Página de gestión de temporadas
El frontend SHALL mostrar la lista de temporadas con badge de `estado`, formulario de creación/edición, bloques y festivos anidados por temporada (`festivo.temporada_id`, no `equipo_id`), y un botón "Cerrar temporada" que exige confirmación explícita advirtiendo de la irreversibilidad (proposal; `99-decisiones.md` § G-A7; § G-C11).

#### Scenario: Cerrar temporada requiere confirmación
- **WHEN** un admin pulsa "Cerrar temporada"
- **THEN** la aplicación muestra un diálogo de confirmación con advertencia de irreversibilidad antes de llamar a `POST /admin/temporadas/:id/close`

### Requirement: Página de gestión de equipos
El frontend SHALL mostrar la lista de equipos filtrada por temporada, formulario de creación/edición con todos los campos de `equipo`, y tabla de miembros con `fecha_incorporacion`/`fecha_baja`/`grupo`/`orden` reordenable (proposal).

#### Scenario: Reordenar miembros de un equipo
- **WHEN** un admin arrastra una fila de la tabla de miembros a una nueva posición
- **THEN** la aplicación actualiza el campo `orden` de los miembros afectados vía `PATCH /admin/equipos/:id/miembros`

### Requirement: Importación de Excel en el frontend
El frontend SHALL ofrecer un selector de archivo `.xlsx`/`.xls`, mostrar la tabla de preview (filas válidas y con error) devuelta por el backend, y un botón de confirmación que reenvía la importación con `?confirm=true` (proposal; `99-decisiones.md` § G-A2).

#### Scenario: Confirmar import tras preview
- **WHEN** un admin revisa el preview (con al menos una fila válida) y pulsa "Confirmar"
- **THEN** la aplicación llama al endpoint de import con `?confirm=true` y muestra el resumen de filas importadas

### Requirement: Literales bilingües en todo el backoffice
Todos los literales de la UI del backoffice SHALL existir en euskera y castellano, con euskera como idioma por defecto de la instancia (`99-decisiones.md` § G-C5).

#### Scenario: Cambiar idioma a castellano
- **WHEN** un usuario con preferencia de idioma `es` accede al backoffice
- **THEN** todos los literales de la UI del backoffice se muestran en castellano

### Requirement: Coherencia entre preview y confirmación de import
El backend SHALL re-validar y re-procesar el archivo en la llamada `?confirm=true`
exactamente igual que en el preview — no existe estado de sesión entre ambas llamadas.
El frontend SHALL reenviar el mismo archivo en ambas requests.
Si el archivo difiere, el resultado puede diferir del preview mostrado al usuario,
lo cual es aceptable dado que el backend re-valida siempre antes de persistir.
Source: 99-decisiones.md § G-A2 ("vista previa y validación antes de confirmar").

#### Scenario: Borrar equipo con datos asociados
- **WHEN** un admin hace `DELETE /admin/equipos/:id` sobre un equipo con sesiones,
  miembros o jornadas existentes
- **THEN** el sistema responde 409 con un mensaje que indica que el equipo
  tiene datos asociados y no puede borrarse
