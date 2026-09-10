## 1. Backend: filtro por grupo en la vista de jugadores

- [x] 1.1 Añadir parámetro `grupos: MiembroGrupo[]` a `SesionesService.getAsistenciaMensual` y filtrar la query de `miembro_equipo` por `grupo: { in: grupos }`
- [x] 1.2 Actualizar `EquiposAsistenciaController.getAsistencia` (jugadores) para pasar `['con_ficha', 'sin_ficha']`
- [x] 1.3 Verificar que `exportarCsv` (que llama a `getAsistenciaMensual` internamente) sigue exportando solo jugadores sin cambios de firma pública
- [x] 1.4 Test: un equipo con miembros `con_ficha` y `entrenador` — `GET /equipos/:id/asistencia` no incluye al entrenador

## 2. Backend: `rol_entrenador` en alta/edición de miembro

- [x] 2.1 Extender `PlantillaService.updateJugador` para aceptar `rol_entrenador?: string` y persistirlo en `miembro_equipo`
- [x] 2.2 Extender `EquiposAsistenciaController.updateMiembro` (`PATCH /equipos/:id/miembros/:miembroId`) para leer `rol_entrenador` del body y pasarlo al servicio
- [x] 2.3 Test: `PATCH /equipos/:id/miembros/:miembroId` con `rol_entrenador` actualiza el campo en un `miembro_equipo` de `grupo='entrenador'`

## 3. Backend: endpoints de asistencia de entrenadores

- [x] 3.1 Crear `EquiposAsistenciaEntrenadoresController` en `apps/api/src/asistencia/`, registrado en `AsistenciaModule`
- [x] 3.2 `GET /equipos/:id/asistencia/entrenadores?bloque_id=&mes=`: resolver `bloque_id` (o bloque activo), llamar `ensureSesionesRegla` y `getAsistenciaMensual(equipo, bloqueId, mes, ['entrenador'])`
- [x] 3.3 `PATCH /equipos/:id/asistencia/entrenadores`: cargar el `miembro_equipo` del `miembro_equipo_id` recibido, responder 400 si `grupo !== 'entrenador'`, si no delegar en `SesionesService.upsertRegistro`
- [x] 3.4 `PATCH /equipos/:id/asistencia/entrenadores/sesiones/:sesionId`: delegar en `SesionesService.setSesionEliminada`
- [x] 3.5 Aplicar `AsistenciaAccessService.assertEquipoAccess` en los 3 endpoints y `assertTemporadaAbierta` en los de escritura (mismo patrón que `EquiposAsistenciaController`)
- [x] 3.6 Test: `GET /equipos/:id/asistencia/entrenadores` devuelve las mismas `sesion` que `GET /equipos/:id/asistencia` para el mismo bloque/mes
- [x] 3.7 Test: `PATCH /equipos/:id/asistencia/entrenadores` con `miembro_equipo_id` de un jugador responde 400
- [x] 3.8 Test: `PATCH /equipos/:id/asistencia/entrenadores` con `estado` fuera de `P`/`A` responde 400
- [x] 3.9 Test: escritura sobre temporada cerrada responde 409 (registro y sesión)
- [x] 3.10 Test: `PATCH /equipos/:id/asistencia/entrenadores/sesiones/:sesionId` con `eliminada: true` la oculta también en `GET /equipos/:id/asistencia`

## 4. Frontend: árbol de componentes de entrenadores

- [x] 4.1 Crear `apps/web/src/asistencia/entrenadores/api.ts` (o reutilizar `useAsistenciaApi` existente) apuntando a `/equipos/:id/asistencia/entrenadores*` — reutiliza `useAsistenciaApi` de `../api`, sin fichero propio (mismo patrón que `asistencia/f11`)
- [x] 4.2 Crear `apps/web/src/asistencia/entrenadores/AsistenciaEntrenadoresTab.tsx`: sidebar de meses, tabla (cabecera "Entrenador" + sesiones + "%"), fila "SESIÓN %", fila "TOTAL", celdas coloreadas por umbral (reutilizar lógica de umbral de `AsistenciaTab`)
- [x] 4.3 Ciclo de celda vacío → P → A → vacío llamando a `PATCH /equipos/:id/asistencia/entrenadores`
- [x] 4.4 Modo edición: botón para quitar sesión por columna (`PATCH .../entrenadores/sesiones/:sesionId`, con confirmación) — sin botón de alta ni baja de entrenador
- [x] 4.5 Crear `apps/web/src/asistencia/entrenadores/i18n.ts` con literales EU/ES (euskera por defecto)
- [x] 4.6 Test: `AsistenciaEntrenadoresTab` renderiza la tabla y cicla el estado de una celda

## 5. Frontend: ficha de entrenador y pestaña en el detalle de equipo

- [x] 5.1 Extender `FichaOverlay.tsx`: cuando `ficha.grupo === 'entrenador'`, mostrar campo `rol_entrenador` editable con botón guardar (`PATCH /equipos/:id/miembros/:miembroId`) — el valor inicial se pasa por prop desde `AsistenciaEntrenadoresTab` (que ya lo tiene en `data.miembros`), sin modificar `GET /miembros/:miembroId/ficha` (proposal: "sin cambios")
- [x] 5.2 Añadir pestaña "Entrenadores" en `EquipoDetailPage.tsx`, visible solo para `equipo.categoria === 'f7'`, renderizando `AsistenciaEntrenadoresTab`
- [x] 5.3 Añadir literal "Entrenadores" de la pestaña al i18n correspondiente
- [x] 5.4 Test: `EquipoDetailPage` muestra la pestaña "Entrenadores" solo para equipos `f7`
- [x] 5.5 Test: `FichaOverlay` muestra y guarda `rol_entrenador` cuando el miembro es un entrenador, y no muestra ese campo para un jugador

## 6. Verificación final

- [x] 6.1 Ejecutar suite completa de tests de `apps/api` y `apps/web` — 73/73 e2e (api) y 44/44 (web) en verde
- [x] 6.2 Probar manualmente el flujo: abrir pestaña Entrenadores de un equipo F7, marcar P/A, quitar una sesión, editar rol desde la ficha, y confirmar que la pestaña Asistencia (jugadores) no muestra entrenadores — verificado en vivo por el usuario (dev server + API), todo correcto
