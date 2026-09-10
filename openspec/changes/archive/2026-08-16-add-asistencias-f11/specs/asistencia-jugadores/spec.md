## MODIFIED Requirements

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

### Requirement: Lectura de asistencia por bloque y mes
`GET /equipos/:id/asistencia?bloque_id=&mes=` SHALL devolver las `sesion` del equipo para ese bloque y mes (`eliminada = false`), cada una con los `registro_asistencia` de los `miembro_equipo` activos en la fecha de la sesión (`fecha_incorporacion <= fecha` y, si existe `fecha_baja`, `fecha <= fecha_baja` — `98-modelo-datos.md` línea 116, D2); un miembro sin fila `registro_asistencia` para esa sesión SHALL representarse con estado "sin marcar". Cada miembro SHALL incluir además `contadores`: el número de registros de ese mes por cada código de `estado` presente (`design.md` § D2 de este change; inventario 03 § Tabla, columnas de contadores).

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

### Requirement: Ficha del jugador con estadísticas
`GET /miembros/:miembroId/ficha?equipo_id=` SHALL devolver los datos de `persona` (`nombre`, `alias`, `foto_url`), `grupo`, `fecha_incorporacion`, estadísticas de temporada (% total, presencias, faltas, sesiones — sobre todos los bloques de la temporada) y un desglose mensual (mes, sesiones, presencias, %) para los meses del "bloque activo" (`design.md` § D5 de `add-asistencia-jugadores`). El porcentaje SHALL calcularse como `presentes / sesiones-que-computan * 100`, redondeado a 1 decimal, mostrando `"--"` si el denominador es 0 (`98-modelo-datos.md` línea 116; `99-decisiones.md` § G-A4, G-C9, D2). Qué `estado` cuenta como "presente" (numerador) depende de `equipo.categoria`: `eskola`/`f7` solo `P`; `f11` cualquiera de `1`, `EM`, `RC` (`design.md` § D1 de este change; inventario 03 § Constantes).

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
`POST /equipos/:id/miembros` SHALL crear una `persona` y su `miembro_equipo` asociado a partir de un `nombre` (grupo `con_ficha`, `fecha_incorporacion` de hoy por defecto). `PATCH /equipos/:id/miembros/:miembroId` SHALL permitir actualizar el `nombre` de la `persona` asociada, la `fecha_baja` del `miembro_equipo` y/o su `orden` dentro del grupo (`98-modelo-datos.md` § miembro_equipo; inventario 03 § Acciones, arrastrar fila). Ambos con el mismo scope de escritura que el resto del módulo (`director`/`coordinador`/`entrenador`, no `admin`); 409 si la temporada está cerrada. Estos endpoints son distintos de `/admin/equipos/:id/miembros*` (`add-backoffice`, admin-only).

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

### Requirement: Exportación CSV de asistencia mensual
`GET /equipos/:id/asistencia/exportar?bloque_id=&mes=` SHALL devolver, para equipos `eskola`/`f7`, un CSV con columnas Jugador, una por fecha de sesión del mes (ISO) y `%`, con nombre de fichero `UKE_<equipo.nombre>_<mes>.csv` (inventario 01 § Acciones). Para equipos `f11`, este mismo endpoint SHALL devolver un formato distinto, definido en la capability `asistencias-f11`.

#### Scenario: Exportar CSV del mes (Eskola/F7)
- **WHEN** un usuario con acceso hace `GET /equipos/:id/asistencia/exportar?bloque_id=<id>&mes=2026-09` sobre un equipo `eskola`/`f7`
- **THEN** el sistema responde con un CSV cuyas columnas son Jugador, una por sesión de septiembre 2026, y `%`
