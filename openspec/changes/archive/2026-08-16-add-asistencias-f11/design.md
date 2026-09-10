## Context

`add-asistencia-jugadores` implementó todo el backend de asistencia (`SesionesService`, `FichaService`, `PlantillaService`) con el modelo P/A hardcodeado: `upsertRegistro` valida `estado` contra `['P', 'A']` a secas, y tanto `FichaService.getFicha` como `SesionesService.exportarCsv`/`getAsistenciaMensual` cuentan `estado === 'P'` como único numerador. F11 necesita 10 estados con un subconjunto distinto que computa como asistencia, más columnas de contadores y un export de temporada completa con formato distinto. Todo esto se añade generalizando ese código existente por `equipo.categoria`, sin tocar el comportamiento ya probado de Eskola/F7.

## Goals / Non-Goals

**Goals:**
- Generalizar `estado`/numerador por categoría en un único lugar, reutilizado por registro, ficha y export — sin duplicar la lista de estados válidos en varios sitios.
- Tabla F11 en el frontend como componente propio, sin modificar `AsistenciaTab.tsx` (Eskola/F7).
- Reordenamiento (`orden`) expuesto en el `PATCH` de miembro ya existente.

**Non-Goals:**
- Pantalla de configuración del director (cubierta por `add-backoffice` + endpoints ya existentes).
- Vínculo sesión de partido ↔ jornada de FieldBook (`add-minutaje`).
- "Huecos" de exclusión global de sesión (fuera de alcance, confirmado en el proposal).
- Cualquier librería de drag & drop o de menús contextuales — se sigue el mismo enfoque nativo (sin dependencias) ya usado en `admin/equipos/MiembrosTable.tsx` (`add-backoffice`) para su propio reordenamiento por drag & drop.

## Decisions

**D1. Estados y numerador centralizados en `apps/api/src/asistencia/estados.ts`, indexados por `Categoria`.**
```ts
ESTADOS_VALIDOS: Record<Categoria, string[]>
  eskola: ['P', 'A'], f7: ['P', 'A'], f11: ['1','EM','RC','VA','LS','EN','TR','EX','OT','NJ']
ESTADOS_QUE_COMPUTAN: Record<Categoria, string[]>
  eskola: ['P'], f7: ['P'], f11: ['1', 'EM', 'RC']
```
`SesionesService.upsertRegistro` recibe ahora `categoria` (resuelta por el controller desde el `equipo` ya cargado) y valida contra `ESTADOS_VALIDOS[categoria]`; `FichaService.getFicha` y `SesionesService.exportarCsv`/`getAsistenciaMensual` usan `ESTADOS_QUE_COMPUTAN[categoria]` en vez de comparar contra `'P'` literal. Alternativa descartada: un flag booleano `esF11` — se descarta porque no escala si en el futuro se añade una cuarta taxonomía (`99-decisiones.md` § G-C2 ya avisa de que cada módulo mantiene la suya), mientras que indexar por `Categoria` sí.

**D2. `GET /equipos/:id/asistencia` añade `contadores: Record<string, number>` por miembro, calculado sobre las sesiones devueltas (del mes), para todas las categorías — no solo F11.**
Es más simple mantener una única forma de respuesta (siempre incluye `contadores`) que ramificar el shape de la respuesta por categoría; Eskola/F7 simplemente tendrá `{ P: n, A: m }`, que el frontend de Eskola/F7 ignora (ya no lo consume, sigue leyendo `registros` como hasta ahora). No es un campo nuevo observable por ninguna fuente para Eskola/F7, así que no se documenta como requirement de esa capability — es un efecto secundario inocuo de no bifurcar el código.

**D3. Export CSV bifurcado por categoría dentro de `SesionesService`: `exportarCsv` (existente, sin cambios, Eskola/F7) y `exportarCsvF11` (nuevo método, temporada completa).**
Se mantiene `exportarCsv` intacto para no arriesgar una regresión en Eskola/F7 (ya cubierto por tests). El nuevo método recorre todos los meses de la temporada (según `temporada.fecha_inicio`/`fecha_fin`) reutilizando `getAsistenciaMensual` por mes, agrega las columnas de contadores y el `%AÑO` (sobre todas las sesiones de la temporada, no solo el mes), y compone el CSV con `;`, BOM UTF-8 y el nombre de fichero `Asistencias_<equipo.nombre>_<temporada.nombre>.csv`. El controller decide qué método llamar según `equipo.categoria`.

**D4. `PlantillaService.updateJugador` añade `orden?: number` opcional; el controller `PATCH /equipos/:id/miembros/:miembroId` acepta el campo `orden` en el body.**
Cambio aditivo sobre un endpoint ya propio del módulo `asistencia` (no de `add-backoffice`), consistente con cómo se extendió en su momento para `nombre`/`fecha_baja`.

**D5. Frontend: `AsistenciaF11Tab.tsx` (y subcomponentes en `apps/web/src/asistencia/f11/`) como árbol de componentes separado de `AsistenciaTab.tsx`.**
`EquipoDetailPage` decide qué tabla renderizar según `equipo.categoria` (`eskola`/`f7` → `AsistenciaTab`; `f11` → `AsistenciaF11Tab`). Se descarta unificar ambas tablas en un componente parametrizado: la estructura visual y de interacción difiere demasiado (ciclo de 2 estados vs. menú contextual de 10, sin contadores/leyenda/stats-bar en Eskola/F7) — forzar una unificación produciría un componente con más ramas condicionales que las dos tablas por separado, violando el principio de mínima complejidad ya aplicado en el resto del proyecto.

**D6. Menú contextual de estado: `<div>` posicionado de forma absoluta en las coordenadas del click, sin librería — mismo enfoque minimalista que el resto de overlays del proyecto (`dialog` nativo para modales, sin dependencias de UI).**

**D7. Drag & drop: atributos HTML5 nativos (`draggable`, `onDragStart`/`onDragOver`/`onDrop`), replicando exactamente el patrón ya usado en `apps/web/src/admin/equipos/MiembrosTable.tsx` (`add-backoffice`) para su propio reordenamiento.**
Mismo límite ya aceptado en ese componente: el drag & drop HTML5 nativo no soporta touch de forma fiable en móvil (pulsación larga 600ms del inventario no se replica con esta API). Se documenta como riesgo aceptado, no como requirement incumplido — ninguna fuente exige que el drag funcione en touch salvo el propio mockup, y el patrón ya establecido en el proyecto para esta misma interacción (`MiembrosTable`) tiene la misma limitación sin que se haya pedido resolverla. El requirement de `specs/` sobre reordenamiento incluirá un escenario explícito de este comportamiento degradado en móvil, para que quede testeado como comportamiento esperado y no como bug silencioso.

## Risks / Trade-offs

- **[Riesgo] D7: el drag & drop no funciona en touch (móvil)** → Aceptado, mismo límite ya presente en `MiembrosTable` de `add-backoffice`; el proyecto es mobile-first (`project.md`) pero ningún requirement de un change anterior exigió soporte touch para esta interacción, y añadir una librería de gestos solo para esto contradice D7 y el minimalismo ya establecido.
- **[Riesgo] D3: `exportarCsvF11` recorre todos los meses de la temporada con N queries (una por mes vía `getAsistenciaMensual`)** → Aceptado dado el volumen (9 meses, equipos de decenas de jugadores); no se optimiza con una query agregada única por prematuro.
- **[Trade-off] D2: `contadores` siempre presente en la respuesta, aunque Eskola/F7 no lo use** → Aceptado por simplicidad de un único shape de respuesta; coste marginal (un `reduce` más por miembro).

## Migration Plan

No hay migración de BD (`registro_asistencia.estado` ya es `String` libre, sin `CHECK`; `miembro_equipo.orden` ya existe). Pasos de implementación:
1. `estados.ts` (D1) + generalizar `upsertRegistro`/`FichaService`/`getAsistenciaMensual` por categoría.
2. `exportarCsvF11` (D3) + `orden` en `PlantillaService`/controller (D4).
3. Frontend: `AsistenciaF11Tab` y subcomponentes (D5–D7), rama en `EquipoDetailPage`.

Rollback: sin migración de datos, revertir el deploy es suficiente. Los `registro_asistencia` con estados F11 ya creados seguirían siendo datos válidos (el campo es `String` libre) aunque se revirtiera el código de validación.

## Open Questions

Ninguna pendiente.
