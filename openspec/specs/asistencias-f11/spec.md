# asistencias-f11 Specification

## Purpose
TBD - created by archiving change add-asistencias-f11. Update Purpose after archive.
## Requirements
### Requirement: Exportación CSV de temporada completa para F11
`GET /equipos/:id/asistencia/exportar` SHALL devolver, para equipos `f11`, un CSV de toda la temporada (no solo el mes indicado), separador `;`, con BOM UTF-8, columnas `SECCION;JUGADOR;ALIAS;%ANO;%MES;S<num>d<dia>...;TOT;EM;RC;LS;EN;TR;EX;VA;OT;NJ`, y nombre de fichero `Asistencias_<equipo.nombre>_<temporada.nombre>.csv` (inventario 03 § Acciones, Exportar CSV; `design.md` § D3).

#### Scenario: Exportar CSV de temporada F11
- **WHEN** un usuario con acceso hace `GET /equipos/:id/asistencia/exportar` sobre un equipo `f11`
- **THEN** el sistema responde con un CSV separado por `;`, con BOM UTF-8, que cubre todos los meses de la temporada con las columnas de contadores por estado

### Requirement: Tabla de asistencia F11 con secciones y contadores
El frontend SHALL mostrar, en la pestaña "Asistencia" de un equipo `f11`, una tabla con columnas `% AÑO`, `% MES`, `JUGADOR`, una columna por sesión del mes (cabecera: número de sesión o ⚽ si es partido con fondo azul, más día del mes) y columnas de contador por estado (`1`, `EM`, `RC`, `LS`, `EN`, `TR`, `EX`, `VA`, `OT`, `NJ`, mostrando solo los que sean `>0`); las filas SHALL agruparse en secciones "Con Ficha (N)", "Sin Ficha (N)" y "Entrenadores (N)", cada una con fila de total y media, y una fila "Total General" al final (inventario 03 § Tabla).

#### Scenario: Secciones con total y media
- **WHEN** un usuario abre la pestaña Asistencia de un equipo `f11` con jugadores en los tres grupos
- **THEN** la tabla muestra tres secciones ("Con Ficha (N)", "Sin Ficha (N)", "Entrenadores (N)") cada una con su fila de total y media, y una fila "Total General" al final

#### Scenario: Contadores solo muestran estados con marcas
- **WHEN** un jugador no tiene ninguna marca de un estado concreto en el mes
- **THEN** ese contador no se muestra (o se omite), mostrando solo los estados con conteo `>0`

### Requirement: Umbrales de color F11
Los porcentajes (`% AÑO`, `% MES`) SHALL colorearse según los umbrales de F11: `>=85` verde, `>=60` ámbar, `>0` rojo, `0` o sin datos gris con `"--"` (`99-decisiones.md` § G-C3, fila F11) — distintos de los umbrales de Eskola/F7 (`>=80`/`>=60`/`<60`).

#### Scenario: Porcentaje sin datos muestra gris y "--"
- **WHEN** un jugador no tiene ninguna sesión que compute
- **THEN** su celda de `% AÑO`/`% MES` muestra `"--"` con el estilo de "sin datos", no rojo

### Requirement: Menú contextual de marcado de estado
El frontend SHALL abrir, al hacer click en una celda de asistencia, un menú contextual "MARCAR SESIÓN" con los 10 estados (el estado actual, si existe, marcado); seleccionar uno SHALL llamar a `PATCH /equipos/:id/asistencia` con ese `estado` y cerrar el menú (inventario 03 § Pantalla 2 § Acciones). Cuando `equipo.temporada.estado === 'cerrada'`, el click sobre una celda SHALL NOT abrir el menú contextual — el backend ya rechaza la escritura con 409 sobre el mismo endpoint que usa `add-asistencia-jugadores` (Requirement "Escritura bloqueada con temporada cerrada" de esa capability); esto es una mejora de UX preventiva (`99-decisiones.md` § G-A7; `add-historico` `design.md` § D6).

#### Scenario: Seleccionar un estado del menú
- **WHEN** un usuario hace click en una celda vacía de un equipo con temporada abierta y selecciona "EM" del menú contextual
- **THEN** la aplicación llama a `PATCH /equipos/:id/asistencia` con `estado: "EM"` y la celda pasa a mostrar "EM"

#### Scenario: Menú contextual no se abre en temporada cerrada
- **WHEN** un usuario hace click en una celda de asistencia de un equipo cuya temporada tiene `estado: 'cerrada'`
- **THEN** el menú contextual "MARCAR SESIÓN" no se abre y no se llama a `PATCH /equipos/:id/asistencia`

### Requirement: Marcar todos como presente en una sesión
Cada cabecera de sesión SHALL mostrar un botón "✓" que, al pulsarse, marca `estado: "1"` para todos los miembros de los tres grupos que no tengan ya una marca en esa sesión, mediante llamadas repetidas a `PATCH /equipos/:id/asistencia` (no existe un endpoint de marcado masivo — `design.md` de este change) (inventario 03 § Acciones, ✓ en cabecera de sesión).

#### Scenario: Marcar todos los no-marcados
- **WHEN** un usuario pulsa "✓" en la cabecera de una sesión con 2 jugadores sin marcar y 3 ya marcados
- **THEN** la aplicación llama a `PATCH /equipos/:id/asistencia` con `estado: "1"` para los 2 jugadores sin marcar, y no toca los 3 ya marcados

### Requirement: Barra de estadísticas del mes
El frontend SHALL mostrar, sobre la tabla, una barra con: Equipo, Mes, Sesiones (del mes), Total temporada (sesiones acumuladas), nº Con Ficha, nº Sin Ficha, Asistencias (total de marcas que computan: `1`/`EM`/`RC`), Media general % y Media ficha % (inventario 03 § Pantalla 2 § Barra de estadísticas).

#### Scenario: Barra de estadísticas refleja el mes seleccionado
- **WHEN** un usuario cambia de mes
- **THEN** la barra de estadísticas se actualiza con los valores del nuevo mes

### Requirement: Leyenda de los 11 estados
El frontend SHALL mostrar una leyenda con los 11 estados (los 10 códigos más "sin marcar"), cada uno con su etiqueta en euskera y castellano (inventario 03 § Pantalla 2 § Leyenda).

#### Scenario: Leyenda visible en la pestaña Asistencia F11
- **WHEN** un usuario abre la pestaña Asistencia de un equipo `f11`
- **THEN** ve una leyenda con los 11 estados y sus etiquetas

### Requirement: Overlay de ficha del jugador F11 extendido
El overlay de ficha del jugador (base común con Eskola/F7: avatar, subida de foto, nombre editable, eliminar) SHALL incluir, para equipos `f11`, una sección "Resumen temporada" con los contadores por estado (solo los `>0`) y una sección "Evolución mensual" con, por cada mes, una barra de porcentaje coloreada y una fila de puntos con el estado de cada sesión de ese mes (inventario 03 § Panel lateral Ficha del jugador).

#### Scenario: Resumen temporada solo muestra estados con marcas
- **WHEN** un jugador F11 tiene marcas de `1`, `EM` y `LS` a lo largo de la temporada, y ningún otro estado
- **THEN** "Resumen temporada" muestra solo esos tres contadores

#### Scenario: Evolución mensual muestra un punto por sesión
- **WHEN** un usuario abre la ficha de un jugador F11 con marcas en 3 sesiones de un mes
- **THEN** "Evolución mensual" muestra, para ese mes, una fila con 3 puntos, cada uno con el estado de su sesión

### Requirement: Reordenar jugadores por arrastre
El frontend SHALL permitir arrastrar una fila de jugador para reordenarla dentro de su grupo (`draggable` HTML5 nativo, sin librería — `design.md` § D7), llamando a `PATCH /equipos/:id/miembros/:miembroId` con el nuevo `orden` de cada fila afectada al soltar (inventario 03 § Acciones, arrastrar fila).

#### Scenario: Arrastrar una fila en desktop
- **WHEN** un usuario en desktop arrastra una fila de jugador a una nueva posición dentro de su grupo
- **THEN** la aplicación llama a `PATCH /equipos/:id/miembros/:miembroId` actualizando `orden` para las filas afectadas

#### Scenario: Reordenar en móvil no soportado en esta versión
- **WHEN** un usuario en un dispositivo táctil intenta arrastrar una fila
- **THEN** la interacción no está soportada en esta versión (el drag & drop HTML5 nativo no cubre touch de forma fiable); el reordenamiento sigue disponible desde un dispositivo con ratón (`design.md` § D7, riesgo aceptado)

### Requirement: Literales bilingües del módulo F11
Todos los literales nuevos de la tabla F11 (menú contextual, contadores, barra de estadísticas, leyenda, secciones) SHALL existir en euskera y castellano, con euskera como idioma por defecto (`99-decisiones.md` § G-C5) — el mockup arranca en castellano, pero esa es una convención del mockup, no del producto (ya descartada en `add-asistencia-jugadores`).

#### Scenario: Literales en castellano
- **WHEN** un usuario con preferencia de idioma `es` abre la pestaña Asistencia de un equipo F11
- **THEN** todos los literales nuevos (leyenda, barra de estadísticas, menú contextual) se muestran en castellano
