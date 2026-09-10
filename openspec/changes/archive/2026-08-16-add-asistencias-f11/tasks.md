## 1. Backend: estados centralizados

- [x] 1.1 Crear `apps/api/src/asistencia/estados.ts` con `ESTADOS_VALIDOS` y `ESTADOS_QUE_COMPUTAN` indexados por `Categoria` (`design.md` § D1)
- [x] 1.2 `SesionesService.upsertRegistro` recibe `categoria` y valida `estado` contra `ESTADOS_VALIDOS[categoria]` (antes hardcodeado a `['P','A']`)
- [x] 1.3 `EquiposAsistenciaController.patchAsistencia` resuelve `equipo.categoria` y la pasa a `upsertRegistro`

## 2. Backend: contadores y lectura generalizada

- [x] 2.1 `SesionesService.getAsistenciaMensual` añade `contadores: Record<string, number>` por miembro (conteo de `registro_asistencia.estado` del mes, todas las categorías)

## 3. Backend: ficha generalizada

- [x] 3.1 `FichaService.getFicha` usa `ESTADOS_QUE_COMPUTAN[equipo.categoria]` en vez de comparar contra `'P'` literal, tanto para `estadisticas` como para `desglose_mensual`

## 4. Backend: orden en plantilla

- [x] 4.1 `PlantillaService.updateJugador` acepta `orden?: number` opcional y lo persiste en `miembro_equipo`
- [x] 4.2 `EquiposAsistenciaController.updateMiembro` acepta `orden` en el body

## 5. Backend: export CSV F11

- [x] 5.1 `SesionesService.exportarCsvF11(equipo)` — recorre los meses de la temporada (`temporada.fecha_inicio`–`fecha_fin`), agrega `%AÑO`, `%MES` y contadores por estado por jugador
- [x] 5.2 CSV con separador `;`, BOM UTF-8, columnas `SECCION;JUGADOR;ALIAS;%ANO;%MES;S<num>d<dia>...;TOT;EM;RC;LS;EN;TR;EX;VA;OT;NJ`
- [x] 5.3 `EquiposAsistenciaController.exportarAsistencia` llama a `exportarCsvF11` si `equipo.categoria === 'f11'`, con `Content-Disposition` `Asistencias_<equipo.nombre>_<temporada.nombre>.csv`

## 6. Backend: tests e2e

- [x] 6.1 Test: `PATCH asistencia` con estado F11 válido (`EM`) sobre equipo `f11` → 200
- [x] 6.2 Test: `PATCH asistencia` con `estado: "P"` sobre equipo `f11` → 400
- [x] 6.3 Test: `PATCH asistencia` con estado F11 (`EM`) sobre equipo `f7` → 400
- [x] 6.4 Test: `GET asistencia` incluye `contadores` correctos por miembro (varios estados marcados)
- [x] 6.5 Test: `GET ficha` de un jugador F11 cuenta `1`/`EM`/`RC` como presencia y el resto no
- [x] 6.6 Test: `PATCH miembros/:id` con `orden` actualiza el campo
- [x] 6.7 Test: `GET asistencia/exportar` sobre equipo F11 devuelve CSV con `;`, BOM, y cubre más de un mes
- [x] 6.8 Test: `GET asistencia/exportar` sobre equipo Eskola/F7 sigue devolviendo el formato mensual sin cambios (regresión)

## 7. Frontend: tabla F11 base

- [x] 7.1 Crear `apps/web/src/asistencia/f11/` con `i18n.ts` (11 estados EU/ES + literales de tabla, euskera por defecto)
- [x] 7.2 `AsistenciaF11Tab.tsx`: fetch de `GET /equipos/:id/asistencia`, sidebar de meses (reutiliza el mismo patrón de `AsistenciaTab`)
- [x] 7.3 Tabla: columnas `% AÑO`, `% MES`, `JUGADOR`, una por sesión (número o ⚽ + día), contadores por estado (>0)
- [x] 7.4 Secciones "Con Ficha (N)" / "Sin Ficha (N)" / "Entrenadores (N)" con fila de total y media por sección, y "Total General"
- [x] 7.5 `EquipoDetailPage`: renderiza `AsistenciaF11Tab` cuando `equipo.categoria === 'f11'`, `AsistenciaTab` para `eskola`/`f7` (sin modificar `AsistenciaTab`)

## 8. Frontend: interacción de celda

- [x] 8.1 Menú contextual "MARCAR SESIÓN" al click en celda (10 estados, actual marcado), sin librería (`design.md` § D6)
- [x] 8.2 Seleccionar un estado llama a `PATCH /equipos/:id/asistencia` y cierra el menú
- [x] 8.3 Botón "✓" en cabecera de sesión: marca `estado: "1"` a todos los miembros sin marca en esa sesión (llamadas repetidas al `PATCH` existente)

## 9. Frontend: colores y leyenda

- [x] 9.1 Umbrales de color F11 (`>=85` verde, `>=60` ámbar, `>0` rojo, `0`/sin datos gris `"--"`) aplicados a `% AÑO`/`% MES`
- [x] 9.2 Leyenda de los 11 estados (10 + sin marcar) en EU/ES

## 10. Frontend: barra de estadísticas

- [x] 10.1 Barra: Equipo, Mes, Sesiones, Total temporada, nº Con Ficha, nº Sin Ficha, Asistencias, Media general %, Media ficha %

## 11. Frontend: ficha extendida F11

- [x] 11.1 Reutilizar `FichaOverlay` base (foto, nombre, eliminar) y añadir, condicionado a `equipo.categoria === 'f11'`, sección "Resumen temporada" (contadores >0)
- [x] 11.2 Sección "Evolución mensual": por mes, barra de % + fila de puntos con el estado de cada sesión

## 12. Frontend: drag & drop

- [x] 12.1 Reordenar fila dentro de su grupo con `draggable` HTML5 nativo (mismo patrón que `admin/equipos/MiembrosTable.tsx`), llama a `PATCH /equipos/:id/miembros/:miembroId` con el nuevo `orden`

## 13. Frontend: export CSV

- [x] 13.1 Botón de exportar CSV llama a `GET /equipos/:id/asistencia/exportar` (sin parámetro de mes — temporada completa) y dispara la descarga

## 14. Frontend: tests

- [x] 14.1 Test: seleccionar un estado del menú contextual llama a `PATCH /equipos/:id/asistencia` con ese estado
- [x] 14.2 Test: botón "✓" de cabecera llama a `PATCH` solo para los miembros sin marca de esa sesión
- [x] 14.3 Test: secciones muestran total y media correctos
- [x] 14.4 Test: overlay de ficha F11 muestra "Resumen temporada" y "Evolución mensual"
- [x] 14.5 Test: arrastrar una fila llama a `PATCH miembros/:id` con el nuevo `orden`
- [x] 14.6 Test: exportar CSV F11 dispara la descarga

## 15. Literales EU/ES

- [x] 15.1 Todos los literales nuevos de la tabla F11 (leyenda, barra de estadísticas, menú contextual, secciones) en euskera y castellano, euskera por defecto

## 16. Verificación manual end-to-end

- [x] 16.1 Abrir la pestaña Asistencia de un equipo F11 y confirmar que se renderiza la tabla de 10 estados (no la de ciclo P/A)
- [x] 16.2 Marcar varios estados vía menú contextual y confirmar contadores/porcentajes actualizados
- [x] 16.3 Usar el botón "✓" de una sesión y confirmar que marca solo a los no-marcados
- [x] 16.4 Confirmar los umbrales de color (≥85 verde, ≥60 ámbar, >0 rojo, sin datos gris)
- [x] 16.5 Abrir la ficha de un jugador F11 y confirmar "Resumen temporada" y "Evolución mensual"
- [x] 16.6 Arrastrar una fila en desktop y confirmar que persiste el nuevo orden tras recargar
- [x] 16.7 Exportar el CSV de temporada y confirmar separador `;`, BOM, y columnas de contadores
- [x] 16.8 Confirmar que un equipo Eskola/F7 sigue funcionando exactamente igual que antes (sin regresión)
