# design-system Specification

## Purpose
Sistema de diseño global de UKE: tokens de color/tipografía/espaciado/radio/sombra/z-index y el contrato de estilo presentacional para AppShell, tarjetas, tablas, pills, banners, overlays, panel, admin, formularios y estados de carga/vacío. Mobile-first, sin librerías de UI nuevas (creado al archivar el change add-design-system).

## Requirements

### Requirement: Tokens globales de color
El sistema SHALL definir, en una hoja de estilos global (`tokens.css`), variables CSS custom properties para: color de marca (verde UKE, derivado de `#1a5228`/`#0c2613` de los mockups `UKE_F7_Asistentziak.html`/`UKE_Eskola_Asistentziak.html`), colores semánticos (`success`/`warning`/`danger`/`neutral`), colores de equipo (`verde`/`rojo`/`azul`, según el enum `equipo.color` de `98-modelo-datos.md`), colores de semáforo (`verde`/`rojo`/`sin-datos`), colores de superficie (`background`/`card`/`sidebar`/`topbar`), colores de texto (`primary`/`secondary`/`disabled`), y colores de borde, anillo de foco y overlay backdrop (`design.md` § D1, D2, D3, D5).

#### Scenario: Tokens de color disponibles globalmente
- **WHEN** cualquier componente de `apps/web` importa `tokens.css`
- **THEN** puede referenciar `var(--color-success)`, `var(--color-warning)`, `var(--color-danger)`, `var(--color-neutral)`, `var(--color-team-verde)`, `var(--color-team-rojo)`, `var(--color-team-azul)`, `var(--color-semaforo-verde)`, `var(--color-semaforo-rojo)`, `var(--color-semaforo-sin-datos)` sin redefinirlos localmente

### Requirement: Tokens de tipografía, espaciado, radio, sombra y z-index
El sistema SHALL definir en `tokens.css` una pila tipográfica `system-ui` (sin fuente externa, por rendimiento en móvil), una escala de tamaño `xs`/`sm`/`base`/`lg`/`xl`/`2xl` en `rem`, pesos `normal`/`medium`/`semibold`/`bold`; una escala de espaciado en base 4px (`1,2,3,4,6,8,12,16,24,32`); una escala de radio de borde `sm`/`md`/`lg`/`full`; una escala de sombra `sm`/`md`; y una escala de z-index `base`/`overlay`/`modal`/`toast` (`design.md` § Goals; sin fuente propia = vendor-agnostic, requisito de PWA mobile-first, `project.md` § Frontend).

#### Scenario: Escala tipográfica sin fuente externa
- **WHEN** se inspecciona `font-family` en cualquier elemento de texto de la aplicación
- **THEN** el valor resuelto es la pila `system-ui` (sin `@import` ni `<link>` a una fuente externa)

#### Scenario: Espaciado consistente en base 4px
- **WHEN** se usa cualquier token de espaciado (`--space-1` a `--space-32`)
- **THEN** su valor es un múltiplo de 4px

### Requirement: Chrome de la aplicación en tema claro
El frontend SHALL usar un fondo claro (`--color-bg` en el rango `#f7f8f7`) como superficie dominante de todas las pantallas autenticadas, reservando el verde oscuro de marca (`#071a0c`/`#0c2613`) como acento (topbar en desktop, botones primarios, estados activos), no como fondo dominante (`design.md` § D2 — decisión de diseño sin mockup único, documentada por discrepancia entre los 7 mockups de referencia).

#### Scenario: Fondo claro en pantallas autenticadas
- **WHEN** un usuario autenticado navega a cualquier pantalla de la aplicación (catálogo, asistencia, minutaje, panel, admin)
- **THEN** el fondo de la superficie principal usa `var(--color-bg)` en el rango claro, no un fondo verde oscuro dominante

### Requirement: Estilo del AppShell
El `AppShell` SHALL tener una topbar de altura fija con nombre de la app, toggle de idioma y badge de usuario; en viewport móvil (`<768px`) la navegación por categoría SHALL mostrarse como barra inferior fija con indicador de pestaña activa y `padding` que respeta las áreas seguras del dispositivo (`env(safe-area-inset-*)`); en viewport de escritorio (`>=768px`) SHALL mostrarse como sidebar lateral (`design.md` § D7; `project.md` § Frontend, PWA mobile-first). La topbar SHALL envolver (`flex-wrap`) su contenido en vez de recortarlo cuando el ancho de viewport es insuficiente para mostrar todos sus elementos en una sola fila.

#### Scenario: Navegación inferior en móvil
- **WHEN** el `AppShell` se renderiza en un viewport de 375px de ancho
- **THEN** la navegación por categoría aparece como barra fija en la parte inferior de la pantalla, con la pestaña activa visualmente distinguida

#### Scenario: Sidebar en escritorio
- **WHEN** el `AppShell` se renderiza en un viewport de 1280px de ancho
- **THEN** la navegación por categoría aparece como sidebar lateral, no como barra inferior

#### Scenario: Topbar no recorta contenido en móvil
- **WHEN** la topbar del `AppShell` se renderiza en un viewport de 375px con badge de usuario, enlace a panel y botón de salir
- **THEN** todos los elementos son visibles (envueltos en una o más filas), ninguno queda recortado fuera del viewport

### Requirement: Estilo de EquipoCard
`EquipoCard` SHALL mostrar el punto de color existente (`equipo.color`, un valor hex libre introducido por el admin — `apps/api/prisma/schema.prisma`, campo `color String?`) sin remapearlo a una paleta fija, con tamaño y forma consistentes, un estado visual de `hover` en escritorio y un estado de retroalimentación táctil (`active`/`:active`) en móvil al pulsar la tarjeta (`design.md` § D5, corregido tras inspeccionar el código; `99-decisiones.md` proposal de `add-catalogo-equipos`, tarjeta de equipo).

#### Scenario: Punto de color respeta el valor libre de equipo.color
- **WHEN** se renderiza una `EquipoCard` para un equipo con `color: '#3498db'`
- **THEN** el punto de color de la tarjeta usa ese valor exacto como `background-color`, sin sustituirlo por un token de la paleta de diseño

#### Scenario: Retroalimentación táctil al pulsar
- **WHEN** un usuario en móvil pulsa una `EquipoCard`
- **THEN** la tarjeta muestra un cambio visual inmediato (opacidad o escala reducida) mientras se mantiene pulsada

### Requirement: Colores de celda de asistencia Eskola/F7
Las celdas de asistencia de los módulos Eskola/F7 SHALL colorearse: `P` con `var(--color-success)`, `A` con `var(--color-danger)`, vacío/"sin marcar" con `var(--color-neutral)`, cumpliendo un tamaño mínimo de `44px x 44px` como objetivo táctil (`UKE_F7_Asistentziak.html`/`UKE_Eskola_Asistentziak.html` — colores `#27ae60`/`#e74c3c`; `design.md` § D7, objetivo táctil).

#### Scenario: Celda P en verde
- **WHEN** una celda de asistencia tiene estado `P`
- **THEN** su color de fondo o texto usa `var(--color-success)`

#### Scenario: Celda A en rojo
- **WHEN** una celda de asistencia tiene estado `A`
- **THEN** su color de fondo o texto usa `var(--color-danger)`

#### Scenario: Tamaño táctil mínimo de celda
- **WHEN** se mide una celda de asistencia en cualquier viewport
- **THEN** su área táctil es de al menos 44x44px

### Requirement: Colores de los 10 estados de asistencia F11
Cada uno de los 10 códigos de estado de F11 (`1`, `EM`, `RC`, `VA`, `LS`, `EN`, `TR`, `EX`, `OT`, `NJ`) SHALL tener un color propio y distinguible, definido como token dedicado (`--color-estado-f11-<codigo>`), independiente de la tríada semántica success/warning/danger, derivado de la paleta ya usada en `UKE Asistencias F11 FINAL.html` (`design.md` § D4).

#### Scenario: Cada estado F11 tiene un color distinto
- **WHEN** se renderizan celdas con los 10 códigos de estado F11 en la misma tabla
- **THEN** cada código usa un `--color-estado-f11-<codigo>` distinto de los otros 9

### Requirement: Cabecera de sesión de tipo partido
La cabecera de una columna de sesión SHALL mostrar un fondo distintivo (azul, `var(--color-info)` o equivalente) cuando la sesión es de `tipo: partido`, diferenciándola de las sesiones de `tipo: entrenamiento` (`UKE Asistencias F11 FINAL.html` § cabecera de sesión, fondo azul para partido; inventario 03).

#### Scenario: Fondo azul en cabecera de partido
- **WHEN** una columna de sesión tiene `tipo: 'partido'`
- **THEN** su cabecera muestra un fondo azul distintivo, distinto del de las columnas de `tipo: 'entrenamiento'`

### Requirement: Primera columna fija en tablas de asistencia en móvil
En viewport móvil, la primera columna (nombre del jugador/entrenador) de las tablas de asistencia SHALL permanecer fija (`sticky`) al hacer scroll horizontal de las columnas de sesión (`project.md` § Frontend, mobile-first; `design.md` § D7).

#### Scenario: Columna de nombre fija al hacer scroll
- **WHEN** un usuario hace scroll horizontal sobre una tabla de asistencia en un viewport de 375px
- **THEN** la columna con el nombre del miembro permanece visible en la posición izquierda

### Requirement: Colores de pill de porcentaje por umbral
Toda pill de porcentaje (asistencia Eskola/F7, F11, minutaje) SHALL colorearse según el resultado ya calculado por el umbral de su módulo (`99-decisiones.md` § G-C3: Eskola/F7 ≥80/≥60, F11 ≥85/≥60, minutaje ≥70/≥50): verde (`var(--color-success)`) para el nivel superior, ámbar (`var(--color-warning)`) para el intermedio, rojo (`var(--color-danger)`) para el inferior, y gris neutro con el texto `"--"` (`var(--color-neutral)`) cuando no hay datos. El sistema de diseño SHALL proveer únicamente el color por resultado; el cálculo del umbral numérico permanece en cada módulo funcional, sin duplicarlo (`design.md` § D3).

#### Scenario: Pill verde en umbral superior
- **WHEN** un módulo calcula que un porcentaje está en su umbral superior (p.ej. Eskola/F7 `>=80`)
- **THEN** la pill correspondiente usa `var(--color-success)`

#### Scenario: Pill gris con "--" sin datos
- **WHEN** un porcentaje no tiene datos suficientes para calcularse (denominador 0)
- **THEN** la pill muestra el texto `"--"` con `var(--color-neutral)`

### Requirement: Colores de las pills de participación de minutaje
Cada pill de participación de minutaje (`CONV`, `JUG`, `TIT`, `LES`, `SAN`, `ENF`, `VAC`, `NJ`) SHALL tener un color distintivo propio en su estado activo, y un estado visual inactivo (menor contraste/opacidad) cuando no está marcada, de forma que las 8 pills sean distinguibles entre sí sin depender únicamente del texto (`UKE SEGUIMIENTO Minutos Final.html` § pills de participación; `design.md` § D1). La celda que contiene las 8 pills SHALL evitar que se apilen verticalmente en viewports estrechos (`white-space: nowrap` sobre la celda o equivalente), permitiendo scroll horizontal de la fila en su lugar.

#### Scenario: Pill activa visualmente distinta de inactiva
- **WHEN** se renderiza la fila de un jugador con la pill `LES` activa y el resto inactivas
- **THEN** `LES` muestra su color distintivo a máximo contraste y las demás pills muestran el estado visual inactivo

#### Scenario: Pills en una sola fila en móvil
- **WHEN** la fila de participación de un jugador se renderiza en un viewport de 375px
- **THEN** las 8 pills permanecen en una única fila horizontal (con scroll horizontal si es necesario), no apiladas una debajo de otra

### Requirement: Estilo del banner de solo lectura
El `ReadOnlyBanner` SHALL usar un tono neutro o de advertencia suave (no el color de `danger`), con suficiente contraste para ser notado sin transmitir un error, y SHALL permanecer visible sin bloquear la interacción con el contenido debajo (`99-decisiones.md` § G-A7; `add-historico` proposal, banner de solo lectura; `design.md` § Goals).

#### Scenario: Banner no usa color de error
- **WHEN** se renderiza el `ReadOnlyBanner` sobre un equipo de temporada cerrada
- **THEN** su color de fondo/texto usa un token neutro o de `warning`, no `var(--color-danger)`

### Requirement: Estilo de modal y overlay
Todo modal/overlay (alta de jugador, nota de asistencia, ficha del jugador) SHALL mostrar un backdrop semitransparente (`var(--color-overlay-backdrop)`) usando el token de z-index `overlay`/`modal`, un botón de cierre visible en la esquina superior, y SHALL permitir scroll interno del contenido sin desplazar la página subyacente en móvil (`design.md` § Goals; z-index scale).

#### Scenario: Backdrop semitransparente sobre el contenido
- **WHEN** se abre cualquier modal/overlay
- **THEN** el fondo detrás usa `var(--color-overlay-backdrop)` y el modal se posiciona por encima usando el z-index de `modal`

#### Scenario: Scroll interno sin desplazar la página
- **WHEN** el contenido de un modal excede la altura de la pantalla en móvil
- **THEN** el scroll ocurre dentro del modal, no en el `body` de la página

### Requirement: Estilo del overlay de ficha del jugador
El overlay de ficha del jugador SHALL mostrar el avatar en un tamaño consistente con el resto de la aplicación (mismo token de tamaño de avatar en tabla y ficha), una cuadrícula de estadísticas de 4 columnas en escritorio que colapsa a 2 columnas en móvil, y barras de progreso mensual coloreadas según el mismo token de umbral que las pills de porcentaje (Requirement "Colores de pill de porcentaje por umbral") (`add-asistencia-jugadores` spec, overlay de ficha; `design.md` § D3).

#### Scenario: Cuadrícula de estadísticas colapsa en móvil
- **WHEN** el overlay de ficha se renderiza en un viewport de 375px
- **THEN** la cuadrícula de 4 estadísticas se muestra en 2 columnas

#### Scenario: Barra de progreso mensual usa el color de umbral
- **WHEN** un mes de la ficha tiene un porcentaje que cae en el umbral de `warning`
- **THEN** su barra de progreso usa `var(--color-warning)`

### Requirement: Indicador de semáforo en las tarjetas del panel
Las tarjetas de `PanelPage` SHALL mostrar el indicador de `semaforo` (verde/rojo/neutro) como el elemento visualmente más prominente de la tarjeta (mayor tamaño o posición destacada frente a los chips de asistencia/minutaje), usando `var(--color-semaforo-verde)`, `var(--color-semaforo-rojo)` y `var(--color-semaforo-sin-datos)` (`99-decisiones.md` § G-A6: "panel con indicadores visuales por equipo, semáforo verde/rojo"; `add-panel-estado` spec).

#### Scenario: Semáforo rojo destaca sobre los chips
- **WHEN** una tarjeta del panel tiene `semaforo: 'rojo'`
- **THEN** el indicador de semáforo usa `var(--color-semaforo-rojo)` y es el elemento de mayor prominencia visual de la tarjeta

### Requirement: Estilo del layout de administración
`AdminLayout` SHALL mostrar sidebar de navegación en escritorio (`>=768px`) y colapsar a una navegación superior o menú desplegable en móvil (`<768px`); los campos de formulario del backoffice SHALL seguir el mismo estilo de input/label/error definido para el resto de la aplicación (Requirement "Estilo de formularios") (`add-backoffice` spec; `design.md` § D6, D7).

#### Scenario: Sidebar colapsa en móvil
- **WHEN** `AdminLayout` se renderiza en un viewport de 375px
- **THEN** la navegación de administración no ocupa una sidebar lateral fija, sino un patrón de navegación compacto (superior o desplegable)

### Requirement: Patrón consistente de estado de carga
Toda vista que espera datos asíncronos SHALL mostrar un patrón de carga consistente (skeleton o spinner, pero el mismo patrón reutilizado en todos los módulos), evitando que la pantalla aparezca vacía o rota mientras se resuelve la petición (`design.md` § Goals, interaction polish).

#### Scenario: Patrón de carga visible durante la petición
- **WHEN** una vista realiza una petición de datos que aún no ha resuelto
- **THEN** la vista muestra el patrón de carga definido (skeleton o spinner), no un contenido vacío o roto

### Requirement: Estilo de formularios
Los campos de formulario (`input`, `select`, `textarea`, `label`) SHALL compartir un estilo base consistente (padding, radio de borde, color de borde) usando los tokens definidos, SHALL mostrar un estado de error visualmente distinguible (borde/texto en `var(--color-danger)`) y un estado deshabilitado con contraste reducido (`design.md` § Goals). Los formularios y grupos de campos SHALL tener espaciado consistente entre etiquetas/campos adyacentes (mediante `gap` en contenedores flex o márgenes en `label`), evitando que campos consecutivos aparezcan sin separación visual independientemente de si el contenedor padre es un `<form>` u otro elemento de agrupación.

#### Scenario: Campo con error usa color de danger
- **WHEN** un campo de formulario tiene un error de validación
- **THEN** su borde o mensaje de error usa `var(--color-danger)`

#### Scenario: Campo deshabilitado con contraste reducido
- **WHEN** un campo de formulario está deshabilitado
- **THEN** se muestra con menor contraste que un campo habilitado, sin ser ilegible

#### Scenario: Separación entre campos consecutivos
- **WHEN** dos campos de formulario (label+input) se renderizan uno junto a otro, dentro de un `<form>` o de otro contenedor de agrupación
- **THEN** existe un espacio visible entre ambos, sin que sus bordes o textos se toquen

### Requirement: Retroalimentación táctil e interacción
Todo elemento interactivo (celda, pill, botón, tarjeta, pestaña) SHALL mostrar un estado visual de `:active`/pulsación en menos de 100ms, un estado de foco visible para navegación por teclado (`:focus-visible` con `var(--color-focus-ring)`), y las transiciones de cambio de pestaña o apertura/cierre de overlay SHALL durar como máximo 200ms (`design.md` § Goals, interaction polish; `project.md` § Frontend, mobile-first — evitar animaciones pesadas en móvil).

#### Scenario: Foco visible por teclado
- **WHEN** un usuario navega con teclado (Tab) hasta un elemento interactivo
- **THEN** el elemento muestra un anillo de foco visible usando `var(--color-focus-ring)`

#### Scenario: Transición de overlay no excede 200ms
- **WHEN** se abre o cierra un modal/overlay
- **THEN** la duración de la transición no supera 200ms

### Requirement: Patrón consistente de estado vacío
Todo listado o tabla sin datos SHALL mostrar un estado vacío consistente (texto + icono simple, sin ilustraciones), reutilizando el mismo patrón visual en todos los módulos (`design.md` § Goals, interaction polish; ya usado como texto en `add-minutaje`/`add-asistencia-jugadores`, p.ej. "Sin jornadas registradas aún").

#### Scenario: Estado vacío con texto e icono
- **WHEN** un listado o tabla no tiene ningún dato que mostrar
- **THEN** se muestra un mensaje de texto acompañado de un icono simple, siguiendo el mismo patrón visual usado en el resto de la aplicación

### Requirement: Verificación visual manual por componente antes de archivar
Antes de archivar este change, cada una de las 14 categorías de componentes listadas en la propuesta SHALL verificarse manualmente en un viewport móvil (375px) y uno de escritorio (`>=1280px`) contra este `design.md` — no contra los mockups HTML originales, que son mutuamente inconsistentes — para detectar regresiones visuales que la suite de tests de comportamiento no puede capturar (`design.md` § Risks, § Migration Plan).

#### Scenario: Verificación completada antes del archive
- **WHEN** se solicita archivar el change `add-design-system`
- **THEN** las 14 categorías de componentes han sido revisadas manualmente en 375px y en `>=1280px` contra `design.md`, sin regresiones de layout pendientes
