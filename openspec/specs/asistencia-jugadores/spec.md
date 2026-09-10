# asistencia-jugadores Specification

## Purpose
TBD - created by archiving change add-asistencia-jugadores. Update Purpose after archive.
## Requirements
### Requirement: Scope de escritura de módulos deportivos excluye a admin
El sistema SHALL exponer un `AsistenciaAccessService` que replica la jerarquía de scope de `CatalogoAccessService` (director: toda la temporada; coordinador: su `categoria_asignada`; entrenador: sus `usuario_equipo`) pero deniega explícitamente a `admin`, conforme a `99-decisiones.md` § G-B1 columna "Módulos deportivos" (`—` para admin). Ningún endpoint de asistencia SHALL construir su propio filtro de scope (`design.md` § D1).

#### Scenario: Admin sin acceso a asistencia
- **WHEN** un usuario con rol `admin` hace cualquier request a `/equipos/:id/asistencia`, `/equipos/:id/sesiones`, o `/miembros/:miembroId/ficha`
- **THEN** el sistema responde 403

#### Scenario: Entrenador accede a la asistencia de su equipo
- **WHEN** un usuario con rol `entrenador` vinculado al equipo hace `GET /equipos/:id/asistencia`
- **THEN** el sistema responde 200

### Requirement: Escritura bloqueada con temporada cerrada
Todo endpoint de escritura de este módulo (`PATCH /equipos/:id/asistencia`, `PATCH /equipos/:id/sesiones/:sesionId`, `POST /equipos/:id/sesiones`, `PATCH /miembros/:miembroId/foto`, `DELETE /miembros/:miembroId/foto`) SHALL responder 409 si la `temporada` del equipo tiene `estado: cerrada` (`99-decisiones.md` § G-A7; `design.md` § D2).

#### Scenario: Intento de registrar asistencia en temporada cerrada
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/asistencia` sobre un equipo cuya temporada tiene `estado: cerrada`
- **THEN** el sistema responde 409 y no modifica ningún dato

### Requirement: Generación automática de sesiones desde la regla semanal
Al consultar `GET /equipos/:id/asistencia` para un `bloque_id` y `mes` dados, el sistema SHALL asegurar la existencia de una `sesion` (`tipo: entrenamiento`, `origen: regla`) por cada fecha del mes que coincida con `equipo.dias_entrenamiento`, excluyendo fechas que coincidan con un `festivo` de la temporada y fechas fuera de `[temporada.fecha_inicio, temporada.fecha_fin]`, sin duplicar sesiones ya existentes para `(equipo_id, fecha, tipo)` (`99-decisiones.md` § G-C8; `design.md` § D3).

#### Scenario: Primera consulta del mes genera las sesiones de entrenamiento
- **WHEN** un usuario con acceso hace `GET /equipos/:id/asistencia?bloque_id=<id>&mes=2026-09` por primera vez para ese equipo, y el equipo entrena lunes/miércoles, sin festivos ese mes
- **THEN** el sistema crea una `sesion` por cada lunes y miércoles de septiembre 2026 dentro del rango de la temporada, con `origen: regla`

#### Scenario: Festivo excluido de la generación
- **WHEN** una fecha que coincidiría con `equipo.dias_entrenamiento` coincide también con un `festivo` de la temporada
- **THEN** el sistema no crea una `sesion` para esa fecha

#### Scenario: Consultas repetidas no duplican sesiones
- **WHEN** se hace `GET /equipos/:id/asistencia` dos veces para el mismo equipo, bloque y mes
- **THEN** el número de `sesion` con `origen: regla` de ese mes es el mismo tras ambas llamadas

### Requirement: Lectura de asistencia por bloque y mes
`GET /equipos/:id/asistencia?bloque_id=&mes=` SHALL devolver las `sesion` del equipo para ese bloque y mes (`eliminada = false`), cada una con los `registro_asistencia` de los `miembro_equipo` con `grupo` `con_ficha` o `sin_ficha` (excluyendo `grupo = 'entrenador'`, que se sirve por `GET /equipos/:id/asistencia/entrenadores` — `design.md` § D1 de `add-asistencia-entrenadores`) activos en la fecha de la sesión (`fecha_incorporacion <= fecha` y, si existe `fecha_baja`, `fecha <= fecha_baja` — `98-modelo-datos.md` línea 116, D2); un miembro sin fila `registro_asistencia` para esa sesión SHALL representarse con estado "sin marcar". Cada miembro SHALL incluir además `contadores`: el número de registros de ese mes por cada código de `estado` presente (`design.md` § D2 de `add-asistencias-f11`; inventario 03 § Tabla, columnas de contadores).

#### Scenario: Miembro sin registro aparece como sin marcar
- **WHEN** una sesión no tiene fila `registro_asistencia` para un miembro activo en esa fecha
- **THEN** la respuesta representa el estado de ese miembro en esa sesión como "sin marcar" (no como error ni como ausente)

#### Scenario: Miembro dado de baja antes de la sesión no aparece
- **WHEN** un `miembro_equipo` tiene `fecha_baja` anterior a la fecha de una sesión del mes consultado
- **THEN** ese miembro no aparece en los datos de esa sesión

#### Scenario: Miembro incorporado después de la sesión no aparece
- **WHEN** un `miembro_equipo` tiene `fecha_incorporacion` posterior a la fecha de una sesión del mes consultado
- **THEN** ese miembro no aparece en los datos de esa sesión

#### Scenario: Contadores por estado en equipo F11
- **WHEN** un miembro de un equipo `f11` tiene, en el mes consultado, 3 registros `1`, 1 registro `LS` y 2 sesiones sin marcar
- **THEN** sus `contadores` incluyen `{ "1": 3, "LS": 1 }` (los estados sin marcas no aparecen o valen 0)

#### Scenario: Entrenador excluido de la vista de jugadores
- **WHEN** un equipo tiene un `miembro_equipo` con `grupo = 'entrenador'` activo en el mes consultado
- **THEN** `GET /equipos/:id/asistencia` no lo incluye en `miembros`, aunque sí compute sus sesiones en `GET /equipos/:id/asistencia/entrenadores`

### Requirement: Registro de asistencia P/A
`PATCH /equipos/:id/asistencia` SHALL crear o actualizar (upsert) una fila `registro_asistencia` identificada por `sesion_id` + `miembro_equipo_id`, aceptando opcionalmente `nota`; SHALL responder 200 con el registro actualizado. Los valores válidos de `estado` dependen de `equipo.categoria` (`99-decisiones.md` § G-C2): equipos `eskola`/`f7` aceptan únicamente `P`/`A` (§ G-C2a); equipos `f11` aceptan los 10 códigos `1`, `EM`, `RC`, `VA`, `LS`, `EN`, `TR`, `EX`, `OT`, `NJ` (§ G-C2b, inventario 03 § Constantes). Un `estado` fuera del conjunto válido para la categoría del equipo SHALL responder 400.

#### Scenario: Marcar presente (Eskola/F7)
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/asistencia` sobre un equipo `eskola`/`f7` con `sesion_id`, `miembro_equipo_id` y `estado: "P"`
- **THEN** el sistema crea o actualiza el `registro_asistencia` correspondiente y responde 200

#### Scenario: Estado inválido rechazado (Eskola/F7)
- **WHEN** se hace `PATCH /equipos/:id/asistencia` sobre un equipo `eskola`/`f7` con un `estado` distinto de `P` o `A`
- **THEN** el sistema responde con un error de validación (400)

#### Scenario: Marcar estado F11 válido
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/asistencia` sobre un equipo `f11` con `estado: "EM"`
- **THEN** el sistema crea o actualiza el `registro_asistencia` correspondiente y responde 200

#### Scenario: Estado Eskola/F7 rechazado en equipo F11
- **WHEN** se hace `PATCH /equipos/:id/asistencia` sobre un equipo `f11` con `estado: "P"`
- **THEN** el sistema responde con un error de validación (400), porque `P` no pertenece al conjunto de estados válidos de F11

### Requirement: Quitar y restaurar una sesión
`PATCH /equipos/:id/sesiones/:sesionId` SHALL permitir marcar `eliminada: true` (quitar día) o `eliminada: false` (restaurar), sin borrar la fila ni sus `registro_asistencia` asociados (`99-decisiones.md` § G-A7, preservación de histórico).

#### Scenario: Quitar un día
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/sesiones/:sesionId` con `eliminada: true`
- **THEN** la sesión deja de aparecer en `GET /equipos/:id/asistencia` y no computa en los porcentajes

### Requirement: Alta manual de sesión
`POST /equipos/:id/sesiones` SHALL crear una `sesion` con `origen: manual`, `tipo` (`entrenamiento` o `partido`), `fecha` y `numero?` opcional, validando que no exista ya una `sesion` con el mismo `(equipo_id, fecha, tipo)` (constraint única del schema).

#### Scenario: Alta de sesión manual válida
- **WHEN** un usuario con scope de escritura hace `POST /equipos/:id/sesiones` con `tipo`, `fecha` válidos y sin duplicado existente
- **THEN** el sistema crea la `sesion` con `origen: manual` y responde 201

#### Scenario: Duplicado rechazado
- **WHEN** ya existe una `sesion` con el mismo `equipo_id`, `fecha` y `tipo`
- **THEN** el sistema responde con un error (409 o 400) y no crea una segunda fila

### Requirement: Ficha del jugador con estadísticas
`GET /miembros/:miembroId/ficha?equipo_id=` SHALL devolver los datos de `persona` (`nombre`, `alias`, `foto_url`), `grupo`, `fecha_incorporacion`, estadísticas de temporada (% total, presencias, faltas, sesiones — sobre todos los bloques de la temporada) y un desglose mensual (mes, sesiones, presencias, %) para los meses del "bloque activo" (`design.md` § D5 de `add-asistencia-jugadores`). El porcentaje SHALL calcularse como `presentes / sesiones-que-computan * 100`, redondeado a 1 decimal, mostrando `"--"` si el denominador es 0 (`98-modelo-datos.md` línea 116; `99-decisiones.md` § G-A4, G-C9, D2). Qué `estado` cuenta como "presente" (numerador) depende de `equipo.categoria`: `eskola`/`f7` solo `P`; `f11` cualquiera de `1`, `EM`, `RC` (`design.md` § D1 de `add-asistencias-f11`; inventario 03 § Constantes).

#### Scenario: Ficha con datos completos
- **WHEN** un usuario con acceso al equipo hace `GET /miembros/:miembroId/ficha?equipo_id=<id>`
- **THEN** el sistema responde 200 con las estadísticas de temporada y el desglose mensual del bloque activo

#### Scenario: Miembro sin sesiones que computen muestra "--"
- **WHEN** un miembro no tiene ninguna sesión dentro de su rango de `fecha_incorporacion`/`fecha_baja` que compute
- **THEN** su porcentaje se muestra como `"--"`, no como `0` ni como error

#### Scenario: Ficha F11 cuenta EM y RC como presencia
- **WHEN** un jugador de un equipo `f11` tiene registros `1`, `EM` y `RC` en tres sesiones distintas del bloque activo, y ninguna otra marca
- **THEN** las tres cuentan como presencia en `estadisticas.presencias` y en el desglose mensual

### Requirement: Alta y edición de jugador desde asistencia
`POST /equipos/:id/miembros` SHALL crear una `persona` y su `miembro_equipo` asociado a partir de un `nombre` (grupo `con_ficha`, `fecha_incorporacion` de hoy por defecto). `PATCH /equipos/:id/miembros/:miembroId` SHALL permitir actualizar el `nombre` de la `persona` asociada, la `fecha_baja` del `miembro_equipo`, su `orden` dentro del grupo, y/o su `rol_entrenador` (`98-modelo-datos.md` § miembro_equipo; inventario 03 § Acciones, arrastrar fila; `design.md` § D4 de `add-asistencia-entrenadores` para `rol_entrenador`). Ambos con el mismo scope de escritura que el resto del módulo (`director`/`coordinador`/`entrenador`, no `admin`); 409 si la temporada está cerrada. Estos endpoints son distintos de `/admin/equipos/:id/miembros*` (`add-backoffice`, admin-only).

#### Scenario: Alta rápida de jugador
- **WHEN** un usuario con scope de escritura hace `POST /equipos/:id/miembros` con `nombre`
- **THEN** el sistema crea la `persona` y el `miembro_equipo` con `fecha_incorporacion` de hoy y responde 201
- **AND** `fecha_incorporacion` se rellena server-side con la fecha de hoy si no se recibe en el body — nunca se envía `null` a Prisma, ya que el campo es `NOT NULL` en el schema (`98-modelo-datos.md` § miembro_equipo; G-A4)

#### Scenario: Editar nombre de jugador
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/miembros/:miembroId` con `nombre`
- **THEN** el sistema actualiza el `nombre` de la `persona` asociada

#### Scenario: Reordenar jugador dentro de su grupo
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/miembros/:miembroId` con `orden`
- **THEN** el sistema actualiza el campo `orden` del `miembro_equipo`

#### Scenario: Editar rol de un entrenador
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/miembros/:miembroId` con `rol_entrenador` sobre un `miembro_equipo` de `grupo = 'entrenador'`
- **THEN** el sistema actualiza el campo `rol_entrenador` de ese `miembro_equipo`

### Requirement: Foto de jugador
`PATCH /miembros/:miembroId/foto` SHALL aceptar `multipart/form-data` con una imagen, redimensionarla a un máximo de 200px y almacenarla en almacenamiento de objetos (no en la BD — `99-decisiones.md` § D), actualizando `persona.foto_url`. `DELETE /miembros/:miembroId/foto` SHALL limpiar `persona.foto_url`.

#### Scenario: Subir foto de jugador
- **WHEN** un usuario con scope de escritura hace `PATCH /miembros/:miembroId/foto` con una imagen válida
- **THEN** el sistema almacena la imagen redimensionada y actualiza `persona.foto_url` con su URL

#### Scenario: Eliminar foto de jugador
- **WHEN** un usuario con scope de escritura hace `DELETE /miembros/:miembroId/foto`
- **THEN** `persona.foto_url` queda vacío

### Requirement: Exportación CSV de asistencia mensual
`GET /equipos/:id/asistencia/exportar?bloque_id=&mes=` SHALL devolver, para equipos `eskola`/`f7`, un CSV con columnas Jugador, una por fecha de sesión del mes (ISO) y `%`, con nombre de fichero `UKE_<equipo.nombre>_<mes>.csv` (inventario 01 § Acciones). Para equipos `f11`, este mismo endpoint SHALL devolver un formato distinto, definido en la capability `asistencias-f11`.

#### Scenario: Exportar CSV del mes (Eskola/F7)
- **WHEN** un usuario con acceso hace `GET /equipos/:id/asistencia/exportar?bloque_id=<id>&mes=2026-09` sobre un equipo `eskola`/`f7`
- **THEN** el sistema responde con un CSV cuyas columnas son Jugador, una por sesión de septiembre 2026, y `%`

### Requirement: Pestaña Asistencia con tabla mensual
El frontend SHALL mostrar, en la pestaña "Asistencia" del detalle de equipo (solo equipos `eskola`/`f7`), un sidebar de meses con el % mensual junto a cada uno y, para el mes seleccionado, una tabla con cabecera "Jugador" + una columna por sesión (día de semana abreviado + número) + columna "%"; fila "SESIÓN %" con el % de cada sesión y el total mensual; una fila por miembro activo (avatar, nombre, una celda de asistencia por sesión, % mensual coloreado por umbral G-C3); fila "TOTAL" con el % mensual del equipo (inventario 01 § Pantalla 2 § Tabla de asistencia).

#### Scenario: Selección de mes actualiza la tabla
- **WHEN** un usuario selecciona un mes distinto en el sidebar
- **THEN** la tabla se rerenderiza con las sesiones y porcentajes de ese mes

### Requirement: Interacción de celda de asistencia
El frontend SHALL ciclar el estado de una celda de asistencia vacío → P → A → vacío en cada click, llamando a `PATCH /equipos/:id/asistencia` en cada cambio (inventario 01 § Pantalla 2 § Acciones). Cuando `equipo.temporada.estado === 'cerrada'`, las celdas SHALL ser no interactivas (sin ciclo de estado al click) — el backend ya rechaza la escritura con 409 (Requirement "Escritura bloqueada con temporada cerrada"); esto es una mejora de UX preventiva (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Ciclo de estados
- **WHEN** un usuario hace click 3 veces seguidas sobre una celda vacía de un equipo con temporada abierta
- **THEN** el estado pasa por P, luego A, y vuelve a vacío, llamando a `PATCH /equipos/:id/asistencia` en cada click

#### Scenario: Celda no interactiva en temporada cerrada
- **WHEN** un usuario hace click sobre una celda de asistencia de un equipo cuya temporada tiene `estado: 'cerrada'`
- **THEN** el estado de la celda no cambia y no se llama a `PATCH /equipos/:id/asistencia`

### Requirement: Nota por jugador y sesión
El frontend SHALL abrir, con click derecho o pulsación larga sobre una celda de asistencia, un overlay de nota (textarea, guardar y eliminar) que persiste el campo `nota` del `registro_asistencia` correspondiente; las celdas con nota SHALL mostrar un indicador visual (inventario 01 § Overlay Nota).

#### Scenario: Guardar una nota
- **WHEN** un usuario escribe texto en el overlay de nota y pulsa guardar
- **THEN** la aplicación persiste la nota vía `PATCH /equipos/:id/asistencia` y la celda muestra el indicador de nota

### Requirement: Modo edición — quitar día y dar de baja jugador
El frontend SHALL ofrecer un toggle de modo edición; en modo edición, cada cabecera de sesión SHALL mostrar un botón para quitarla (confirmación, `PATCH sesion eliminada=true`) y cada fila de jugador un botón para eliminarlo (confirmación, `PATCH miembro fecha_baja=hoy` — no borrado físico, `99-decisiones.md` § G-A7) (inventario 01 § Pantalla 2 § Acciones).

#### Scenario: Quitar un día en modo edición
- **WHEN** en modo edición un usuario confirma quitar una sesión
- **THEN** la aplicación llama a `PATCH /equipos/:id/sesiones/:sesionId` con `eliminada: true` y la columna desaparece de la tabla

#### Scenario: Eliminar jugador en modo edición
- **WHEN** en modo edición un usuario confirma eliminar un jugador
- **THEN** la aplicación llama a `PATCH /equipos/:id/miembros/:miembroId` con `fecha_baja` de hoy y el jugador deja de aparecer en la tabla de miembros activos

### Requirement: Alta de jugador desde la pestaña Asistencia
El botón "+ Jugador" SHALL abrir un modal con campo nombre (Enter confirma) que llama a `POST /equipos/:id/miembros` (inventario 01 § Overlay alta de jugador). Cuando `equipo.temporada.estado === 'cerrada'`, el frontend SHALL no mostrar el botón "+ Jugador" (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Añadir jugador
- **WHEN** un usuario completa el nombre en el modal de alta y confirma, en un equipo de temporada abierta
- **THEN** la aplicación llama a `POST /equipos/:id/miembros` y el nuevo jugador aparece en la tabla

#### Scenario: Botón + Jugador ausente en temporada cerrada
- **WHEN** un usuario abre la pestaña "Asistencia" de un equipo de temporada cerrada
- **THEN** la interfaz no muestra el botón "+ Jugador"

### Requirement: Exportación CSV desde el frontend
El botón de exportar SHALL llamar a `GET /equipos/:id/asistencia/exportar` para el mes seleccionado y disparar la descarga del fichero devuelto (inventario 01 § Acciones).

#### Scenario: Descargar CSV del mes
- **WHEN** un usuario pulsa el botón de exportar CSV
- **THEN** la aplicación descarga el fichero `UKE_<equipo>_<mes>.csv` del mes seleccionado

### Requirement: Overlay de ficha del jugador
Al hacer click en el nombre o avatar de un jugador, el frontend SHALL abrir un overlay con: avatar y botón de subida de foto (`PATCH /miembros/:miembroId/foto`), nombre editable inline (`PATCH /equipos/:id/miembros/:miembroId`), grid de 4 estadísticas (Total %, Presencias, Faltas, Sesiones), tabla mensual con mini barra de progreso coloreada por umbral, y botón de eliminar jugador (confirmación → `fecha_baja=hoy`) (inventario 01 § Overlay Ficha del jugador).

#### Scenario: Abrir ficha del jugador
- **WHEN** un usuario hace click en el nombre de un jugador de la tabla
- **THEN** se abre el overlay con sus estadísticas de temporada y desglose mensual

### Requirement: Literales bilingües del módulo de asistencia
Todos los literales nuevos de este módulo SHALL existir en euskera y castellano, con euskera como idioma por defecto (`99-decisiones.md` § G-C5).

#### Scenario: Literales en castellano
- **WHEN** un usuario con preferencia de idioma `es` abre la pestaña Asistencia
- **THEN** todos los literales de esa pestaña se muestran en castellano