# panel-estado Specification

## Purpose
Panel de estado derivado (sin tabla propia) para director/coordinadores, con semáforo verde/rojo por equipo y por tipo (asistencia/minutaje) (creado al archivar el change add-panel-estado).

## Requirements

### Requirement: Scope del panel restringido a director y coordinadores
`GET /panel/estado` y `GET /panel/estado/:equipoId` SHALL denegar el acceso (403) a cualquier usuario cuyo rol no sea `director` o `coordinador` — incluyendo explícitamente `admin` y `entrenador` (`99-decisiones.md` § G-B1: el panel es para dirección y coordinadores; `design.md` § D1). Para `director` el scope de equipos SHALL ser toda la temporada; para `coordinador`, solo los equipos de su `categoria_asignada` (mismo criterio que `AsistenciaAccessService.getEquiposWhere`, reutilizado sin modificar — `design.md` § D1).

#### Scenario: Admin sin acceso al panel
- **WHEN** un usuario con rol `admin` hace `GET /panel/estado?temporada_id=<id>`
- **THEN** el sistema responde 403

#### Scenario: Entrenador sin acceso al panel
- **WHEN** un usuario con rol `entrenador` hace `GET /panel/estado?temporada_id=<id>`
- **THEN** el sistema responde 403

#### Scenario: Coordinador ve solo su categoría
- **WHEN** un `coordinador` con `categoria_asignada: f7` hace `GET /panel/estado?temporada_id=<id>`
- **THEN** la respuesta solo incluye equipos de categoría `f7`

#### Scenario: Director ve todas las categorías
- **WHEN** un `director` hace `GET /panel/estado?temporada_id=<id>`
- **THEN** la respuesta incluye equipos de `eskola`, `f7` y `f11` (los que existan en esa temporada)

### Requirement: Cálculo de asistencia pendiente por equipo
Para cada equipo, `asistencia_pendiente` SHALL ser `true` si existe al menos una `sesion` con `eliminada=false` y `fecha <= hoy` dentro del bloque activo del equipo (bloque con `fecha_activacion` más reciente `<= hoy`) para la cual no todos los `miembro_equipo` activos en esa fecha (`grupo` `con_ficha` o `sin_ficha` — `design.md` § D4; activo = `fecha_incorporacion <= fecha` y, si existe `fecha_baja`, `fecha <= fecha_baja`) tienen una fila `registro_asistencia`; `false` en caso contrario (`98-modelo-datos.md` § 5). El cálculo SHALL evaluarse únicamente sobre `sesion` ya persistidas — SHALL NOT disparar la generación perezosa de sesiones (`ensureSesionesRegla`) como efecto de esta consulta (`design.md` § D3).

#### Scenario: Sesión con todos los registros no cuenta como pendiente
- **WHEN** un equipo tiene una única `sesion` con fecha pasada y todos sus miembros activos tienen `registro_asistencia`
- **THEN** `asistencia_pendiente` es `false` para ese equipo

#### Scenario: Sesión con un miembro sin marcar cuenta como pendiente
- **WHEN** un equipo tiene una `sesion` con fecha pasada donde al menos un miembro activo no tiene `registro_asistencia`
- **THEN** `asistencia_pendiente` es `true` para ese equipo

#### Scenario: Sesión futura no cuenta como pendiente
- **WHEN** la única `sesion` sin completar de un equipo tiene `fecha` posterior a hoy
- **THEN** `asistencia_pendiente` es `false` para ese equipo

#### Scenario: El cálculo no genera sesiones nuevas
- **WHEN** se consulta `GET /panel/estado` para un equipo cuyo mes actual aún no tiene `sesion` de `origen: regla` generadas
- **THEN** la consulta no crea ninguna `sesion` nueva como efecto secundario

### Requirement: Cálculo de minutaje pendiente por equipo
Para equipos `f7`/`f11`, `minutaje_pendiente` SHALL ser `true` si existe al menos una `jornada` con `fecha` no nula, `fecha <= hoy` y `fecha >= bloque.fecha_activacion` del bloque activo, para la cual falta la fila `participacion_jornada` de al menos un `miembro_equipo` activo en esa fecha; `false` en caso contrario (`98-modelo-datos.md` § 5). Para equipos `eskola`, `minutaje_pendiente` SHALL ser `null` (no aplica — `eskola` no tiene minutaje; `design.md` § D5).

#### Scenario: Jornada con todas las participaciones no cuenta como pendiente
- **WHEN** un equipo `f7` tiene una `jornada` con fecha pasada y participación registrada para todos sus miembros activos
- **THEN** `minutaje_pendiente` es `false` para ese equipo

#### Scenario: Jornada con un miembro sin participación cuenta como pendiente
- **WHEN** un equipo `f11` tiene una `jornada` con fecha pasada donde falta la participación de al menos un miembro activo
- **THEN** `minutaje_pendiente` es `true` para ese equipo

#### Scenario: Eskola no tiene minutaje pendiente
- **WHEN** se consulta el estado de un equipo `eskola`
- **THEN** `minutaje_pendiente` es `null`, no `false` ni `true`

### Requirement: Semáforo agregado por equipo
`semaforo` SHALL ser `"rojo"` si `asistencia_pendiente === true` o `minutaje_pendiente === true`; `"verde"` si ambos son `false` o `null` sin ser `true`; `"sin_datos"` si el equipo no tiene ningún `bloque` con `fecha_activacion <= hoy` (sin bloque activo, no hay contexto temporal para calcular pendientes — `design.md` § D9). En el caso `"sin_datos"`, `asistencia_pendiente` y `minutaje_pendiente` SHALL ser ambos `null` (`98-modelo-datos.md` § 5).

#### Scenario: Semáforo rojo por asistencia pendiente
- **WHEN** un equipo tiene `asistencia_pendiente: true` y `minutaje_pendiente: false`
- **THEN** `semaforo` es `"rojo"`

#### Scenario: Semáforo verde con eskola al día
- **WHEN** un equipo `eskola` tiene `asistencia_pendiente: false` (y `minutaje_pendiente: null`)
- **THEN** `semaforo` es `"verde"`

#### Scenario: Semáforo sin_datos sin bloque activo
- **WHEN** un equipo no tiene ningún `bloque` con `fecha_activacion <= hoy`
- **THEN** `semaforo` es `"sin_datos"`, `asistencia_pendiente` es `null` y `minutaje_pendiente` es `null`

### Requirement: Última actualización de asistencia y minutaje
Cada equipo SHALL incluir `ultima_actualizacion_asistencia`: el `updatedAt` más reciente entre los `registro_asistencia` de sesiones del bloque activo de ese equipo, o `null` si no hay ninguno. Para `f7`/`f11`, `ultima_actualizacion_minutaje` SHALL ser el `updatedAt` más reciente entre los `participacion_jornada` de jornadas del bloque activo, o `null` si no hay ninguna; para `eskola` SHALL ser `null` (`design.md` § D2, D5).

#### Scenario: Timestamp de la última marca de asistencia
- **WHEN** un equipo tiene varios `registro_asistencia` en el bloque activo con distintos `updatedAt`
- **THEN** `ultima_actualizacion_asistencia` es el `updatedAt` más reciente de todos ellos

#### Scenario: Sin registros aún
- **WHEN** un equipo no tiene ningún `registro_asistencia` en el bloque activo
- **THEN** `ultima_actualizacion_asistencia` es `null`

### Requirement: Listado de estado por temporada
`GET /panel/estado?temporada_id=` SHALL devolver una lista plana de equipos visibles al usuario (scope del rol) con `categoria`, `asistencia_pendiente`, `minutaje_pendiente`, `semaforo`, `ultima_actualizacion_asistencia` y `ultima_actualizacion_minutaje` (`design.md` § D6). `temporada_id` SHALL ser obligatorio; su ausencia SHALL responder 400 (`design.md` § D7, mismo criterio que `GET /catalogo/temporadas/:id/equipos`, sin resolución de "temporada por defecto" en el backend).

#### Scenario: Respuesta agrupable por categoría
- **WHEN** un `director` hace `GET /panel/estado?temporada_id=<id>` sobre una temporada con equipos de las tres categorías
- **THEN** la respuesta es una lista con el campo `categoria` en cada elemento, agrupable por el frontend

#### Scenario: temporada_id obligatorio
- **WHEN** se hace `GET /panel/estado` sin `temporada_id`
- **THEN** el sistema responde 400

### Requirement: Detalle de estado de un equipo
`GET /panel/estado/:equipoId` SHALL devolver los mismos campos agregados de `GET /panel/estado` para ese equipo más `sesiones_pendientes` (lista de `{fecha, tipo}` de las sesiones que hacen `asistencia_pendiente=true`) y `jornadas_pendientes` (lista de `{numero, fecha, rival}` de las jornadas que hacen `minutaje_pendiente=true`) (`99-decisiones.md` § G-A6). Mismo scope de acceso que el listado.

#### Scenario: Detalle lista las sesiones pendientes
- **WHEN** un usuario con acceso hace `GET /panel/estado/:equipoId` sobre un equipo con 2 sesiones sin completar
- **THEN** `sesiones_pendientes` incluye esas 2 sesiones con su `fecha` y `tipo`

#### Scenario: Detalle sin pendientes
- **WHEN** un equipo tiene `semaforo: "verde"`
- **THEN** `sesiones_pendientes` y `jornadas_pendientes` son listas vacías

### Requirement: Ruta /panel protegida para director y coordinador
El frontend SHALL exponer la ruta `/panel`, protegida con el mismo patrón que `/admin` (`RoleGuard`), accesible solo para `director` y `coordinador`; SHALL ofrecer un enlace a `/panel` desde el shell de navegación solo para esos roles (`99-decisiones.md` § G-A6, G-B1).

#### Scenario: Enlace visible para director
- **WHEN** un usuario `director` inicia sesión
- **THEN** el shell de navegación muestra un enlace a `/panel`

#### Scenario: Ruta bloqueada para entrenador
- **WHEN** un usuario `entrenador` navega directamente a `/panel`
- **THEN** la aplicación no muestra el contenido del panel (redirección o bloqueo, mismo patrón que `RoleGuard` en `/admin`)

### Requirement: Página del panel con tarjetas por categoría
El frontend SHALL mostrar en `/panel` un selector de temporada (preseleccionando la única temporada `abierta` si existe exactamente una, mismo criterio que `AppShell.tsx` — `design.md` § D7), mostrando junto a cada temporada con `estado: 'cerrada'` un badge o etiqueta "cerrada" (`add-historico` `design.md` § D7), y, para la temporada seleccionada, una sección por `categoria` (Eskola / F7 / F11) con una tarjeta por equipo visible; un `coordinador` SHALL ver únicamente la sección de su categoría. Cada tarjeta SHALL mostrar `nombre`, badge de `categoria`, indicador de `semaforo` (🟢 verde / 🔴 rojo / neutro para `sin_datos`), chip de estado de asistencia (✅ Al día / ⚠️ Pendiente), chip de estado de minutaje (✅ Al día / ⚠️ Pendiente / — para `eskola`) y los timestamps de última actualización (`99-decisiones.md` § G-A6: "panel con indicadores visuales por equipo, semáforo verde/rojo").

#### Scenario: Coordinador ve solo su sección
- **WHEN** un `coordinador` de `f7` abre `/panel`
- **THEN** solo se muestra la sección F7, sin Eskola ni F11

#### Scenario: Tarjeta de equipo al día
- **WHEN** un equipo tiene `asistencia_pendiente: false` y `minutaje_pendiente: false`
- **THEN** su tarjeta muestra 🟢 y ambos chips en estado "Al día"

#### Scenario: Chip de minutaje ausente en Eskola
- **WHEN** se muestra la tarjeta de un equipo `eskola`
- **THEN** el chip de minutaje muestra "—" en vez de "Al día" o "Pendiente"

#### Scenario: Badge de temporada cerrada en el selector del panel
- **WHEN** el selector de temporada de `/panel` lista una temporada con `estado: 'cerrada'`
- **THEN** esa entrada del selector muestra la etiqueta "cerrada"

### Requirement: Drawer de detalle con pendientes por equipo
Al hacer click en una tarjeta, el frontend SHALL abrir un drawer/modal con el listado de asistencia pendiente (fecha + tipo de cada sesión pendiente) y de minutaje pendiente (número + fecha + rival de cada jornada pendiente), obtenidos de `GET /panel/estado/:equipoId`; si no hay pendientes SHALL mostrar el estado vacío "Todo al día / Dena eguneratuta" (`99-decisiones.md` § G-A6).

#### Scenario: Abrir detalle de un equipo con pendientes
- **WHEN** un usuario hace click en una tarjeta con `semaforo: "rojo"`
- **THEN** el drawer muestra la lista de sesiones y/o jornadas pendientes de ese equipo

#### Scenario: Estado vacío cuando no hay pendientes
- **WHEN** un usuario hace click en una tarjeta con `semaforo: "verde"`
- **THEN** el drawer muestra el mensaje "Todo al día / Dena eguneratuta" sin listas

### Requirement: Auto-refresh del panel cada 60 segundos
La página `/panel` SHALL volver a consultar `GET /panel/estado` cada 60 segundos mientras está montada, sin requerir recarga manual, deteniendo el sondeo al desmontarse (`99-decisiones.md` § G-A6: "facilitar el seguimiento sin necesidad de acceder a los datos individuales de cada equipo"; `design.md` § D8).

#### Scenario: Refresco automático refleja un cambio reciente
- **WHEN** un entrenador marca asistencia de un equipo mientras un director tiene `/panel` abierto
- **THEN** dentro de 60 segundos la tarjeta de ese equipo se actualiza sin que el director recargue la página

### Requirement: Literales bilingües del panel de estado
Todos los literales nuevos de `/panel` SHALL existir en euskera y castellano, con euskera como idioma por defecto (`99-decisiones.md` § G-C5).

#### Scenario: Literales en castellano
- **WHEN** un usuario con preferencia de idioma `es` abre `/panel`
- **THEN** todos los literales de la página se muestran en castellano
