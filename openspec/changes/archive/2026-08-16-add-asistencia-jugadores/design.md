## Context

`add-catalogo-equipos` dejó `CatalogoAccessService`, un servicio de scope por rol para la columna "Catálogo" de la matriz G-B1 (donde `admin` tiene acceso total). Este change opera sobre una columna distinta de esa misma matriz — "Módulos deportivos" — donde `admin` tiene `—` (sin acceso, ni lectura ni escritura). Reutilizar `CatalogoAccessService` tal cual daría a `admin` acceso a asistencia, que la matriz prohíbe explícitamente. Es también el primer change que escribe sobre `sesion`/`registro_asistencia`, y el primero que necesita generar datos derivados (sesiones desde la regla semanal del equipo) en vez de solo leerlos o escribirlos directamente.

## Goals / Non-Goals

**Goals:**
- Un servicio de scope propio para módulos deportivos que replique la jerarquía director/coordinador/entrenador de `CatalogoAccessService` pero excluya a `admin` (G-B1, columna "Módulos deportivos").
- Generación automática e idempotente de `sesion` (`origen: regla`) desde `equipo.dias_entrenamiento` + `festivo` de la temporada, sin duplicar sesiones existentes.
- Registro de asistencia P/A con recálculo de porcentajes según la fórmula ya fijada en `98-modelo-datos.md` (G-A4/G-C9/D2).
- Almacenamiento de fotos de persona fuera de la BD (`99-decisiones.md` § D), vendor-agnostic (`project.md` § Infraestructura).

**Non-Goals:**
- Asistencia F11 (10 estados) — `add-asistencias-f11`.
- Minutaje — `add-minutaje`.
- Asistencia de entrenadores — `add-asistencia-entrenadores`.
- Panel de estado (semáforos) — `add-panel-estado`, aunque este change deja los datos que ese panel leerá.
- Borrado físico de jugadores — ya decidido por el proposal: `fecha_baja = hoy`, no `DELETE`.

## Decisions

**D1. Nuevo `AsistenciaAccessService`, no reutilización directa de `CatalogoAccessService`.**
Replica la misma construcción de `where` por rol (`director`: todos los equipos de la temporada; `coordinador`: su `categoria_asignada`; `entrenador`: sus `usuario_equipo`) pero con `admin` explícitamente denegado (`ForbiddenException` en `assertEquipoAccess`, `{ id: { in: [] } }` en `getEquiposWhere`) — la matriz G-B1 dice `—` para admin en "Módulos deportivos", no "acceso implícito". Alternativa descartada: añadir un flag `allowAdmin` a `CatalogoAccessService` — se descarta porque mezclaría dos matrices de permisos distintas (Catálogo vs Módulos deportivos) en un único servicio, violando el principio de aislamiento que ya se siguió en `add-catalogo-equipos` (D1 de ese change).

**D2. Lectura y escritura comparten el mismo scope; solo se añade un chequeo de temporada cerrada para escritura.**
La matriz G-B1 da a director/coordinador/entrenador el mismo ámbito para "Lectura/Escritura" en Módulos deportivos (no hay una escritura más restringida que la lectura). Se añade `AsistenciaAccessService.assertTemporadaAbierta(equipoId)`, invocado solo en los endpoints de escritura (`PATCH asistencia`, `PATCH sesiones/:id`, `POST sesiones`, `PATCH/DELETE foto`), que lanza `ConflictException` (409) si `temporada.estado === 'cerrada'` (G-A7).

**D3. Generación de sesiones `regla`: perezosa, dentro de `GET /equipos/:id/asistencia`, acotada al mes solicitado.**
Al pedir `?bloque_id=&mes=`, el service calcula las fechas del mes que caen en `equipo.dias_entrenamiento`, excluye las que coinciden con un `festivo` de la temporada, recorta el rango a `[temporada.fecha_inicio, temporada.fecha_fin]`, e inserta una `sesion` (`tipo: entrenamiento`, `origen: regla`, `bloque_id` recibido) por cada fecha que no tenga ya una `sesion` con `(equipo_id, fecha, tipo=entrenamiento)` — usa `createMany({ skipDuplicates: true })` apoyándose en la constraint única del schema, para que sea seguro ante llamadas concurrentes sin necesitar un lock explícito. No se genera nada fuera del mes pedido: evita crear de golpe 9 meses de sesiones que nadie ha consultado todavía. Alternativa descartada: generación eager al crear el `bloque` (en `add-backoffice`) — se descarta porque ese change ya está archivado y no debe reabrirse para esto; la generación perezosa no requiere tocarlo.

**D4. `mes` como string `YYYY-MM` en todos los endpoints que lo aceptan (`asistencia`, `exportar`).**
Formato simple, ordenable, sin ambigüedad de zona horaria (se interpreta como mes calendario, no como instante). Ningún origen especifica el formato; se fija aquí como decisión de API.

**D5. "Bloque activo" para `GET /miembros/:miembroId/ficha`: el bloque de la temporada del equipo con `fecha_activacion` más reciente que sea `<= hoy`; si ninguno cumple, el de `fecha_activacion` más temprana.**
El proposal pide el desglose mensual "para todos los meses del bloque activo" pero ninguna fuente define qué bloque es "activo" — el modelo no tiene `fecha_fin` por bloque. Regla de ingeniería razonable y determinista, sin inventar un campo nuevo. Las estadísticas de temporada (Total %, presencias, faltas, sesiones) sí cubren toda la temporada (todos los bloques), coherente con la palabra "temporada" del proposal — distinto del desglose mensual, que es explícitamente "del bloque activo".

**D6. Almacenamiento de fotos: cliente S3-compatible (`@aws-sdk/client-s3`, protocolo estándar) contra un endpoint configurable por entorno; en `docker-compose` local, servicio MinIO.**
`project.md` § Infraestructura prohíbe depender de un servicio gestionado de un cloud concreto; el SDK de AWS habla el protocolo S3 estándar contra cualquier implementación compatible (MinIO en local/self-hosted en producción), sin atar el código a AWS como proveedor. Variables nuevas: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` (con default neutro tipo `us-east-1` que MinIO acepta igualmente).

**D7. Redimensionado de imagen con `jimp` (JS puro), no `sharp` (bindings nativos).**
Esta sesión ya tuvo dos incidentes por dependencias con binarios nativos rotos en contenedores Docker (`rollup` en `apps/web`, `node_modules` desincronizados en `apps/api`). `sharp` añade ese mismo riesgo (binding nativo por arquitectura/SO). `jimp` es más lento pero puramente JS — para redimensionar avatares a 200px, con volumen bajo (decenas de equipos, no miles de subidas concurrentes), el trade-off de rendimiento es aceptable frente a evitar un tercer incidente de compilación nativa.

**D8. Exportación CSV generada en memoria (sin librería adicional) reutilizando el mismo cálculo de porcentaje que `GET /equipos/:id/asistencia`.**
Formato simple (cabecera + filas de texto separado por comas, sin campos con comas internas salvo el nombre — se envuelve en comillas si contiene coma). No se añade una dependencia CSV nueva por un formato tan simple; ya se usó ese mismo criterio de minimalismo en `add-backoffice` (sin librería de export adicional más allá de `exceljs` para el import de Excel, que es un formato distinto).

**D9. `bloque_id` opcional en `GET/PATCH /equipos/:id/asistencia`, `GET .../exportar` y `POST .../sesiones`, resuelto server-side al "bloque activo" (mismo criterio que D5) cuando se omite.**
Descubierto durante la implementación: el frontend no tiene ningún endpoint no-admin para listar los `bloque` de una temporada (el único existe en `/admin/temporadas/:id/bloques`, `@Roles('admin')`), así que no puede resolver un `bloque_id` por sí mismo. En vez de añadir un endpoint de solo-listado nuevo, se reutiliza la resolución de "bloque activo" ya construida para la ficha del jugador (`getBloqueActivo`, extraída a una función compartida). El parámetro sigue aceptándose explícito para cuando el frontend sí lo conoce (p. ej. tras la primera respuesta).

**D10. Alta/edición de jugador desde asistencia vía `POST/PATCH /equipos/:id/miembros*` (módulo `asistencia`), no `/admin/equipos/:id/miembros*` (`add-backoffice`).**
Descubierto durante la implementación: `EquiposController` de `add-backoffice` es `@Roles('admin')` a nivel de clase, bloqueando a director/coordinador/entrenador — pero G-B1 exige que esos roles puedan escribir la plantilla de sus equipos (columna "Catálogo": director y coordinador con escritura scoped, entrenador con "escritura limitada a la plantilla de sus equipos"). Alternativa descartada (quitar `@Roles('admin')` del controller de backoffice y añadir el scope check ahí): se descarta para no reabrir ni modificar el comportamiento de un endpoint ya archivado, probado y en uso por el flujo de admin — el nuevo endpoint vive en `asistencia`, aislado, con su propio `PlantillaService` que además resuelve la creación de `persona` (el endpoint de backoffice exige un `persona_id` ya existente, no sirve para "alta rápida solo con nombre"). `PATCH /admin/equipos/:id/miembros/:miembroId` de backoffice queda intacto, sin tocar.

## Risks / Trade-offs

- **[Riesgo] La generación perezosa de sesiones (D3) puede crear sesiones "regla" para un mes que luego se vuelve irrelevante si se reconfiguran `dias_entrenamiento` del equipo después** → Aceptado: las sesiones ya generadas no se regeneran retroactivamente; el modo edición permite marcar `eliminada` manualmente si sobra alguna. No se implementa reconciliación automática (no pedida por ninguna fuente).
- **[Riesgo] `jimp` (D7) es más lento que `sharp` bajo carga** → Aceptado dado el volumen esperado (club, no SaaS masivo); revisable si se vuelve un cuello de botella real.
- **[Trade-off] D5 (bloque activo) es una decisión de ingeniería no confirmada por producto** → Aceptado, igual que D5 de `add-catalogo-equipos` (temporada abierta por defecto): no bloquea datos, solo qué se muestra por defecto.
- **[Riesgo] MinIO en `docker-compose` es solo para desarrollo — el despliegue real necesita un S3-compatible gestionado por el club o el hosting** → Fuera de alcance de este change decidir cuál; las variables de entorno (D6) hacen que el código no dependa de MinIO específicamente.

## Migration Plan

No hay migración de BD (el schema ya existe desde `add-data-model`; `sesion`, `registro_asistencia`, `miembro_equipo`, `persona` ya migrados). Pasos de implementación:
1. `AsistenciaAccessService` (scope + chequeo de temporada cerrada).
2. Generación de sesiones (D3) + `GET /equipos/:id/asistencia`.
3. Endpoints de escritura (`PATCH asistencia`, `PATCH/POST sesiones`).
4. Servicio de almacenamiento de objetos (D6) + endpoints de foto; añadir MinIO a `docker-compose.yml` para desarrollo.
5. `GET /miembros/:miembroId/ficha` (estadísticas) y `GET /equipos/:id/asistencia/exportar` (CSV).
6. Frontend: pestaña Asistencia, tabla, overlays, modo edición, exportación.

Rollback: sin migración de datos, revertir el deploy de `apps/api`/`apps/web` es suficiente. Las `sesion` con `origen: regla` ya creadas no se eliminan automáticamente en un rollback — quedan como datos válidos (una sesión sigue siendo una sesión real independientemente de si el código que la generó se revierte).

## Open Questions

Ninguna pendiente: la generación de sesiones (única duda real del proposal) se resolvió antes de este documento; el resto de decisiones de implementación (D4–D8) son elecciones de ingeniería sin fuente contradictoria.
