## MODIFIED Requirements

### Requirement: Guardar jornada
El botón "💾 GUARDAR JORNADA" SHALL llamar a `POST /equipos/:id/jornadas` con los datos del formulario y las participaciones actuales; al completarse con éxito SHALL refrescar el historial de jornadas (inventario 04 § Pantalla 2 § Botón GUARDAR JORNADA). Cuando `equipo.temporada.estado === 'cerrada'`, el frontend SHALL no mostrar el botón "GUARDAR JORNADA" (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Guardar refresca el historial
- **WHEN** un usuario pulsa "GUARDAR JORNADA" y la llamada responde con éxito, en un equipo de temporada abierta
- **THEN** la aplicación refresca la lista de "Historial de jornadas" para incluir la jornada guardada

#### Scenario: Botón Guardar Jornada ausente en temporada cerrada
- **WHEN** un usuario abre la pestaña "Minutaje" de un equipo de temporada cerrada
- **THEN** la interfaz no muestra el botón "GUARDAR JORNADA"

### Requirement: Lista de jugadores con pills de participación
El frontend SHALL mostrar, debajo del formulario de jornada, una fila por miembro activo con: número, nombre (clicable, abre el panel de estadísticas), y pills `CONV`/`JUG`/`TIT`/`LES`/`SAN`/`ENF`/`VAC`/`NJ` que aplican client-side las mismas reglas de exclusividad y dependencia del Requirement "Reglas de negocio de participación" antes de enviar el cambio al backend, con indicación visual clara de qué pills están activas (inventario 04 § Pantalla 2 § Lista de jugadores). Cuando `equipo.temporada.estado === 'cerrada'`, las pills SHALL ser no interactivas (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Pulsar la pill LES desmarca SAN si estaba activa
- **WHEN** un jugador de un equipo con temporada abierta tiene la pill `SAN` activa y el usuario pulsa `LES`
- **THEN** la interfaz desactiva `SAN` y activa `LES` antes de enviar el cambio

#### Scenario: Pills no interactivas en temporada cerrada
- **WHEN** un usuario hace click en una pill de participación de un equipo cuya temporada tiene `estado: 'cerrada'`
- **THEN** el estado de la pill no cambia
