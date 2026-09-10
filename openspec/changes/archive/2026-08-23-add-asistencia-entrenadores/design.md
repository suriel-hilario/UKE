## Context

`add-asistencia-jugadores` dejó `AsistenciaAccessService` (scope director/coordinador/entrenador, admin denegado — matriz G-B1 "Módulos deportivos"), `SesionesService` (generación perezosa de `sesion` desde `equipo.dias_entrenamiento`, upsert de `registro_asistencia`, cálculo de porcentajes) y `EquiposAsistenciaController` (rutas `/equipos/:id/asistencia*`, `/equipos/:id/miembros*`, `/equipos/:id/sesiones*`). `add-backoffice` ya permite al admin crear/editar `miembro_equipo` con `grupo='entrenador'` y `rol_entrenador` vía `EquiposService` (`apps/api/src/admin/equipos/equipos.service.ts`).

Un hallazgo relevante para este diseño: `SesionesService.getAsistenciaMensual` (usado por `GET /equipos/:id/asistencia`) no filtra por `grupo` — trae todos los `miembro_equipo` del equipo sin distinguir `con_ficha`/`sin_ficha`/`entrenador`. Hoy esto es inofensivo porque `PlantillaService.createJugador` (el único punto de alta usado por asistencia) siempre crea `grupo: 'con_ficha'`, pero un equipo con entrenadores dados de alta desde backoffice ya los mezclaría en la tabla de jugadores. Este change necesita resolverlo para poder separar ambas vistas.

`sesion` es una tabla compartida por equipo (no por grupo): un entrenamiento cancelado lo es para jugadores y entrenadores por igual. El nuevo módulo de entrenadores debe leer/generar sobre las mismas `sesion` que el de jugadores, no una copia paralela.

## Goals / Non-Goals

**Goals:**
- Separar la vista de asistencia por `grupo` (`con_ficha`/`sin_ficha` vs `entrenador`) en el cálculo compartido, sin duplicar la lógica de sesiones/porcentajes.
- 3 endpoints nuevos bajo `/equipos/:id/asistencia/entrenadores*` (lectura mensual, registro P/A, edición de sesión), todos scoped por `AsistenciaAccessService` igual que los de jugadores.
- Extensión aditiva de `PlantillaService.updateJugador` para `rol_entrenador`, accesible a director/coordinador/entrenador (no solo admin).
- Pestaña "Entrenadores" en `EquipoDetailPage`, solo para `categoria='f7'`, reutilizando el patrón visual de `AsistenciaTab` y el `FichaOverlay` existente (extendido).

**Non-Goals:**
- Exportación CSV de asistencia de entrenadores (fuera de alcance, ver proposal).
- Asistencia de entrenadores para Eskola/F11.
- Alta/baja de entrenadores (ya cubierto por `add-backoffice`; este change solo edita `rol_entrenador` inline).
- Cambios al modelo de datos (`miembro_equipo.grupo='entrenador'` y `rol_entrenador` ya existen desde `add-data-model`).

## Decisions

**D1. `SesionesService.getAsistenciaMensual` recibe un parámetro `grupos: MiembroGrupo[]` en vez de traer todos los miembros.**
Corrige el gap descrito en Contexto (hoy no filtra) y evita construir un segundo método casi idéntico solo para entrenadores. `EquiposAsistenciaController.getAsistencia` (jugadores) pasa `['con_ficha', 'sin_ficha']`; el nuevo endpoint de entrenadores pasa `['entrenador']`. `exportarCsv` (jugadores) hereda el mismo filtro por reutilizar `getAsistenciaMensual` internamente — sin cambio de comportamiento porque hoy en la práctica solo hay `con_ficha`/`sin_ficha` en los equipos que exportan. Alternativa descartada: método nuevo `getAsistenciaMensualEntrenadores` con su propia query — se descarta porque duplicaría la generación de contadores/porcentajes (que ya depende de `ESTADOS_QUE_COMPUTAN[equipo.categoria]`, no del grupo) sin ninguna diferencia real de fórmula.

**D2. Nuevo controller `EquiposAsistenciaEntrenadoresController`, mismo módulo (`asistencia.module.ts`), no se amplía `EquiposAsistenciaController`.**
Mantiene cada controller enfocado en un prefijo de rutas coherente (`/equipos/:id/asistencia*` para jugadores, `/equipos/:id/asistencia/entrenadores*` para entrenadores) en vez de un único archivo con lógica de ambos grupos entrelazada. Ambos controllers inyectan los mismos `AsistenciaAccessService`, `SesionesService`, `PrismaService` — no hay servicio nuevo, solo una nueva superficie HTTP. Alternativa descartada: añadir 3 métodos más a `EquiposAsistenciaController` — se descarta porque ese controller ya tiene 7 endpoints (miembros + asistencia + sesiones) y mezclar el prefijo `/entrenadores` ahí reduce la legibilidad de qué endpoint sirve a qué grupo.

**D3. Los 3 endpoints de entrenadores:**
- `GET /equipos/:id/asistencia/entrenadores?bloque_id=&mes=` — mismo flujo que el de jugadores (`ensureSesionesRegla` + `getAsistenciaMensual(equipo, bloqueId, mes, ['entrenador'])`); genera/lee las mismas `sesion` del equipo, no unas paralelas.
- `PATCH /equipos/:id/asistencia/entrenadores` — antes de `upsertRegistro`, carga el `miembro_equipo` referenciado y verifica `grupo === 'entrenador'` (400 si no); reutiliza `SesionesService.upsertRegistro` tal cual (categoria del equipo sigue siendo `f7`, cuyos `ESTADOS_VALIDOS` ya son `['P','A']` — no requiere tabla de estados nueva).
- `PATCH /equipos/:id/asistencia/entrenadores/sesiones/:sesionId` — delega en `SesionesService.setSesionEliminada`, el mismo método que ya usa el endpoint de jugadores (`PATCH /equipos/:id/sesiones/:sesionId`). Es intencionalmente la misma sesión subyacente: eliminar una sesión de entrenamiento la elimina para jugadores y entrenadores por igual, porque es una única fila `sesion` por equipo/fecha. Se expone bajo el prefijo `/entrenadores` (en vez de reusar la ruta de jugadores desde el frontend de entrenadores) para que el modo edición de esa pestaña no dependa de conocer una ruta de otro grupo.

**D4. `PlantillaService.updateJugador` acepta `rol_entrenador?: string` como campo adicional, sin validar `grupo`.**
El endpoint que lo expone (`PATCH /equipos/:id/miembros/:miembroId`, ya scoped por `AsistenciaAccessService`) solo se invoca desde el overlay de ficha del entrenador en este change, así que el valor solo llega para miembros de `grupo='entrenador'` por construcción del frontend. No se añade un chequeo de servidor porque no hay ninguna fuente que lo pida y el campo es aditivo e inofensivo si se enviara para un jugador (quedaría un `rol_entrenador` sin uso, sin efecto visible fuera de la ficha de entrenador).

**D5. Frontend: nuevo árbol `apps/web/src/asistencia/entrenadores/` con `AsistenciaEntrenadoresTab.tsx`, siguiendo el patrón de aislamiento ya usado por `asistencia/f11/` (variante propia en vez de parametrizar `AsistenciaTab`).**
`AsistenciaTab.tsx` (345 líneas) ya mezcla tabla, modo edición y `AddJugadorModal`; entrenadores no necesita alta/baja (cubierta por backoffice), así que parametrizarlo añadiría condicionales para una funcionalidad que la variante no usa. Consistente con la decisión ya tomada para F11 (árbol separado en vez de flags en el componente de Eskola/F7). El `FichaOverlay` sí se reutiliza literalmente (no se clona): ya es genérico en `equipoId`/`miembroId` y llama a endpoints ya genéricos (`/miembros/:id/ficha`, `/equipos/:id/miembros/:id`); se le añade una sección condicionada a `ficha.grupo === 'entrenador'` con el input de `rol_entrenador` y su botón guardar (mismo patrón que el campo `nombre` ya existente).

## Risks / Trade-offs

- **[Riesgo] D1 cambia el comportamiento de `getAsistenciaMensual`/`exportarCsv` para jugadores (antes sin filtro, ahora `['con_ficha','sin_ficha']`)** → Mitigado: es una corrección de un gap real (ver Contexto), no una regresión — hoy ya sería incorrecto mostrar entrenadores en la tabla de jugadores si alguno existiera. Cubierto con test que crea un `miembro_equipo` de cada grupo y verifica que cada endpoint solo devuelve el suyo.
- **[Trade-off] D3 expone una ruta `/entrenadores/sesiones/:sesionId` que hace exactamente lo mismo que la ruta de jugadores sobre el mismo recurso** → Aceptado: es una decisión de organización de rutas por pestaña, no una duplicación de lógica (delega en el mismo `setSesionEliminada`); evita que el frontend de entrenadores necesite importar una ruta con prefijo de otro módulo.
- **[Riesgo] Eliminar una sesión desde la pestaña de entrenadores también la elimina para jugadores (mismo `sesion`)** → Aceptado y esperado: un entrenamiento cancelado lo está para todos; no se implementa eliminación "por grupo" porque ninguna fuente la pide y el modelo de datos no la soporta (`sesion` no tiene `grupo`).
- **[Trade-off] D4 no valida `grupo='entrenador'` en el servidor antes de guardar `rol_entrenador`** → Aceptado dado que el único caller es el frontend de este change; revisable si en el futuro se expone `PATCH /equipos/:id/miembros/:miembroId` a un cliente que no controle este proyecto (no es el caso hoy).

## Migration Plan

No hay migración de BD (schema ya existe desde `add-data-model`). Pasos de implementación:
1. `SesionesService.getAsistenciaMensual` con parámetro `grupos` (D1); actualizar el caller de jugadores para pasar `['con_ficha', 'sin_ficha']`.
2. `EquiposAsistenciaEntrenadoresController` (D2/D3): `GET`, `PATCH` registro, `PATCH` sesión.
3. `PlantillaService.updateJugador` + `rol_entrenador` (D4).
4. Frontend: `AsistenciaEntrenadoresTab`, pestaña condicionada a `categoria === 'f7'` en `EquipoDetailPage`, extensión de `FichaOverlay`.

Rollback: sin datos migrados, revertir el deploy de `apps/api`/`apps/web` es suficiente.

## Open Questions

Ninguna pendiente.
