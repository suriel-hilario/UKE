## MODIFIED Requirements

### Requirement: Página de detalle de equipo con pestaña Plantilla
El frontend SHALL mostrar en `/equipos/:id` una cabecera (`nombre`, `categoria`, `color`, `icono`) y una barra de pestañas que contiene "Plantilla" y, para equipos de categoría `eskola`, `f7` o `f11`, también "Asistencia" (`add-asistencia-jugadores`, extendida a `f11` por `add-asistencias-f11`); la pestaña "Plantilla" SHALL listar los miembros activos agrupados por `grupo` (Con Ficha / Sin Ficha / Entrenadores) y ordenados por `orden` dentro de cada grupo, mostrando foto/avatar (iniciales como fallback), `nombre`, `alias?`, `rol_entrenador?` y `fecha_incorporacion`. La pestaña de Minutaje NO SHALL añadirse en este change (proposal de `add-asistencia-jugadores`).

#### Scenario: Plantilla agrupada por grupo y ordenada
- **WHEN** un usuario con acceso al equipo abre la pestaña "Plantilla"
- **THEN** ve los miembros activos agrupados en Con Ficha / Sin Ficha / Entrenadores, cada grupo ordenado por `orden`

#### Scenario: Pestaña Asistencia visible para Eskola/F7/F11
- **WHEN** un usuario con acceso a un equipo de categoría `eskola`, `f7` o `f11` abre `/equipos/:id`
- **THEN** la barra de pestañas incluye "Asistencia" además de "Plantilla"

#### Scenario: Pestaña Asistencia de F11 usa la tabla de 10 estados
- **WHEN** un usuario abre la pestaña "Asistencia" de un equipo `f11`
- **THEN** la aplicación renderiza la tabla de asistencia F11 (10 estados, contadores, menú contextual), no la tabla de ciclo P/A de Eskola/F7
