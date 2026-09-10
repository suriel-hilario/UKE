## Why

Los equipos F7 necesitan registrar la asistencia de sus **entrenadores** (no jugadores) a los entrenamientos — un módulo separado con su propia tabla, ciclo P/A y ficha, análogo al de asistencia de jugadores pero para `miembro_equipo` con `grupo='entrenador'`. El modelo de datos y el scope de acceso ya existen desde `add-data-model` y `add-asistencia-jugadores`; falta la capability que expone la tabla y el registro (inventario 02, VALIDATED).

## What Changes

- Backend: 3 endpoints nuevos bajo `/equipos/:id/asistencia/entrenadores*`, reutilizando `AsistenciaAccessService` y la generación perezosa de sesiones ya existente (`SesionesService`), sin construir scope propio.
  - `GET /equipos/:id/asistencia/entrenadores?bloque_id=&mes=` — sesiones del mes (misma generación perezosa que asistencia de jugadores) con `registro_asistencia` de los `miembro_equipo` con `grupo='entrenador'` activos en cada fecha.
  - `PATCH /equipos/:id/asistencia/entrenadores` — upsert de un registro; valida que el `miembro_equipo` referenciado tenga `grupo='entrenador'` (rechaza si se usa para marcar jugadores); estados válidos `P`/`A` únicamente; 409 si la temporada está cerrada.
  - Fórmula de porcentaje idéntica a Eskola/F7 (numerador `P`, denominador sesiones elegibles según `fecha_incorporacion`/`fecha_baja`), mismos umbrales de color (`>=80`/`>=60`/`<60`).
  - `PlantillaService.updateJugador` (usado por `PATCH /equipos/:id/miembros/:miembroId`, scope director/coordinador/entrenador) se extiende para aceptar `rol_entrenador?: string` — actualmente solo el endpoint admin-only de `add-backoffice` lo soporta, y la ficha del entrenador de este módulo necesita edición inline accesible al coordinador/director sin pasar por backoffice.
  - Días de entrenamiento (incluyendo sábado para F7) ya son configurables por equipo (`equipo.dias_entrenamiento`, `add-asistencia-jugadores`) — sin cambios necesarios ahí.
  - `GET /miembros/:miembroId/ficha?equipo_id=` ya existente, sin cambios: funciona igual para `grupo='entrenador'`.
  - Sin cambios de schema.
- Frontend: pestaña "Entrenadores" en el detalle de equipo, solo para `categoria='f7'`, con tabla de asistencia (ciclo P/A, igual patrón que `AsistenciaTab` de Eskola/F7), fila "SESIÓN %", modo edición para quitar sesiones, y overlay de ficha del entrenador (reutilizando/extendiendo el overlay existente con edición inline de `rol_entrenador`).
- Todos los literales nuevos en EU/ES, euskera por defecto (G-C5).
- Exportación CSV de asistencia de entrenadores: NO incluida en este change.
  El inventario 02 no la documenta (a diferencia de inventario 01 que sí la
  especifica explícitamente). Fuera de alcance hasta que el club la solicite.
  Source: inventario 02 (ausencia de requirement); regla de trazabilidad de
  project.md ("lo no trazable no se especifica").

## Capabilities

### New Capabilities
- `asistencia-entrenadores`: registro de asistencia (P/A), tabla mensual, exportación CSV y ficha extendida (rol editable) para entrenadores de equipos F7.

### Modified Capabilities
- `asistencia-jugadores`: el requirement de `PATCH /equipos/:id/miembros/:miembroId` se extiende para aceptar `rol_entrenador` (además de `nombre`/`fecha_baja`/`orden` ya existentes).
- `catalogo-equipos`: la pestaña "Entrenadores" se añade a la barra de pestañas de `/equipos/:id`, solo para `categoria='f7'`.

## Impact

- **Backend**: nuevo servicio/controller en `apps/api/src/asistencia/` (mismo módulo que asistencia de jugadores, por cohesión de scope — a confirmar en `design.md`), reutilizando `AsistenciaAccessService`, `getBloqueActivo`, y el patrón de generación de sesiones ya existente. Extensión aditiva de `PlantillaService.updateJugador`.
- **Frontend**: nuevo árbol de componentes (ubicación a definir en `design.md`, probablemente `apps/web/src/asistencia/entrenadores/` siguiendo el patrón de `asistencia/f11/`), rama nueva en `EquipoDetailPage` para la pestaña "Entrenadores" condicionada a `categoria === 'f7'`.
- **Fuera de alcance**: asistencia de entrenadores para Eskola y F11 (el inventario 02 lo marca como deseado a futuro, pero solo hay mockup validado para F7 — no se puede transcribir sin inventar), gestión CRUD de entrenadores desde el panel de director (ya cubierta por `add-backoffice`), notificaciones, panel de estado.
