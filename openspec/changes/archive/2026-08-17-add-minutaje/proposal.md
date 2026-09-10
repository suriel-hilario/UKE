## Why

Los equipos F7 y F11 necesitan registrar quién jugó cada jornada, cuántos minutos y goles, y detectar jugadores con participación baja (riesgo de desenganche). El modelo de datos (`jornada`, `participacion_jornada`) y el scope de acceso (`AsistenciaAccessService`) ya existen desde `add-data-model` y `add-asistencia-jugadores`; falta la capability que los expone: registro de jornadas por partido y el dashboard de participación (inventario 04, VALIDATED).

## What Changes

- Backend: 4 endpoints nuevos bajo `/equipos/:id/jornadas*` y `/equipos/:id/dashboard`, reutilizando `AsistenciaAccessService` sin construir scope propio.
  - `GET /equipos/:id/jornadas?bloque_id=` — historial de jornadas del bloque, orden `numero desc`.
  - `GET /equipos/:id/jornadas/:numero` — una jornada por `numero` (no UUID), con participación de todos los miembros activos (fila ausente = valores en blanco/0/false, no error).
  - `POST /equipos/:id/jornadas` — crea o sobrescribe una jornada por `(equipo_id, bloque_id, numero)` (upsert, UQ del schema); valida minutos por jugador contra la duración del partido + margen; aplica las reglas de negocio de pills server-side; 409 si la temporada está cerrada.
  - `PATCH /equipos/:id/jornadas/:numero/miembro/:miembroId` — edición puntual de una participación sin reenviar toda la jornada; mismas reglas de negocio y bloqueo por temporada cerrada.
  - `GET /equipos/:id/dashboard?bloque_id=` — métricas de participación por miembro (`%TOTAL`, `%CONV`, `%DISP`) y alerta (`intervenir`/`vigilar`/ninguna) según los umbrales de G-C3.
  - Reglas de negocio de pills (jugado⇒convocado, titular⇒convocado+jugado+minutos por defecto, baja⇒limpia convocado/jugado/titular, exclusividad mutua de LES/SAN/ENF/VAC/NJ) aplicadas en el backend antes de persistir, no solo en el frontend.
  - Sin cambios de schema: usa `jornada`, `participacion_jornada`, `miembro_equipo`, `equipo`, `bloque`, `temporada` ya existentes.
- Frontend: pestaña "Minutaje" en el detalle de equipo (solo `f7`/`f11`, no `eskola`), con formulario de jornada, lista de jugadores con pills y edición de minutos/goles, panel de estadísticas expandible por jugador, historial de jornadas, y una pestaña/sub-navegación de Dashboard con dos tablas (participación por jugador, detalle por jornada) y panel de alertas.
- Todos los literales nuevos en EU/ES, euskera por defecto (G-C5).

## Capabilities

### New Capabilities
- `minutaje`: registro de jornadas (convocatoria, minutos, goles, bajas) y dashboard de participación para equipos F7/F11.

### Modified Capabilities
- `catalogo-equipos`: la pestaña "Minutaje" se añade a la barra de pestañas de `/equipos/:id` para equipos `f7`/`f11` (extiende el requirement "Página de detalle de equipo con pestaña Plantilla", que ya lista qué pestañas se muestran por categoría).

## Impact

- **Backend**: nuevo módulo/controller bajo `apps/api/src/asistencia/` (o módulo hermano) reutilizando `AsistenciaAccessService`, `PlantillaService` (miembros activos) y el patrón de "bloque activo"/resolución de `bloque_id` ya usado por asistencia. Sin migraciones — el schema de `jornada`/`participacion_jornada` ya existe.
- **Frontend**: nuevo árbol de componentes en `apps/web/src/minutaje/` (o similar), rama nueva en `EquipoDetailPage` para la pestaña "Minutaje" condicionada a `categoria !== 'eskola'`.
- **Fuera de alcance**: minutaje de Eskola (no existe en ninguna fuente), asistencia de jugadores (ya implementado en `add-asistencia-jugadores`/`add-asistencias-f11`), asistencia de entrenadores (`add-asistencia-entrenadores`), panel de estado (`add-panel-estado`), notificaciones (`add-notificaciones`).
