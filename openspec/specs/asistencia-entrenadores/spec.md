# asistencia-entrenadores Specification

## Purpose
TBD - created by archiving change add-asistencia-entrenadores. Update Purpose after archive.
## Requirements
### Requirement: Lectura de asistencia mensual de entrenadores
`GET /equipos/:id/asistencia/entrenadores?bloque_id=&mes=` SHALL devolver, para equipos `f7`, las `sesion` del equipo para ese bloque y mes (`eliminada = false`) junto con el `registro_asistencia` de los `miembro_equipo` con `grupo = 'entrenador'` activos en la fecha de cada sesión, reutilizando la misma generación perezosa de sesiones (`ensureSesionesRegla`) y las mismas `sesion` que la asistencia de jugadores — no se genera un calendario paralelo (`design.md` § D1, D3 de `add-asistencia-entrenadores`). Un entrenador sin fila `registro_asistencia` para una sesión SHALL representarse como "sin marcar". El porcentaje mensual y de temporada SHALL calcularse con la misma fórmula que Eskola/F7 (numerador `P`, denominador sesiones elegibles según `fecha_incorporacion`/`fecha_baja`) y los mismos umbrales de color `>=80`/`>=60`/`<60` (`99-decisiones.md` § G-C3).

#### Scenario: Lectura solo incluye entrenadores
- **WHEN** un usuario con acceso al equipo hace `GET /equipos/:id/asistencia/entrenadores?bloque_id=<id>&mes=2026-09` sobre un equipo con jugadores (`grupo=con_ficha`) y entrenadores (`grupo=entrenador`)
- **THEN** la respuesta incluye únicamente los `miembro_equipo` con `grupo='entrenador'`

#### Scenario: Primera consulta del mes genera las mismas sesiones que jugadores
- **WHEN** un usuario hace `GET /equipos/:id/asistencia/entrenadores?bloque_id=<id>&mes=2026-09` para un equipo sin sesiones generadas aún ese mes
- **THEN** el sistema genera las `sesion` de `origen: regla` según `equipo.dias_entrenamiento`, idénticas a las que generaría `GET /equipos/:id/asistencia` para el mismo bloque y mes

#### Scenario: Entrenador sin registro aparece como sin marcar
- **WHEN** una sesión del mes consultado no tiene fila `registro_asistencia` para un entrenador activo en esa fecha
- **THEN** la respuesta representa su estado en esa sesión como "sin marcar"

### Requirement: Registro de asistencia P/A de entrenadores
`PATCH /equipos/:id/asistencia/entrenadores` SHALL crear o actualizar (upsert) una fila `registro_asistencia` identificada por `sesion_id` + `miembro_equipo_id`, aceptando opcionalmente `nota`, con los mismos estados válidos `P`/`A` que Eskola/F7 (`design.md` § D3 de `add-asistencia-entrenadores`). El sistema SHALL validar que el `miembro_equipo` referenciado tenga `grupo = 'entrenador'`, respondiendo 400 si se usa para marcar un miembro de otro grupo. SHALL responder 409 si la temporada del equipo está cerrada (mismo scope de escritura que el resto del módulo de asistencia — `director`/`coordinador`/`entrenador`, no `admin`).

#### Scenario: Marcar presente a un entrenador
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/asistencia/entrenadores` con `sesion_id`, `miembro_equipo_id` de un entrenador y `estado: "P"`
- **THEN** el sistema crea o actualiza el `registro_asistencia` correspondiente y responde 200

#### Scenario: Rechaza marcar asistencia sobre un jugador
- **WHEN** se hace `PATCH /equipos/:id/asistencia/entrenadores` con `miembro_equipo_id` de un miembro con `grupo` distinto de `entrenador`
- **THEN** el sistema responde 400 y no crea ni actualiza ningún `registro_asistencia`

#### Scenario: Estado inválido rechazado
- **WHEN** se hace `PATCH /equipos/:id/asistencia/entrenadores` con un `estado` distinto de `P` o `A`
- **THEN** el sistema responde con un error de validación (400)

#### Scenario: Intento de registrar asistencia en temporada cerrada
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/asistencia/entrenadores` sobre un equipo cuya temporada tiene `estado: cerrada`
- **THEN** el sistema responde 409 y no modifica ningún dato

### Requirement: Quitar y restaurar una sesión desde la pestaña de entrenadores
`PATCH /equipos/:id/asistencia/entrenadores/sesiones/:sesionId` SHALL permitir marcar `eliminada: true` (quitar día) o `eliminada: false` (restaurar) sobre la misma `sesion` que usa la asistencia de jugadores — no existe una `sesion` separada por grupo, por lo que quitar un día desde esta pestaña también lo quita de la vista de jugadores (`design.md` § D3 de `add-asistencia-entrenadores`).

#### Scenario: Quitar un día desde la pestaña de entrenadores
- **WHEN** un usuario con scope de escritura hace `PATCH /equipos/:id/asistencia/entrenadores/sesiones/:sesionId` con `eliminada: true`
- **THEN** la sesión deja de aparecer tanto en `GET /equipos/:id/asistencia/entrenadores` como en `GET /equipos/:id/asistencia`

### Requirement: Edición del rol de entrenador desde la ficha
El overlay de ficha, al abrirse sobre un `miembro_equipo` con `grupo = 'entrenador'`, SHALL mostrar un campo `rol_entrenador` editable inline que persiste vía `PATCH /equipos/:id/miembros/:miembroId` (`design.md` § D4, D5 de `add-asistencia-entrenadores`).

#### Scenario: Editar el rol de un entrenador desde su ficha
- **WHEN** un usuario con scope de escritura abre la ficha de un entrenador, cambia el campo de rol y confirma
- **THEN** la aplicación llama a `PATCH /equipos/:id/miembros/:miembroId` con `rol_entrenador` y la ficha muestra el valor actualizado

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

### Requirement: Literales bilingües del módulo de asistencia de entrenadores
Todos los literales nuevos de este módulo SHALL existir en euskera y castellano, con euskera como idioma por defecto (`99-decisiones.md` § G-C5).

#### Scenario: Literales en castellano
- **WHEN** un usuario con preferencia de idioma `es` abre la pestaña Entrenadores
- **THEN** todos los literales de esa pestaña se muestran en castellano
