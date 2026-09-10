## MODIFIED Requirements

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
