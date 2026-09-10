## ADDED Requirements

### Requirement: Scope de acceso de minutaje reutiliza el de asistencia
Todos los endpoints de `/equipos/:id/jornadas*` y `/equipos/:id/dashboard` SHALL usar el mismo `AsistenciaAccessService` que el módulo de asistencia (director: toda la temporada; coordinador: su `categoria_asignada`; entrenador: sus `usuario_equipo`; `admin` denegado), sin construir un filtro de scope propio (`99-decisiones.md` § G-B1, columna "Módulos deportivos (asistencia, minutaje)"; `design.md` § D1).

#### Scenario: Admin sin acceso a minutaje
- **WHEN** un usuario con rol `admin` hace cualquier request a `/equipos/:id/jornadas`, `/equipos/:id/jornadas/:numero` o `/equipos/:id/dashboard`
- **THEN** el sistema responde 403

#### Scenario: Entrenador accede al minutaje de su equipo
- **WHEN** un usuario con rol `entrenador` vinculado al equipo hace `GET /equipos/:id/jornadas?bloque_id=<id>`
- **THEN** el sistema responde 200

### Requirement: Listado de jornadas de un equipo
`GET /equipos/:id/jornadas?bloque_id=` SHALL devolver todas las `jornada` del equipo para ese bloque, ordenadas por `numero` descendente (la más reciente primero), con `id`, `numero`, `rival`, `fecha`, `campo`, `goles_favor`, `goles_contra`, y para cada `miembro_equipo` un resumen de su `participacion_jornada` (`convocado`, `jugado`, `titular`, `baja`, `minutos`, `goles`) (inventario 04 § Pantalla 2 § Historial de jornadas).

#### Scenario: Historial ordenado por jornada más reciente
- **WHEN** un usuario con acceso hace `GET /equipos/:id/jornadas?bloque_id=<id>` sobre un equipo con jornadas 1, 2 y 3 registradas
- **THEN** el sistema responde con las jornadas en orden `[3, 2, 1]`

### Requirement: Detalle de una jornada por número
`GET /equipos/:id/jornadas/:numero` SHALL devolver una `jornada` identificada por su `numero` (no por UUID) dentro del bloque activo o el `bloque_id` indicado, junto con la `participacion_jornada` de todos los `miembro_equipo` activos en la fecha de la jornada (misma regla de elegibilidad que asistencia: `fecha_incorporacion <= fecha` y `fecha_baja IS NULL OR fecha <= fecha_baja` — `design.md` § D3). Un miembro activo sin fila `participacion_jornada` SHALL representarse con todos los campos en blanco/0/`false`, no como error (inventario 04 § Pantalla 2 § Lista de jugadores).

#### Scenario: Cargar una jornada existente por número
- **WHEN** un usuario con acceso hace `GET /equipos/:id/jornadas/3` y la jornada 3 ya existe con participaciones registradas
- **THEN** el sistema responde 200 con los datos de la jornada y las participaciones de todos los miembros activos en esa fecha

#### Scenario: Miembro activo sin participación registrada
- **WHEN** un miembro está activo en la fecha de la jornada pero no tiene fila `participacion_jornada`
- **THEN** el sistema lo incluye en la respuesta con `convocado: false`, `jugado: false`, `titular: false`, `baja: null`, `minutos: 0`, `goles: 0`

### Requirement: Registro (alta o sobrescritura) de una jornada
`POST /equipos/:id/jornadas` SHALL crear o sobrescribir (upsert por `equipo_id` + `bloque_id` + `numero`, según la restricción única del schema) una `jornada` con `numero`, `rival?`, `fecha?`, `campo`, `goles_favor`, `goles_contra`, y un array `participaciones` (`miembro_equipo_id`, `convocado`, `jugado`, `titular`, `baja?`, `minutos`, `goles`). SHALL validar que `minutos` de cada jugador no exceda `equipo.minutos_por_periodo * equipo.num_periodos + margen` (margen `+30` para equipos de 2 periodos, `+10` para equipos de 3 periodos), respondiendo 400 si se excede. SHALL aplicar las reglas de negocio de participación (Requirement "Reglas de negocio de participación") antes de persistir. SHALL responder 409 si la temporada está cerrada. Volver a guardar el mismo `numero` sobrescribe la jornada anterior sin confirmación adicional (`99-decisiones.md` § G-B3) (inventario 04 § Pantalla 2 § Botón GUARDAR JORNADA).

#### Scenario: Alta de una jornada nueva
- **WHEN** un usuario con scope de escritura hace `POST /equipos/:id/jornadas` con `numero: 1` y participaciones válidas, y no existe ya una jornada con ese número
- **THEN** el sistema crea la `jornada` y sus `participacion_jornada`, y responde con los datos guardados

#### Scenario: Sobrescribir una jornada existente
- **WHEN** un usuario con scope de escritura hace `POST /equipos/:id/jornadas` con un `numero` que ya existe para ese equipo y bloque
- **THEN** el sistema sobrescribe los datos de la jornada y sus participaciones sin pedir confirmación

#### Scenario: Minutos fuera de rango rechazados
- **WHEN** se hace `POST /equipos/:id/jornadas` sobre un equipo F11 (`minutos_por_periodo: 40`, `num_periodos: 2`, duración 80, margen +30) con `minutos: 111` para un jugador
- **THEN** el sistema responde con un error de validación (400) y no guarda la jornada

#### Scenario: Escritura bloqueada con temporada cerrada
- **WHEN** un usuario con scope de escritura hace `POST /equipos/:id/jornadas` sobre un equipo cuya temporada tiene `estado: cerrada`
- **THEN** el sistema responde 409 y no modifica ningún dato

### Requirement: Edición puntual de una participación
`PATCH /equipos/:id/jornadas/:numero/miembro/:miembroId` SHALL actualizar la `participacion_jornada` de un único miembro dentro de una jornada existente, sin requerir reenviar el resto de la jornada. SHALL aplicar las mismas reglas de negocio de participación y la misma validación de minutos que `POST /equipos/:id/jornadas`. SHALL responder 409 si la temporada está cerrada (inventario 04 § Pantalla 2, edición por jugador).

#### Scenario: Editar la participación de un jugador
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/jornadas/3/miembro/:miembroId` con `{ titular: true }`
- **THEN** el sistema actualiza esa `participacion_jornada` aplicando las reglas de negocio (titular implica convocado y jugado) y responde con el registro actualizado

### Requirement: Reglas de negocio de participación
El backend SHALL aplicar, antes de persistir cualquier `participacion_jornada` (desde `POST /equipos/:id/jornadas` o `PATCH .../miembro/:miembroId`): marcar `jugado: true` SHALL forzar `convocado: true`; marcar `titular: true` SHALL forzar `convocado: true` y `jugado: true`, y si `minutos` era `0` SHALL fijarlo a la duración del partido (`equipo.minutos_por_periodo * equipo.num_periodos`); marcar cualquier valor de `baja` SHALL forzar `convocado: false`, `jugado: false` y `titular: false`; los valores de `baja` (`LES`, `SAN`, `ENF`, `VAC`, `NJ`) SHALL ser mutuamente excluyentes entre sí (inventario 04 § Constantes, reglas de exclusividad; `design.md` § D2).

#### Scenario: Marcar jugado implica convocado
- **WHEN** se envía una participación con `jugado: true` y `convocado: false`
- **THEN** el sistema persiste `convocado: true`

#### Scenario: Marcar titular implica convocado, jugado y minutos por defecto
- **WHEN** se envía una participación con `titular: true`, `convocado: false`, `jugado: false` y `minutos: 0`, para un equipo con duración de partido 80 minutos
- **THEN** el sistema persiste `convocado: true`, `jugado: true`, `titular: true` y `minutos: 80`

#### Scenario: Marcar baja limpia convocado, jugado y titular
- **WHEN** se envía una participación con `baja: "LES"` y `convocado: true`, `jugado: true`, `titular: true`
- **THEN** el sistema persiste `convocado: false`, `jugado: false`, `titular: false`, `baja: "LES"`

### Requirement: Dashboard de participación por bloque
`GET /equipos/:id/dashboard?bloque_id=` SHALL devolver, para cada miembro activo del equipo, las métricas calculadas sobre las jornadas del bloque con `fecha >= miembro.fecha_incorporacion` (y regla de `fecha_baja` — `design.md` § D3): `jornadasDesdeDebut`, `disponibles` (jornadas sin `baja`), `decTec` (disponible y no convocado), `minutos` (suma), `goles` (suma), `%TOTAL`, `%CONV`, `%DISP` (fórmulas en `design.md` § D8, todas redondeadas a 1 decimal — `99-decisiones.md` § G-C9), y `alerta` (`"intervenir"` si `%DISP < 50`; `"vigilar"` si `50 <= %DISP < 70`; `null` en otro caso o si `disponibles < 2`). Si el denominador de cualquier porcentaje es `0`, ese porcentaje SHALL representarse como `"--"` (inventario 04 § Pantalla 3 § Dashboard, § Constantes — getPlayerAccum).

#### Scenario: Métricas calculadas correctamente
- **WHEN** un miembro tiene 5 jornadas disponibles desde su debut, 4 convocatorias, y 200 minutos jugados en un equipo con duración de partido 80 minutos
- **THEN** `%DISP` = `200 / (5 * 80) * 100` = `50.0`, con `alerta: "vigilar"`

#### Scenario: Menos de 2 jornadas disponibles no genera alerta
- **WHEN** un miembro tiene solo 1 jornada disponible desde su debut
- **THEN** `alerta` es `null` independientemente de su `%DISP`

#### Scenario: Sin jornadas muestra "--"
- **WHEN** un miembro no tiene ninguna jornada desde su `fecha_incorporacion`
- **THEN** `%TOTAL`, `%CONV` y `%DISP` se representan como `"--"`

### Requirement: Umbrales de color del dashboard de minutaje
Los porcentajes `%TOTAL`, `%CONV` y `%DISP` SHALL colorearse según los umbrales: `>=70` verde, `>=50` ámbar, `<50` rojo (`99-decisiones.md` § G-C3, fila minutaje/`%DISP`).

#### Scenario: DISP por debajo de 50 se muestra en rojo
- **WHEN** un miembro tiene `%DISP: 35.0`
- **THEN** su celda de `%DISP` se muestra con el estilo de color rojo

### Requirement: Formulario de jornada
El frontend SHALL mostrar, en la parte superior de la pestaña "Minutaje", un formulario con campos "Jornada nº" (número, 1-40), "Rival" (texto), "Fecha", "Campo" (Local/Visitante — Etxean/Kanpoan), "Goles favor" (número `>=0`) y "Goles contra" (número `>=0`), junto con una insignia de duración ("2×<min> min · duración del partido" para F11, "3×<min> min (<total> min)" para F7, según `equipo.num_periodos`/`equipo.minutos_por_periodo`). Cargar una jornada existente por número SHALL rellenar el formulario y las participaciones de los jugadores (inventario 04 § Pantalla 2 § Formulario de jornada).

#### Scenario: Cargar jornada existente rellena el formulario
- **WHEN** un usuario introduce un número de jornada ya guardado
- **THEN** el formulario y la lista de jugadores se rellenan con los datos guardados de esa jornada

### Requirement: Lista de jugadores con pills de participación
El frontend SHALL mostrar, debajo del formulario de jornada, una fila por miembro activo con: número, nombre (clicable, abre el panel de estadísticas), y pills `CONV`/`JUG`/`TIT`/`LES`/`SAN`/`ENF`/`VAC`/`NJ` que aplican client-side las mismas reglas de exclusividad y dependencia del Requirement "Reglas de negocio de participación" antes de enviar el cambio al backend (inventario 04 § Pantalla 2 § Lista de jugadores).

#### Scenario: Pulsar la pill LES desmarca SAN si estaba activa
- **WHEN** un jugador tiene la pill `SAN` activa y el usuario pulsa `LES`
- **THEN** la interfaz desactiva `SAN` y activa `LES` antes de enviar el cambio

### Requirement: Edición de minutos y goles por jugador
El frontend SHALL mostrar, debajo de las pills de cada jugador, un input numérico de minutos con botones de preajuste (1 periodo, partido completo, y para F7 también 3 periodos) y un input numérico de goles (inventario 04 § Pantalla 2 § Fila de minutos).

#### Scenario: Preajuste de minutos a partido completo
- **WHEN** un usuario pulsa el botón de preajuste "partido completo" para un jugador
- **THEN** el input de minutos se rellena con `equipo.minutos_por_periodo * equipo.num_periodos`

### Requirement: Panel de estadísticas por jugador
El frontend SHALL permitir expandir, por jugador (al hacer click en su nombre o en un botón "📊"), un panel con: contadores (Jornadas, Conv, Jugados, Titular, Minutos, Goles, y contadores de baja si son `>0`), tres barras de métrica (`%TOTAL`/`%CONV`/`%DISP▲`) con tooltip explicando la fórmula, una insignia de alerta si aplica ("⚠️ Participación baja / Parte-hartze txikia" para `intervenir`, "👁 Participación media / Parte-hartze ertaina" para `vigilar`), y el texto "Sin jornadas registradas aún" si el jugador no tiene datos (inventario 04 § Pantalla 2 § Lista de jugadores).

#### Scenario: Panel muestra alerta de intervención
- **WHEN** un jugador tiene `alerta: "intervenir"` en el dashboard
- **THEN** su panel de estadísticas muestra la insignia "⚠️ Participación baja / Parte-hartze txikia"

#### Scenario: Jugador sin jornadas registradas
- **WHEN** un jugador no tiene ninguna jornada registrada en el bloque
- **THEN** su panel muestra "Sin jornadas registradas aún" en vez de las barras de métrica

### Requirement: Contador de convocados en la cabecera
La lista de jugadores SHALL mostrar en su cabecera un contador "N conv · M jugados" con el número de jugadores marcados `convocado` y `jugado` en la jornada actualmente editada (inventario 04 § Pantalla 2 § Contador de cabecera).

#### Scenario: Contador refleja las pills marcadas
- **WHEN** un usuario marca `CONV` en 3 jugadores y `JUG` en 2 de ellos
- **THEN** la cabecera muestra "3 conv · 2 jugados"

### Requirement: Guardar jornada
El botón "💾 GUARDAR JORNADA" SHALL llamar a `POST /equipos/:id/jornadas` con los datos del formulario y las participaciones actuales; al completarse con éxito SHALL refrescar el historial de jornadas (inventario 04 § Pantalla 2 § Botón GUARDAR JORNADA).

#### Scenario: Guardar refresca el historial
- **WHEN** un usuario pulsa "GUARDAR JORNADA" y la llamada responde con éxito
- **THEN** la aplicación refresca la lista de "Historial de jornadas" para incluir la jornada guardada

### Requirement: Historial de jornadas
El frontend SHALL mostrar, debajo de la lista de jugadores, una sección "HISTORIAL DE JORNADAS · N registradas" con una tarjeta por jornada (la más reciente primero): insignia de resultado V/E/D coloreada (verde/gris/rojo según `goles_favor` vs `goles_contra`), rival, fecha, y expansión a detalle completo. SHALL mostrar "Sin jornadas registradas aún" si no hay ninguna jornada (inventario 04 § Pantalla 2 § Historial de jornadas).

#### Scenario: Tarjeta con resultado de victoria
- **WHEN** una jornada tiene `goles_favor: 3` y `goles_contra: 1`
- **THEN** su tarjeta muestra la insignia "V" en verde

#### Scenario: Historial vacío
- **WHEN** un equipo no tiene ninguna jornada registrada en el bloque
- **THEN** el historial muestra "Sin jornadas registradas aún"

### Requirement: Dashboard de participación (vista)
El frontend SHALL ofrecer, dentro de la pestaña "Minutaje", una vista de Dashboard ("📊") con: una franja de KPIs del equipo; sección "CONTROL DE PARTICIPACIÓN" con insignia de duración de partido; leyenda de las métricas `TOTAL`/`CONV`/`DISP▲` (`DISP` marcada como principal) con explicación de umbrales y de alertas (`<50% DISP` → Intervenir, `50-70%` → Vigilar); un panel de alertas listando los jugadores en rojo/ámbar; una tabla de participación con las tres métricas por jugador; y una sección "DETALLE POR JORNADA" con navegación `‹ Jornada N ›`, rival, resultado, un toggle `☰ Tabla` / `⊞ Fichas`, y el resumen de pills de esa jornada (inventario 04 § Pantalla 3 § Dashboard).

#### Scenario: Panel de alertas lista jugadores en riesgo
- **WHEN** el dashboard tiene 2 jugadores con `alerta: "intervenir"` y 1 con `alerta: "vigilar"`
- **THEN** el panel de alertas los lista a los 3, agrupados o distinguidos por severidad

#### Scenario: Navegar el detalle por jornada
- **WHEN** un usuario pulsa `›` en "DETALLE POR JORNADA"
- **THEN** la vista muestra el resumen de la siguiente jornada (rival, resultado, pills por jugador)

### Requirement: Literales bilingües del módulo de minutaje
Todos los literales nuevos de la pestaña Minutaje (formulario, pills, contadores, historial, dashboard, alertas) SHALL existir en euskera y castellano, con euskera como idioma por defecto (`99-decisiones.md` § G-C5).

#### Scenario: Literales en castellano
- **WHEN** un usuario con preferencia de idioma `es` abre la pestaña Minutaje
- **THEN** todos los literales nuevos se muestran en castellano
