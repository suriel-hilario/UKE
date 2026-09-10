## MODIFIED Requirements

### Requirement: Página del panel con tarjetas por categoría
El frontend SHALL mostrar en `/panel` un selector de temporada (preseleccionando la única temporada `abierta` si existe exactamente una, mismo criterio que `AppShell.tsx` — `design.md` § D7), mostrando junto a cada temporada con `estado: 'cerrada'` un badge o etiqueta "cerrada" (`add-historico` `design.md` § D7), y, para la temporada seleccionada, una sección por `categoria` (Eskola / F7 / F11) con una tarjeta por equipo visible; un `coordinador` SHALL ver únicamente la sección de su categoría. Cada tarjeta SHALL mostrar `nombre`, badge de `categoria`, indicador de `semaforo` (🟢 verde / 🔴 rojo / neutro para `sin_datos`), chip de estado de asistencia (✅ Al día / ⚠️ Pendiente), chip de estado de minutaje (✅ Al día / ⚠️ Pendiente / — para `eskola`) y los timestamps de última actualización (`99-decisiones.md` § G-A6: "panel con indicadores visuales por equipo, semáforo verde/rojo").

#### Scenario: Coordinador ve solo su sección
- **WHEN** un `coordinador` de `f7` abre `/panel`
- **THEN** solo se muestra la sección F7, sin Eskola ni F11

#### Scenario: Tarjeta de equipo al día
- **WHEN** un equipo tiene `asistencia_pendiente: false` y `minutaje_pendiente: false`
- **THEN** su tarjeta muestra 🟢 y ambos chips en estado "Al día"

#### Scenario: Chip de minutaje ausente en Eskola
- **WHEN** se muestra la tarjeta de un equipo `eskola`
- **THEN** el chip de minutaje muestra "—" en vez de "Al día" o "Pendiente"

#### Scenario: Badge de temporada cerrada en el selector del panel
- **WHEN** el selector de temporada de `/panel` lista una temporada con `estado: 'cerrada'`
- **THEN** esa entrada del selector muestra la etiqueta "cerrada"
