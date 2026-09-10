## MODIFIED Requirements

### Requirement: Pestaña Entrenadores con tabla mensual
El frontend SHALL mostrar, en la pestaña "Entrenadores" del detalle de equipo (solo equipos `f7`), un sidebar de meses con el % mensual junto a cada uno y, para el mes seleccionado, una tabla con cabecera "Entrenador" + una columna por sesión + columna "%"; fila "SESIÓN %" con el % de cada sesión y el total mensual; una fila por entrenador activo (avatar, nombre, una celda de asistencia por sesión coloreada por umbral); el ciclo de celda (vacío → P → A → vacío) llama a `PATCH /equipos/:id/asistencia/entrenadores` en cada cambio, igual patrón que `AsistenciaTab` de Eskola/F7 (`design.md` § D5 de `add-asistencia-entrenadores`). El frontend SHALL ofrecer un modo edición que permite quitar una sesión (`PATCH .../entrenadores/sesiones/:sesionId` con `eliminada: true`); no SHALL ofrecer alta ni baja de entrenadores desde esta pestaña (gestión CRUD de entrenadores fuera de alcance, cubierta por `add-backoffice`). Cuando `equipo.temporada.estado === 'cerrada'`, las celdas de asistencia SHALL ser no interactivas y el modo edición SHALL no estar disponible (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Ciclo de estados en la tabla de entrenadores
- **WHEN** un usuario hace click 3 veces seguidas sobre una celda vacía de la tabla de entrenadores de un equipo con temporada abierta
- **THEN** el estado pasa por P, luego A, y vuelve a vacío, llamando a `PATCH /equipos/:id/asistencia/entrenadores` en cada click

#### Scenario: Quitar un día en modo edición
- **WHEN** en modo edición un usuario confirma quitar una sesión desde la pestaña de entrenadores, en un equipo de temporada abierta
- **THEN** la aplicación llama a `PATCH /equipos/:id/asistencia/entrenadores/sesiones/:sesionId` con `eliminada: true` y la columna desaparece de ambas tablas (entrenadores y jugadores)

#### Scenario: Sin botón de alta de entrenador
- **WHEN** un usuario abre la pestaña "Entrenadores"
- **THEN** la interfaz no ofrece ningún control para dar de alta un entrenador nuevo

#### Scenario: Celda no interactiva en temporada cerrada
- **WHEN** un usuario hace click en una celda de la tabla de entrenadores de un equipo cuya temporada tiene `estado: 'cerrada'`
- **THEN** el estado de la celda no cambia y no se llama a `PATCH /equipos/:id/asistencia/entrenadores`

#### Scenario: Modo edición no disponible en temporada cerrada
- **WHEN** un usuario abre la pestaña "Entrenadores" de un equipo de temporada cerrada
- **THEN** la interfaz no ofrece el modo edición para quitar sesiones
