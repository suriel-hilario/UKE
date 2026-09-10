## MODIFIED Requirements

### Requirement: Página de detalle de equipo con pestaña Plantilla
El frontend SHALL mostrar en `/equipos/:id` una cabecera (`nombre`, `categoria`, `color`, `icono`) y una barra de pestañas que contiene "Plantilla" y, para equipos de categoría `eskola`, `f7` o `f11`, también "Asistencia" (`add-asistencia-jugadores`, extendida a `f11` por `add-asistencias-f11`); para equipos `f7`/`f11` (no `eskola`), también "Minutaje" (`add-minutaje`; inventario 04 § Constantes); para equipos `f7` únicamente, también "Entrenadores" (`add-asistencia-entrenadores`; inventario 02). La pestaña "Plantilla" SHALL listar los miembros activos agrupados por `grupo` (Con Ficha / Sin Ficha / Entrenadores) y ordenados por `orden` dentro de cada grupo, mostrando foto/avatar (iniciales como fallback), `nombre`, `alias?`, `rol_entrenador?` y `fecha_incorporacion`.

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
