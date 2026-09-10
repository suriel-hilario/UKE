## MODIFIED Requirements

### Requirement: Interacción de celda de asistencia
El frontend SHALL ciclar el estado de una celda de asistencia vacío → P → A → vacío en cada click, llamando a `PATCH /equipos/:id/asistencia` en cada cambio (inventario 01 § Pantalla 2 § Acciones). Cuando `equipo.temporada.estado === 'cerrada'`, las celdas SHALL ser no interactivas (sin ciclo de estado al click) — el backend ya rechaza la escritura con 409 (Requirement "Escritura bloqueada con temporada cerrada"); esto es una mejora de UX preventiva (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Ciclo de estados
- **WHEN** un usuario hace click 3 veces seguidas sobre una celda vacía de un equipo con temporada abierta
- **THEN** el estado pasa por P, luego A, y vuelve a vacío, llamando a `PATCH /equipos/:id/asistencia` en cada click

#### Scenario: Celda no interactiva en temporada cerrada
- **WHEN** un usuario hace click sobre una celda de asistencia de un equipo cuya temporada tiene `estado: 'cerrada'`
- **THEN** el estado de la celda no cambia y no se llama a `PATCH /equipos/:id/asistencia`

### Requirement: Alta de jugador desde la pestaña Asistencia
El botón "+ Jugador" SHALL abrir un modal con campo nombre (Enter confirma) que llama a `POST /equipos/:id/miembros` (inventario 01 § Overlay alta de jugador). Cuando `equipo.temporada.estado === 'cerrada'`, el frontend SHALL no mostrar el botón "+ Jugador" (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Añadir jugador
- **WHEN** un usuario completa el nombre en el modal de alta y confirma, en un equipo de temporada abierta
- **THEN** la aplicación llama a `POST /equipos/:id/miembros` y el nuevo jugador aparece en la tabla

#### Scenario: Botón + Jugador ausente en temporada cerrada
- **WHEN** un usuario abre la pestaña "Asistencia" de un equipo de temporada cerrada
- **THEN** la interfaz no muestra el botón "+ Jugador"
