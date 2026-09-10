## 1. Migración de schema

- [x] 1.1 Añadir `updatedAt DateTime @default(now()) @updatedAt` a `registro_asistencia` en `schema.prisma`
- [x] 1.2 Añadir `updatedAt DateTime @default(now()) @updatedAt` a `participacion_jornada` en `schema.prisma`
- [x] 1.3 Generar y aplicar la migración Prisma; confirmar que no falla sobre filas existentes (backfill vía `@default(now())`)
- [x] 1.4 Regenerar el cliente Prisma (`prisma generate`)

## 2. Backend: cálculo derivado

- [x] 2.1 Crear `apps/api/src/panel/panel.module.ts`, `panel.controller.ts`, `panel.service.ts`
- [x] 2.2 En `PanelService`, gate de rol: `director`/`coordinador` únicamente, `ForbiddenException` para cualquier otro rol (incluye `admin` y `entrenador`)
- [x] 2.3 Reutilizar `AsistenciaAccessService.getEquiposWhere(usuario, temporadaId)` para resolver los equipos visibles (director: toda la temporada; coordinador: su `categoria_asignada`), sin modificar ese servicio
- [x] 2.4 Resolver el bloque activo por equipo (reutilizar `getBloqueActivo`); si no hay bloque con `fecha_activacion <= hoy`, marcar el equipo como `sin_datos` (asistencia y minutaje `null`)
- [x] 2.5 Calcular `asistencia_pendiente`: sesiones no eliminadas del bloque activo con `fecha <= hoy` sin `registro_asistencia` completo para los miembros `con_ficha`/`sin_ficha` activos en esa fecha — sin llamar a `ensureSesionesRegla`
- [x] 2.6 Calcular `minutaje_pendiente` (solo `f7`/`f11`; `null` para `eskola`): jornadas con `fecha` no nula, `fecha <= hoy` y `fecha >= bloque.fecha_activacion` sin `participacion_jornada` completa para los miembros activos
- [x] 2.7 Calcular `semaforo`: `"rojo"` si algún pendiente es `true`, `"sin_datos"` si no hay bloque activo, `"verde"` en el resto
- [x] 2.8 Calcular `ultima_actualizacion_asistencia`/`ultima_actualizacion_minutaje` a partir del `updatedAt` más reciente de los registros del bloque activo (`null` si no hay ninguno; `ultima_actualizacion_minutaje` siempre `null` en `eskola`)

## 3. Backend: endpoints

- [x] 3.1 `GET /panel/estado?temporada_id=` — 400 si falta `temporada_id`; devuelve lista plana de equipos visibles con `categoria` y los campos calculados en la sección 2
- [x] 3.2 `GET /panel/estado/:equipoId` — mismos campos agregados de un equipo más `sesiones_pendientes` (`fecha`, `tipo`) y `jornadas_pendientes` (`numero`, `fecha`, `rival`)
- [x] 3.3 Registrar `PanelModule` en `AppModule`

## 4. Backend: tests (e2e)

- [x] 4.1 Test: `admin` y `entrenador` reciben 403 en ambos endpoints; `director`/`coordinador` reciben 200
- [x] 4.2 Test: `coordinador` con `categoria_asignada: f7` solo ve equipos `f7` en el listado
- [x] 4.3 Test: `GET /panel/estado` sin `temporada_id` responde 400
- [x] 4.4 Test: equipo con sesión pasada sin todos los `registro_asistencia` → `asistencia_pendiente: true`, `semaforo: "rojo"`
- [x] 4.5 Test: equipo con todas las sesiones/jornadas completas → `asistencia_pendiente`/`minutaje_pendiente: false`, `semaforo: "verde"`
- [x] 4.6 Test: equipo `eskola` → `minutaje_pendiente` y `ultima_actualizacion_minutaje` son `null`, no `false`
- [x] 4.7 Test: equipo sin bloque con `fecha_activacion <= hoy` → `semaforo: "sin_datos"`, ambos pendientes `null`
- [x] 4.8 Test: `GET /panel/estado` no crea ninguna `sesion` nueva como efecto secundario (a diferencia de `GET /equipos/:id/asistencia`)
- [x] 4.9 Test: `GET /panel/estado/:equipoId` devuelve `sesiones_pendientes`/`jornadas_pendientes` coherentes con el `semaforo` del equipo (vacías si `verde`)
- [x] 4.10 Test: `ultima_actualizacion_asistencia` refleja el `updatedAt` más reciente tras un `PATCH /equipos/:id/asistencia`

## 5. Frontend: ruta y navegación

- [x] 5.1 Añadir ruta `/panel` en `App.tsx` envuelta en `RoleGuard roles={['director','coordinador']}`
- [x] 5.2 Añadir enlace a `/panel` en `AppShell.tsx`, visible solo si `me.rol` es `director` o `coordinador`

## 6. Frontend: página del panel

- [x] 6.1 Crear `apps/web/src/panel/PanelPage.tsx`: selector de temporada (preselecciona la única `abierta`, mismo criterio que `AppShell.tsx`), llamada a `GET /panel/estado`
- [x] 6.2 Secciones por `categoria` (Eskola/F7/F11); ocultar las categorías no presentes en la respuesta (coordinador ve solo la suya)
- [x] 6.3 Tarjeta de equipo: nombre, badge de categoría, indicador de semáforo (🟢/🔴/neutro para `sin_datos`), chip de asistencia, chip de minutaje (`—` en `eskola`), timestamps de última actualización
- [x] 6.4 Auto-refresh: `setInterval` de 60000ms mientras `PanelPage` está montada, limpiado en el `useEffect` cleanup
- [x] 6.5 Crear `apps/web/src/panel/PanelDetailDrawer.tsx`: al hacer click en una tarjeta, `GET /panel/estado/:equipoId` y mostrar `sesiones_pendientes`/`jornadas_pendientes`, o el estado vacío "Todo al día / Dena eguneratuta" si no hay pendientes
- [x] 6.6 Crear `apps/web/src/panel/i18n.ts` con literales EU/ES (euskera por defecto)

## 7. Frontend: tests

- [x] 7.1 Test: `PanelPage` agrupa las tarjetas por categoría y oculta las categorías ausentes
- [x] 7.2 Test: tarjeta con `asistencia_pendiente: true` muestra el chip "Pendiente" y semáforo rojo
- [x] 7.3 Test: tarjeta de equipo `eskola` muestra `—` en el chip de minutaje
- [x] 7.4 Test: click en una tarjeta abre el drawer con las listas de pendientes (o el estado vacío)
- [x] 7.5 Test: `/panel` no es accesible (bloqueado por `RoleGuard`) para un usuario `entrenador`
- [x] 7.6 Test: `PanelPage` vuelve a llamar a `GET /panel/estado` tras el intervalo de refresco (usar fake timers)

## 8. Verificación final

- [x] 8.1 Ejecutar suite completa de tests de `apps/api` y `apps/web` — 83/83 e2e (api) y 51/51 (web) en verde
- [ ] 8.2 Probar manualmente: abrir `/panel` como director, confirmar semáforos y timestamps correctos; como coordinador, confirmar que solo ve su categoría; marcar una asistencia pendiente desde otra pestaña y confirmar que el panel se actualiza en ≤60s; confirmar que `admin` y `entrenador` no pueden acceder
