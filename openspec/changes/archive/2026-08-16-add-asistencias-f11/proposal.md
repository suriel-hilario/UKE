## Why

`add-asistencia-jugadores` deja la infraestructura de asistencia (scope, generación de sesiones, registro, ficha, foto, export) funcionando para Eskola/F7 con el modelo P/A de dos estados. F11 usa un modelo de 10 estados de ausencia justificada (`99-decisiones.md` § G-C2b) y una tabla con contadores/estadísticas más rica — es el séptimo change de la secuencia (`project.md` § Secuencia de changes prevista, punto 7) y el que cierra el registro de asistencia de jugadores para las tres categorías.

## What Changes

Backend (`apps/api`) — extiende `add-asistencia-jugadores`, sin endpoints nuevos ni cambios de schema:
- `PATCH /equipos/:id/asistencia`: la validación de `estado` pasa a depender de `equipo.categoria` — Eskola/F7 sigue aceptando solo `P`/`A`; F11 acepta los 10 códigos (`1`, `EM`, `RC`, `VA`, `LS`, `EN`, `TR`, `EX`, `OT`, `NJ`). Fuente: inventario 03 § Constantes; `99-decisiones.md` § G-C2b.
- Fórmula de porcentaje: se reutiliza exactamente la fórmula ya implementada en `FichaService`/`SesionesService` (`98-modelo-datos.md` línea 116: denominador = sesiones desde `fecha_incorporacion` hasta `fecha_baja`, sin excluir por presencia de registro), cambiando solo qué estados cuentan como numerador — Eskola/F7: `P`; F11: `1`, `EM`, `RC`. La "regla de debut" del mockup (% desde la primera marca) queda descartada a favor de `fecha_incorporacion` explícita, igual que en Eskola/F7 — el propio inventario 03 § Open Questions ya lo resuelve así ("campo explícito, sí").
- `GET /equipos/:id/asistencia`: para equipos F11, cada miembro incluye además los 10 contadores por estado del mes (además del `%`). Fuente: inventario 03 § Tabla.
- Umbrales de color F11 (distintos de Eskola/F7): ≥85 verde, ≥60 ámbar, >0 rojo, 0/sin datos `"--"` (`99-decisiones.md` § G-C3, fila F11).
- `GET /equipos/:id/asistencia/exportar`: para F11, exporta la temporada completa (no solo el mes), separador `;`, BOM UTF-8, columnas `SECCION;JUGADOR;ALIAS;%ANO;%MES;S<num>d<dia>...;TOT;EM;RC;LS;EN;TR;EX;VA;OT;NJ`, fichero `Asistencias_<equipo.nombre>_<temporada>.csv`. Fuente: inventario 03 § Acciones (Exportar CSV).
- `PATCH /equipos/:id/miembros/:miembroId` (de `add-asistencia-jugadores`, módulo `asistencia`): se añade soporte para `orden` (ya existe en el modelo `miembro_equipo`, no estaba expuesto), necesario para el drag & drop. Fuente: inventario 03 § Acciones (arrastrar fila).
- `PATCH /equipos/:id/sesiones` (`design.md` de `add-asistencia-jugadores`): sin cambios — F11 reutiliza `POST /equipos/:id/sesiones` (alta manual, ya soporta `tipo` E/P) y `PATCH .../sesiones/:id` (quitar/restaurar) tal cual.

Frontend (`apps/web`) — extiende `add-asistencia-jugadores`:
- Pestaña "Asistencia" del detalle de equipo: la condición que hoy solo la muestra para `eskola`/`f7` se extiende a `f11`, renderizando una tabla distinta (componente propio, no reutiliza la tabla P/A de Eskola/F7). Fuente: inventario 03 § Pantalla 2.
- Tabla F11: cabecera de sesión con número (o ⚽ si es partido, fondo azul) + día + botón "✓" (marca `1` a todos los no-marcados de esa sesión, vía llamadas repetidas al `PATCH` existente — no hay endpoint de marcado masivo); celda con menú contextual "MARCAR SESIÓN" (los 10 estados, el actual marcado); columnas `% AÑO`/`% MES` coloreadas por los umbrales F11; fila de contadores por jugador (solo estados >0); secciones "Con Ficha (N)" / "Sin Ficha (N)" / "Entrenadores (N)" con fila de total y media por sección, y "Total General" al final. Fuente: inventario 03 § Tabla, § Acciones.
- Barra de estadísticas del mes: Equipo, Mes, Sesiones, Total temporada, nº Con Ficha, nº Sin Ficha, Asistencias (marcas que computan), Media general %, Media ficha %. Fuente: inventario 03 § Pantalla 2 § Barra de estadísticas.
- Leyenda de los 11 estados (10 + sin marcar) en EU/ES. Fuente: inventario 03 § Pantalla 2 § Leyenda.
- Overlay de ficha del jugador F11: mismo overlay base de `add-asistencia-jugadores` (foto, nombre editable, eliminar) más "Resumen temporada" (contadores por estado, solo >0) y "Evolución mensual" (barra de % + fila de puntos de estado por sesión, por mes). Fuente: inventario 03 § Panel lateral Ficha del jugador.
- Arrastrar fila (drag & drop; en móvil, pulsación larga 600 ms + arrastre) para reordenar dentro del grupo; llama al `PATCH` de `orden` extendido arriba. Fuente: inventario 03 § Acciones.
- Todos los literales en EU/ES, euskera por defecto (G-C5) — el mockup arranca en ES, pero eso ya se descartó como convención de mockup, no de producto, en los changes anteriores.

Fuera de alcance (explícito, según el propio inventario y el proposal):
- Pantalla de configuración del director (usuarios, equipos, calendario) — ya cubierta por `add-backoffice` (usuarios/equipos) y por `POST/PATCH /equipos/:id/sesiones` de `add-asistencia-jugadores` (calendario). No se construye una pantalla nueva.
- Borrado (lógico) de usuarios/equipos desde configuración — pertenece a `add-backoffice`, no a este change.
- Vínculo entre sesión de partido y jornada de FieldBook (minutaje) — pertenece a `add-minutaje`.
- Asistencia de entrenadores — `add-asistencia-entrenadores`.
- Panel de estado, notificaciones — changes posteriores.
- "Huecos" del mockup (índices de sesión excluidos del cómputo global): no se implementan.
  El denominador usa únicamente fecha_incorporacion/fecha_baja/eliminada=false, igual
  que Eskola/F7. Fuente: inventario 03 § Open Questions ("huecos": siempre vacío en la
  semilla; no hay requirement explícito del club para usarlos).

## Capabilities

### New Capabilities
- `asistencias-f11`: registro y consulta de asistencia de 10 estados para jugadores F11 (tabla, contadores, ficha extendida, export CSV de temporada, reordenamiento), frontend, reutilizando el backend de `asistencia-jugadores` extendido.

### Modified Capabilities
- `asistencia-jugadores`: `PATCH /equipos/:id/asistencia` valida `estado` según `equipo.categoria` (antes solo `P`/`A`); el cálculo de porcentaje generaliza el conjunto de estados que computan como numerador (antes solo `P`); `GET /equipos/:id/asistencia` añade contadores por estado para F11; `GET .../exportar` cambia de formato para F11 (temporada completa, `;`, BOM); `PATCH /equipos/:id/miembros/:miembroId` añade soporte para `orden`.
- `catalogo-equipos`: la pestaña "Asistencia" del detalle de equipo, antes condicionada a `eskola`/`f7`, se extiende a `f11`.

## Impact

- **apps/api**: cambios en `asistencia/sesiones.service.ts` (validación de estado, numerador por categoría, contadores), `asistencia/ficha.service.ts` (numerador por categoría), `asistencia/plantilla.service.ts` (soporte `orden`), nuevo método/rama de exportación CSV para F11. Ningún endpoint nuevo, ningún cambio de schema.
- **apps/web**: nuevo componente de tabla F11 (no reutiliza `AsistenciaTab` de Eskola/F7), menú contextual de estado, barra de estadísticas, leyenda, overlay de ficha extendido, drag & drop.
- **BD**: ningún cambio — `registro_asistencia.estado` ya es `String` sin `CHECK` (la validación vive en la capa de aplicación, `98-modelo-datos.md` § D1, decisión ya tomada); `miembro_equipo.orden` ya existe.

## Open Questions

Ninguna pendiente: las dudas propias del inventario 03 (columna ALIAS vestigial, borrado lógico de usuarios/equipos, regla de debut vs. fecha de incorporación explícita, entrenadores como usuarios del sistema, significado de "huecos", vínculo partido↔jornada) ya vienen resueltas en el propio documento fuente y quedan fuera de alcance de este change salvo la de fecha de incorporación (ya resuelta: se usa `fecha_incorporacion`, coherente con G-A4 y con lo ya implementado en `add-asistencia-jugadores`).
