## Why

Director y coordinadores no tienen forma de saber, sin entrar equipo por equipo, qué equipos tienen asistencia o minutaje sin registrar hasta hoy. `99-decisiones.md` § G-A6 decide explícitamente un panel derivado (sin tabla propia) con semáforo verde/rojo por equipo y por tipo (asistencia/minutaje) para cubrir ese seguimiento sin necesidad de "acceder a los datos individuales de cada equipo".

## What Changes

- Backend: nuevo módulo `panel` de solo lectura, sin cambios de schema (`98-modelo-datos.md` § 5, "derivado, no tabla").
  - `GET /panel/estado?temporada_id=` — estado agregado de todos los equipos visibles al usuario, agrupados por `categoria`. Scope: `director` (todos), `coordinador` (su `categoria_asignada`); `admin` y `entrenador` denegados (`99-decisiones.md` § G-B1, el panel no aparece en ninguna columna de la matriz para esos roles salvo director/coordinador con "Módulos deportivos").
  - `GET /panel/estado/:equipoId` — detalle de un equipo: mismos campos agregados más el listado de sesiones y jornadas pendientes que lo ponen en rojo. Mismo scope.
  - Cálculo derivado sobre `sesion`, `registro_asistencia`, `jornada`, `participacion_jornada`, `miembro_equipo`, `bloque` ya existentes — sin nueva tabla (`98-modelo-datos.md` § 5: "derivado, no tabla"). Excepción: `registro_asistencia` y `participacion_jornada` no tienen ningún campo de timestamp de modificación en el schema actual; se añade `updatedAt` (migración aditiva, sin backfill) a ambos modelos — la única forma real de dar `ultima_actualizacion_*`. Detalle en `design.md`.
- Frontend: nueva ruta `/panel`, enlazada desde el shell de navegación, visible solo para `director`/`coordinador` (`RoleGuard`, mismo patrón que `/admin`).
  - Selector de temporada (activa por defecto), tres secciones por `categoria` (coordinador ve solo la suya), tarjeta de equipo con semáforo, chips de estado de asistencia/minutaje y timestamps de última actualización.
  - Drawer/modal de detalle con el listado de sesiones y jornadas pendientes por equipo.
  - Auto-refresh cada 60s sondeando `GET /panel/estado` (`99-decisiones.md` § G-A6, "facilitar el seguimiento sin necesidad de acceder a los datos individuales de cada equipo").
  - Literales EU/ES, euskera por defecto (`99-decisiones.md` § G-C5).
- Sin operaciones de escritura en este change (fuera de alcance: notificaciones, histórico).

## Capabilities

### New Capabilities
- `panel-estado`: endpoints de estado derivado (asistencia/minutaje pendientes, semáforo, timestamps) y la página `/panel` con sus tarjetas y detalle por equipo.

### Modified Capabilities
- `catalogo-equipos`: el shell de navegación persistente (`Shell de navegación persistente para roles no-admin`) añade un enlace a `/panel`, visible solo para `director`/`coordinador`.

## Impact

- **Backend**: nuevo módulo `apps/api/src/panel/` (controller + service + access/scope check propio o reutilización acotada de la lógica de scope ya existente en `AsistenciaAccessService`/`CatalogoAccessService` — a decidir en `design.md`, dado que ninguno de los dos matchea exactamente el scope de este panel: excluye `entrenador`, a diferencia de ambos). Migración pequeña y aditiva: `updatedAt` en `registro_asistencia` y `participacion_jornada` (ver `design.md`).
- **Frontend**: nuevo árbol `apps/web/src/panel/` (página, tarjetas, drawer de detalle, i18n), nueva entrada de navegación en el shell existente (`apps/web/src/catalogo/AppShell.tsx`), nueva ruta protegida en `App.tsx` con `RoleGuard roles={['director','coordinador']}`.
- **Fuera de alcance**: notificaciones (`add-notificaciones`, ya prevista por G-A5 pero no parte de este change), histórico (`add-historico`), cualquier operación de escritura, materialización del estado en tabla (solo si el rendimiento lo exige más adelante, per `98-modelo-datos.md` § 5).
