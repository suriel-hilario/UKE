## MODIFIED Requirements

### Requirement: Menú contextual de marcado de estado
El frontend SHALL abrir, al hacer click en una celda de asistencia, un menú contextual "MARCAR SESIÓN" con los 10 estados (el estado actual, si existe, marcado); seleccionar uno SHALL llamar a `PATCH /equipos/:id/asistencia` con ese `estado` y cerrar el menú (inventario 03 § Pantalla 2 § Acciones). Cuando `equipo.temporada.estado === 'cerrada'`, el click sobre una celda SHALL NOT abrir el menú contextual — el backend ya rechaza la escritura con 409 sobre el mismo endpoint que usa `add-asistencia-jugadores` (Requirement "Escritura bloqueada con temporada cerrada" de esa capability); esto es una mejora de UX preventiva (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Seleccionar un estado del menú
- **WHEN** un usuario hace click en una celda vacía de un equipo con temporada abierta y selecciona "EM" del menú contextual
- **THEN** la aplicación llama a `PATCH /equipos/:id/asistencia` con `estado: "EM"` y la celda pasa a mostrar "EM"

#### Scenario: Menú contextual no se abre en temporada cerrada
- **WHEN** un usuario hace click en una celda de asistencia de un equipo cuya temporada tiene `estado: 'cerrada'`
- **THEN** el menú contextual "MARCAR SESIÓN" no se abre y no se llama a `PATCH /equipos/:id/asistencia`
