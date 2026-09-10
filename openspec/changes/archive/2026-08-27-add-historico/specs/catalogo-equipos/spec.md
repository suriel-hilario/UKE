## MODIFIED Requirements

### Requirement: Detalle de equipo con plantilla activa
`GET /catalogo/equipos/:id` SHALL devolver el detalle completo del `equipo` (`nombre`, `categoria`, `color`, `icono`, `minutos_por_periodo`, `num_periodos`, `dias_entrenamiento`, `temporada.estado`) junto con sus `miembro_equipo` activos (`fecha_baja IS NULL` o `fecha_baja > hoy`, ordenados por `orden`), cada uno con `persona` (`nombre`, `alias`, `foto_url`), `grupo`, `rol_entrenador`, `fecha_incorporacion`, `fecha_baja`. SHALL responder 403 si el equipo está fuera del scope del caller (`98-modelo-datos.md` § equipo, § miembro_equipo, § persona; `design.md` § D1; `add-historico` `design.md` § D3).

#### Scenario: Acceso a equipo dentro del scope
- **WHEN** un usuario con acceso al equipo (según su rol y scope) hace `GET /catalogo/equipos/:id`
- **THEN** el sistema responde 200 con el detalle del equipo y su lista de miembros activos ordenada por `orden`

#### Scenario: Acceso a equipo fuera del scope
- **WHEN** un usuario con rol `entrenador` no vinculado a un equipo, o `coordinador` cuya `categoria_asignada` no coincide con la `categoria` del equipo, hace `GET /catalogo/equipos/:id`
- **THEN** el sistema responde 403

#### Scenario: Miembro dado de baja no aparece en la plantilla
- **WHEN** un `miembro_equipo` del equipo tiene `fecha_baja` en el pasado
- **THEN** ese miembro no aparece en la respuesta de `GET /catalogo/equipos/:id`

#### Scenario: Detalle de equipo incluye estado de temporada
- **WHEN** un usuario hace `GET /catalogo/equipos/:id` sobre un equipo de temporada cerrada
- **THEN** la respuesta incluye `temporada.estado: 'cerrada'` (usado por el frontend para activar el modo solo lectura)

### Requirement: Página de detalle de equipo con pestaña Plantilla
El frontend SHALL mostrar en `/equipos/:id` una cabecera (`nombre`, `categoria`, `color`, `icono`) y una barra de pestañas que contiene "Plantilla" y, para equipos de categoría `eskola`, `f7` o `f11`, también "Asistencia" (`add-asistencia-jugadores`, extendida a `f11` por `add-asistencias-f11`); para equipos `f7`/`f11` (no `eskola`), también "Minutaje" (`add-minutaje`; inventario 04 § Constantes); para equipos `f7` únicamente, también "Entrenadores" (`add-asistencia-entrenadores`; inventario 02). La pestaña "Plantilla" SHALL listar los miembros activos agrupados por `grupo` (Con Ficha / Sin Ficha / Entrenadores) y ordenados por `orden` dentro de cada grupo, mostrando foto/avatar (iniciales como fallback), `nombre`, `alias?`, `rol_entrenador?` y `fecha_incorporacion`. Cuando `equipo.temporada.estado === 'cerrada'`, el frontend SHALL mostrar un banner de solo lectura ("Temporada cerrada / Denboraldia itxita — solo lectura / irakurketa soilik") sobre la cabecera y SHALL ocultar el botón "+ Jugador" de la pestaña Plantilla (`99-decisiones.md` § G-A7: "ninguna edición posible sobre temporadas cerradas"; `add-historico` `design.md` § D6).

#### Scenario: Plantilla agrupada por grupo y ordenada
- **WHEN** un usuario con acceso al equipo abre la pestaña "Plantilla"
- **THEN** ve los miembros activos agrupados en Con Ficha / Sin Ficha / Entrenadores, cada grupo ordenado por `orden`

#### Scenario: Pestaña Asistencia visible para Eskola/F7/F11
- **WHEN** un usuario con acceso a un equipo de categoría `eskola`, `f7` o `f11` abre `/equipos/:id`
- **THEN** la barra de pestañas incluye "Asistencia" además de "Plantilla"

#### Scenario: Pestaña Asistencia de F11 usa la tabla de 10 estados
- **WHEN** un usuario abre la pestaña "Asistencia" de un equipo `f11`
- **THEN** la aplicación renderiza la tabla de asistencia F11 (10 estados, contadores, menú contextual), no la tabla de ciclo P/A de Eskola/F7

#### Scenario: Pestaña Minutaje visible para F7/F11
- **WHEN** un usuario con acceso a un equipo de categoría `f7` o `f11` abre `/equipos/:id`
- **THEN** la barra de pestañas incluye "Minutaje" además de "Plantilla" (y "Asistencia")

#### Scenario: Pestaña Minutaje no visible para Eskola
- **WHEN** un usuario con acceso a un equipo de categoría `eskola` abre `/equipos/:id`
- **THEN** la barra de pestañas no incluye "Minutaje"

#### Scenario: Pestaña Entrenadores visible solo para F7
- **WHEN** un usuario con acceso a un equipo de categoría `f7` abre `/equipos/:id`
- **THEN** la barra de pestañas incluye "Entrenadores" además de "Plantilla", "Asistencia" y "Minutaje"

#### Scenario: Pestaña Entrenadores no visible para Eskola ni F11
- **WHEN** un usuario con acceso a un equipo de categoría `eskola` o `f11` abre `/equipos/:id`
- **THEN** la barra de pestañas no incluye "Entrenadores"

#### Scenario: Banner de solo lectura en equipo de temporada cerrada
- **WHEN** un usuario abre `/equipos/:id` de un equipo cuya `temporada.estado` es `cerrada`
- **THEN** la aplicación muestra el banner de solo lectura sobre la cabecera

#### Scenario: Sin banner en equipo de temporada abierta
- **WHEN** un usuario abre `/equipos/:id` de un equipo cuya `temporada.estado` es `abierta`
- **THEN** la aplicación no muestra ningún banner de solo lectura

#### Scenario: Botón + Jugador oculto en temporada cerrada
- **WHEN** un usuario abre la pestaña "Plantilla" de un equipo de temporada cerrada
- **THEN** la interfaz no muestra el botón "+ Jugador"

## ADDED Requirements

### Requirement: Badge de temporada cerrada en el selector del shell
El selector de temporada de `AppShell` SHALL mostrar, junto al nombre de cada temporada con `estado: 'cerrada'`, un badge o etiqueta "cerrada"; las temporadas cerradas siguen siendo seleccionables (sin cambio de comportamiento respecto al selector existente) (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D7).

#### Scenario: Badge visible para temporada cerrada
- **WHEN** el selector de temporada de `AppShell` lista una temporada con `estado: 'cerrada'`
- **THEN** esa entrada del selector muestra la etiqueta "cerrada"

#### Scenario: Temporada cerrada sigue siendo seleccionable
- **WHEN** un usuario selecciona una temporada marcada "cerrada" en el selector de `AppShell`
- **THEN** la aplicación carga los equipos de esa temporada normalmente
