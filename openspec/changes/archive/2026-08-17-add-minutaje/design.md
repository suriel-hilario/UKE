## Context

`jornada` y `participacion_jornada` ya existen en el schema (`98-modelo-datos.md` § jornada, § participacion_jornada; sin `@@unique` roto: `[equipo_id, bloque_id, numero]` en `jornada`, `[jornada_id, miembro_equipo_id]` en `participacion_jornada`). `AsistenciaAccessService` (director/coordinador/entrenador; admin denegado) y `getBloqueActivo` ya existen en `apps/api/src/asistencia/` desde `add-asistencia-jugadores` y se reutilizan tal cual — ningún endpoint de minutaje construye su propio scope, igual que estableció `design.md` § D1 de `add-asistencia-jugadores`. No hay servicio de "jornadas" ni de "dashboard de participación" todavía: todo el código de este change es nuevo, pero vive en el mismo módulo (`AsistenciaModule`) por cohesión de dominio (scope compartido, mismo controller de equipo).

## Goals / Non-Goals

**Goals:**
- Registrar jornadas (convocatoria, minutos, goles, bajas) por equipo/bloque/numero, con las reglas de negocio de pills aplicadas server-side (no confiar en que el frontend las respete).
- Calcular el dashboard de participación (%TOTAL/%CONV/%DISP + alerta) reutilizando el patrón de "miembro activo en fecha" ya usado por asistencia.
- Reutilizar `AsistenciaAccessService`, `getBloqueActivo`, y el patrón de controller de `EquiposAsistenciaController` sin duplicar scope ni resolución de bloque.

**Non-Goals:**
- Minutaje de Eskola (ninguna fuente lo menciona — `f11`/`f7` únicamente).
- Vínculo con FieldBook externo o importación de datos de partido de terceros.
- Notificaciones o panel de estado sobre las alertas de participación (`add-panel-estado`, `add-notificaciones`).
- Cambios de schema (el modelo ya existe completo).

## Decisions

**D1. Nuevo `JornadasService` + `JornadasController` dentro de `AsistenciaModule`, en vez de un módulo `MinutajeModule` separado.**
Comparte `AsistenciaAccessService`, `getBloqueActivo` y el mismo `PrismaService` que el resto de asistencia; crear un módulo aparte solo añadiría imports cruzados sin beneficio, dado que el scope de acceso es idéntico (`AsistenciaAccessService` ya cubre "módulos deportivos" en general, no solo asistencia — `99-decisiones.md` § G-B1 agrupa "asistencia, minutaje" en la misma columna). Alternativa descartada: `MinutajeModule` independiente — se descarta porque duplicaría el wiring de `AsistenciaAccessService` sin aislar nada real (ambos módulos comparten el mismo `equipo`/scope).

**D2. Reglas de negocio de pills centralizadas en una función pura `aplicarReglasParticipacion(input, duracion): ParticipacionInput`, llamada tanto desde `POST /equipos/:id/jornadas` (por cada participación del array) como desde `PATCH /equipos/:id/jornadas/:numero/miembro/:miembroId`.**
Evita reimplementar las reglas (jugado⇒convocado; titular⇒convocado+jugado+minutos=duración si minutos era 0; baja⇒limpia convocado/jugado/titular; LES/SAN/ENF/VAC/NJ mutuamente excluyentes) en dos sitios. Se aplican **después** de la validación de rango de minutos pero **antes** de persistir, para que el resultado guardado sea siempre consistente aunque el body entrante no lo sea (defensa en profundidad — el frontend también las aplica client-side para feedback inmediato, pero el backend es la fuente de verdad, igual que la validación de `estado` en asistencia F11).

**D3. Cálculo de "miembro activo en fecha de jornada" reutiliza la misma condición que `sesiones.service.ts` (`fecha_incorporacion <= fecha` y `fecha_baja IS NULL OR fecha <= fecha_baja`), extraída a un helper compartido `apps/api/src/asistencia/miembro-activo.ts` en vez de duplicar el predicado inline.**
El predicado ya existe como función privada `miembroActivoEnFecha` dentro de `SesionesService`; se extrae a un módulo compartido para que `JornadasService` no la reimplemente. Esto es una refactorización menor sobre código de `add-asistencia-jugadores`, sin cambiar su comportamiento observable (mismo predicado, mismo resultado) — no requiere delta spec sobre `asistencia-jugadores` porque no cambia ningún requirement, solo la ubicación del código.

**D4. `GET /equipos/:id/dashboard` recorre todas las `jornada` del bloque activo (o el `bloque_id` recibido) en una sola query con `include: { participaciones: true }`, y agrega en memoria por miembro — sin agregación SQL.**
Mismo enfoque que `exportarCsvF11` (`add-asistencias-f11` § D3): el volumen esperado (decenas de jornadas × decenas de jugadores por equipo) no justifica una query agregada; se prioriza simplicidad y reutilización del mismo patrón ya aceptado en el proyecto.

**D5. Validación de minutos (`minutos <= duracion + margen`) vive en `JornadasService`, no en un DTO/class-validator, porque el margen depende de `equipo.num_periodos` (+30 para 2 periodos, +10 para 3 periodos) — no es una constante estática.**
`duracion = equipo.minutos_por_periodo * equipo.num_periodos`; el margen es una regla de negocio con contexto del equipo, no una validación de forma del body, así que se aplica igual que la validación de `estado` por categoría en `estados.ts` (`add-asistencias-f11` § D1): en el servicio, con el `equipo` ya cargado.

**D6. Frontend: pestaña "Minutaje" como árbol de componentes propio en `apps/web/src/minutaje/`, con dos vistas internas (formulario+lista+historial, y dashboard) en vez de dos pestañas separadas en `EquipoDetailPage`.**
El dashboard depende de los datos de jornadas ya cargadas; mantenerlo como sub-navegación dentro de un único componente `MinutajeTab` (con su propio estado de "vista activa": jornada | dashboard) evita duplicar el fetch de jornadas y sigue el patrón ya usado por `AsistenciaF11Tab` de tener toda la lógica de un dominio en un árbol de componentes autocontenido (`add-asistencias-f11` § D5).

**D7. Pills como grupo de botones simple (sin librería de UI), igual que el resto del proyecto — mismo minimalismo que el menú contextual de F11 (`add-asistencias-f11` § D6).**

**D8. Fórmulas de participación (fuente: inventario 04 § Constantes — getPlayerAccum):**

Sea para un miembro en un bloque dado, filtrado por fecha_incorporacion/fecha_baja (D3):

  duracion = equipo.minutos_por_periodo * equipo.num_periodos

  jornadasDesdeDebut  = COUNT(jornadas con fecha >= fecha_incorporacion y regla fecha_baja)
  convocado_count     = COUNT(participaciones con convocado=true)
  disponibles         = COUNT(participaciones con baja IS NULL)
  decTec              = COUNT(participaciones con baja IS NULL AND convocado=false) — derivado, no almacenado
  minutos_total       = SUM(participaciones.minutos)

  %TOTAL = minutos_total / (jornadasDesdeDebut * duracion) * 100  → 1 decimal; "--" si jornadasDesdeDebut=0
  %CONV  = minutos_total / (convocado_count * duracion) * 100     → 1 decimal; "--" si convocado_count=0
  %DISP  = minutos_total / (disponibles * duracion) * 100         → 1 decimal; "--" si disponibles=0

  alerta:
    - null    si disponibles < 2
    - "intervenir" si %DISP < 50
    - "vigilar"    si %DISP >= 50 AND < 70
    - null    si %DISP >= 70

## Risks / Trade-offs

- **[Riesgo] D4: `GET /equipos/:id/dashboard` carga todas las jornadas del bloque en memoria** → Aceptado por el mismo motivo que D3 de `add-asistencias-f11`: volumen bajo (un bloque no supera unas pocas decenas de jornadas), no se optimiza prematuramente.
- **[Riesgo] Re-guardar una jornada existente (`POST` con el mismo `numero`) sobrescribe silenciosamente sin diff ni confirmación** → Aceptado explícitamente por `99-decisiones.md` § G-B3 ("los registros de asistencia y minutaje son editables en cualquier momento... sobrescribir jornadas"); no se implementa historial de cambios ni papelera.
- **[Trade-off] D3: extraer `miembroActivoEnFecha` a un helper compartido toca un archivo de `add-asistencia-jugadores` ya archivado** → Se limita a un refactor mecánico (mover función, mismo comportamiento, mismos tests de asistencia deben seguir pasando sin cambios) para evitar duplicar la lógica de elegibilidad en dos módulos; se verifica con la suite existente de `asistencia.e2e-spec.ts` sin tocarla.

## Migration Plan

No hay migración de BD (`jornada`/`participacion_jornada` ya existen desde `add-data-model`). Pasos de implementación:
1. Extraer `miembroActivoEnFecha` a `miembro-activo.ts` (D3), verificar que los tests de asistencia existentes siguen pasando.
2. `JornadasService` (D2, D5): CRUD de jornada + reglas de pills + validación de minutos.
3. `JornadasController` (o extender `EquiposAsistenciaController`) con los 4 endpoints, reutilizando `AsistenciaAccessService`/`getBloqueActivo`.
4. Dashboard: método de agregación (D4) + endpoint.
5. Frontend: `MinutajeTab` (D6) con formulario, lista de jugadores con pills (D7), historial y dashboard; rama en `EquipoDetailPage` para `categoria !== 'eskola'`.

Rollback: sin migración de datos, revertir el deploy es suficiente; las filas de `jornada`/`participacion_jornada` ya creadas seguirían siendo datos válidos.

## Open Questions

Ninguna pendiente.
