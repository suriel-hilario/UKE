## Context

`99-decisiones.md` § G-A6 decide un panel de estado derivado (sin tabla propia) para director/coordinadores, con semáforo verde/rojo por equipo y por tipo (asistencia/minutaje). `98-modelo-datos.md` § 5 fija la fórmula exacta ("pendientes de asistencia = sesiones no eliminadas del bloque activo con fecha ≤ hoy sin registro completo... pendientes de minutaje = jornadas con fecha ≤ hoy sin participaciones... Materializar solo si el rendimiento lo exige"). No hay mockup: todo el comportamiento debe derivarse de esas dos fuentes y del modelo de datos ya construido por `add-asistencia-jugadores`, `add-asistencias-f11` y `add-minutaje`.

Durante el diseño se detectó que `registro_asistencia` y `participacion_jornada` no tienen ningún campo de timestamp de modificación en el schema actual (`schema.prisma` no define `updatedAt`/`updated_at` en ningún modelo). El brief original pedía "sin cambios de schema"; el usuario confirmó explícitamente añadir una migración aditiva para resolver esto (ver Decisión D2) en vez de omitir los timestamps.

## Goals / Non-Goals

**Goals:**
- `GET /panel/estado?temporada_id=` y `GET /panel/estado/:equipoId` con el cálculo derivado exacto de `98-modelo-datos.md` § 5, sin nueva tabla de estado.
- Scope estrictamente `director`/`coordinador` (`99-decisiones.md` § G-B1) — ni `admin` ni `entrenador` ven el panel.
- Página `/panel` con secciones por categoría, tarjetas con semáforo, drawer de detalle y auto-refresh cada 60s.

**Non-Goals:**
- Notificaciones (`add-notificaciones`, ya prevista por G-A5 pero fuera de este change).
- Histórico de temporadas cerradas (`add-historico`).
- Cualquier operación de escritura — el panel es 100% lectura.
- Materializar el estado en una tabla propia — `98-modelo-datos.md` § 5 solo lo pide "si el rendimiento lo exige"; con el volumen esperado (un club, decenas de equipos) se calcula en cada request.
- Estado de asistencia de entrenadores (`grupo='entrenador'`, `add-asistencia-entrenadores`) — ninguna fuente de este change lo menciona; ver Open Questions.

## Decisions

**D1. Scope: gate de rol propio (`director`/`coordinador` únicamente) + reutilización de `AsistenciaAccessService.getEquiposWhere` para el filtrado, sin nuevo servicio de acceso.**
Ni `AsistenciaAccessService` (excluye `admin`, pero permite `entrenador` scoped a sus equipos) ni `CatalogoAccessService` (permite `admin` y `entrenador`) matchean el scope exacto de G-B1 para este panel ("director y coordinadores", explícitamente sin entrenador). En vez de un tercer servicio de scope paralelo, `PanelService` hace primero `if (usuario.rol !== 'director' && usuario.rol !== 'coordinador') throw ForbiddenException()`, y para director/coordinador reutiliza `AsistenciaAccessService.getEquiposWhere(usuario, temporadaId)` tal cual (esa función ya implementa exactamente "director: toda la temporada; coordinador: su `categoria_asignada`" — el resto de sus ramas, `admin`/`entrenador`, quedan inalcanzables tras el gate de rol). Alternativa descartada: añadir un flag a `AsistenciaAccessService` para excluir también a `entrenador` — se descarta por la misma razón que `add-asistencia-jugadores` D1 (aislar matrices de permisos distintas en vez de mezclarlas con flags).

**D2. Migración aditiva: `updatedAt DateTime @default(now()) @updatedAt` en `registro_asistencia` y `participacion_jornada`.**
Es la única fuente real de "última actualización" — no hay forma de derivarlo de otro campo existente (ninguno de los dos modelos tiene otro timestamp). `@default(now())` evita que la migración falle sobre filas ya existentes (columna `NOT NULL` sin valor); `@updatedAt` hace que Prisma lo actualice automáticamente en cada `update`/`upsert` futuro, incluyendo los que ya hacen `SesionesService.upsertRegistro` y `JornadasService.actualizarParticipacion`/`guardarJornada` sin ningún cambio en esos servicios. Ver Riesgo asociado.

**D3. El cálculo de pendientes NO dispara generación de sesiones (`ensureSesionesRegla`) ni de jornadas.**
El panel es un endpoint de solo lectura, sondeado cada 60s desde el frontend (D7) — si generase sesiones en cada poll, podría crear entradas de calendario para equipos que ningún entrenador ha abierto todavía, y lo haría repetidamente cada minuto. `asistencia_pendiente` se evalúa solo sobre `sesion` ya persistidas (`eliminada=false`); esto es consistente con la fórmula exacta de `98-modelo-datos.md` § 5, que habla de "sesiones... del bloque activo con fecha ≤ hoy", no de sesiones que deberían existir según la regla semanal. `jornada` nunca se genera automáticamente en el modelo actual (solo se crea al guardar datos vía `JornadasService`), así que no aplica ahí.

**D4. Grupo excluido del cálculo de `asistencia_pendiente`: solo `con_ficha`/`sin_ficha` (jugadores), igual que `GET /equipos/:id/asistencia` tras `add-asistencia-entrenadores` (`design.md` § D1 de ese change).**
Ninguna fuente de este change (brief, G-A6, § 5) menciona entrenadores; el panel hereda el mismo criterio ya establecido para "la vista de asistencia de un equipo" en el change anterior, en vez de inventar una tercera semántica. Ver Open Questions si en el futuro se pide cubrir también asistencia de entrenadores.

**D5. `minutaje_pendiente` y `ultima_actualizacion_minutaje` son `null` (no `false`/no aplicable) para equipos `eskola`.**
`eskola` no tiene minutaje (`98-modelo-datos.md` § 4, `add-minutaje` scope). Usar `null` distingue "no aplica" de "aplica y está al día" (`false`), evitando que una tarjeta Eskola parezca falsamente "al día en minutaje". El semáforo se calcula como `rojo` si `asistencia_pendiente === true` **o** `minutaje_pendiente === true` (un `null` no lo activa).

**D6. Respuesta de `GET /panel/estado`: lista plana de equipos con campo `categoria`, agrupación por categoría en el frontend.**
Mismo patrón que `GET /catalogo/temporadas/:id/equipos`, que ya devuelve una lista plana que `AppShell.tsx` agrupa client-side por `categoria`. Evita una estructura de respuesta nueva (`{eskola: [...], f7: [...], f11: [...]}`) solo para este endpoint.

**D7. `temporada_id` es obligatorio en `GET /panel/estado` (sin default en backend); el frontend preselecciona la temporada abierta, replicando la lógica ya existente en `AppShell.tsx` (auto-selección solo si hay exactamente una temporada `abierta`).**
Consistente con `GET /catalogo/temporadas/:id/equipos`, que tampoco tiene default de temporada en el backend — esa resolución ya vive en el frontend y no hay razón para duplicarla con una semántica distinta en el backend.

**D8. Auto-refresh en el frontend: `setInterval` de 60000ms mientras la página `/panel` está montada, limpiado en `unmount`. Sin pausa por visibilidad de pestaña (no pedido por ninguna fuente).**

**D9. Equipo sin bloque activo: `asistencia_pendiente: null`, `minutaje_pendiente: null`,
`semaforo: "sin_datos"`.**
Si ningún bloque del equipo tiene `fecha_activacion <= hoy`, no existe contexto
temporal válido para calcular pendientes. Se devuelve `null` en ambos campos y un
semáforo diferenciado (`"sin_datos"`) para que el frontend pueda mostrar un estado
neutro (ni verde ni rojo) en la tarjeta. Fuente: 98-modelo-datos.md § 5 ("bloque
activo: el de fecha_activacion más reciente ≤ hoy").


## Risks / Trade-offs

- **[Riesgo] D2 backfillea `updatedAt` de todas las filas existentes al momento de la migración, no a su fecha real de creación/edición** → Aceptado: no hay dato histórico del que derivar el timestamp real (no existía el campo). El panel mostrará "actualizado" para equipos con datos antiguos justo después de desplegar este change, aunque nadie haya tocado nada — es un efecto transitorio de un solo despliegue, no un problema recurrente.
- **[Riesgo] Cálculo 100% on-the-fly en cada poll de 60s por cada usuario director/coordinador conectado** → Aceptado dado el volumen esperado (un club); si se vuelve un cuello de botella real, `98-modelo-datos.md` § 5 ya prevé explícitamente materializar el estado — no se hace preventivamente sin evidencia de que hace falta.
- **[Trade-off] D4 excluye entrenadores del cálculo de `asistencia_pendiente`** → Aceptado por falta de fuente que lo pida; fácil de extender más adelante (un `grupos` adicional en la misma consulta que ya existe en `SesionesService`).

## Migration Plan

1. Migración Prisma: `updatedAt DateTime @default(now()) @updatedAt` en `registro_asistencia` y `participacion_jornada` (D2).
2. `PanelAccessGate` (gate de rol, D1) + `PanelService` (cálculo derivado, D3–D6) + `PanelController` (`GET /panel/estado`, `GET /panel/estado/:equipoId`).
3. Frontend: página `/panel`, tarjetas por categoría, drawer de detalle, auto-refresh (D7, D8), entrada de navegación en `AppShell.tsx`, ruta protegida en `App.tsx` con `RoleGuard roles={['director','coordinador']}`.

Rollback: la migración es aditiva (columna nueva con default) — revertir el deploy de `apps/api`/`apps/web` no requiere revertir la columna; puede quedar sin uso sin causar daño si se hiciera rollback del código de aplicación.

## Open Questions

- ¿Debe `asistencia_pendiente` cubrir también la asistencia de entrenadores (`grupo='entrenador'`, `add-asistencia-entrenadores`)? Ninguna fuente de este change lo menciona (G-A6 y § 5 son anteriores a esa feature). Se asume que no (D4) hasta que exista un requirement explícito.
