## 1. Backend: detalle de equipo incluye temporada.estado

- [x] 1.1 En `apps/api/src/catalogo/catalogo.service.ts`, `findEquipoDetail`: añadir `temporada: { select: { estado: true } }` al `include` de la query
- [x] 1.2 Test e2e: `GET /catalogo/equipos/:id` sobre un equipo de temporada cerrada devuelve `temporada.estado: 'cerrada'`
- [x] 1.3 Test e2e: `GET /catalogo/equipos/:id` sobre un equipo de temporada abierta devuelve `temporada.estado: 'abierta'`

## 2. Backend: endpoint de histórico

- [x] 2.1 Crear `apps/api/src/admin/historico/historico.module.ts`, `historico.controller.ts` (`@Controller('admin/historico')`, `@Roles('admin', 'director')`), `historico.service.ts`
- [x] 2.2 `HistoricoService`: `GET /admin/historico?page=&limit=` — `temporada.findMany({ where: { estado: 'cerrada' } })` paginado, con `id`, `nombre`, `fecha_inicio`, `fecha_fin`, `estado`
- [x] 2.3 Por cada temporada de la página, calcular `total_equipos` (`equipo.count`), `total_sesiones` (`sesion.count` vía `equipo.temporada_id`), `total_jornadas` (`jornada.count` vía `equipo.temporada_id`)
- [x] 2.4 Registrar `HistoricoModule` en `AdminModule`
- [x] 2.5 Test e2e: `admin` y `director` reciben 200 en `GET /admin/historico`; `coordinador` y `entrenador` reciben 403
- [x] 2.6 Test e2e: la respuesta solo incluye temporadas con `estado: 'cerrada'`, con estadísticas resumen correctas
- [x] 2.7 Test e2e: `director` recibe 403 en otros endpoints de `/admin/*` (p. ej. `GET /admin/users`) mientras sigue recibiendo 200 en `GET /admin/historico`

## 3. Frontend: routing y guards de /admin

- [x] 3.1 En `apps/web/src/App.tsx`: cambiar el `RoleGuard` del nodo padre de `/admin` de `roles={['admin']}` a `roles={['admin', 'director']}`
- [x] 3.2 Envolver individualmente las rutas hijas existentes (`usuarios`, `temporadas`, `equipos`) en su propio `<RoleGuard roles={['admin']}>`
- [x] 3.3 Añadir la ruta hija `historico` (sin guard adicional) apuntando a la nueva `HistoricoPage`
- [x] 3.4 En `apps/web/src/admin/AdminLayout.tsx`: añadir el link "Histórico" siempre visible; ocultar los links "Usuarios"/"Temporadas"/"Equipos" cuando `usuario.rol !== 'admin'`
- [x] 3.5 Test: usuario `director` navega a `/admin/historico` y ve la página; navega a `/admin/usuarios` y ve "Sin permiso"
- [x] 3.6 Test: `AdminLayout` oculta los links admin-only para `director` y los muestra para `admin`

## 4. Frontend: página de histórico

- [x] 4.1 Crear `apps/web/src/admin/historico/HistoricoPage.tsx`: lista paginada de temporadas cerradas (`nombre`, `fecha_inicio`, `fecha_fin`, estadísticas resumen) desde `GET /admin/historico`
- [x] 4.2 Click en una temporada navega a la vista de equipos de esa temporada en modo lectura (reutilizar `AppShell`/selector de temporada existente, preseleccionando esa temporada)
- [x] 4.3 Test: `HistoricoPage` renderiza la lista y navega al hacer click en una temporada

## 5. Frontend: modo solo lectura en /equipos/:id

- [x] 5.1 En `apps/web/src/catalogo/EquipoContext.tsx`: añadir `temporada: { estado: 'abierta' | 'cerrada' }` al tipo `EquipoDetalle`
- [x] 5.2 Crear `apps/web/src/catalogo/ReadOnlyBanner.tsx` (literales EU/ES: "Temporada cerrada / Denboraldia itxita — solo lectura / irakurketa soilik")
- [x] 5.3 En `apps/web/src/catalogo/EquipoDetailPage.tsx`: calcular `soloLectura = equipo.temporada.estado === 'cerrada'`, renderizar `<ReadOnlyBanner>` cuando `soloLectura`, y pasar `readOnly={soloLectura}` a `AsistenciaTab`, `AsistenciaF11Tab`, `MinutajeTab`, `AsistenciaEntrenadoresTab` (`PlantillaTab` no tiene acciones de escritura propias — el botón "+ Jugador" vive en `AsistenciaTab`, no en `PlantillaTab`; corregido respecto al plan inicial de `design.md`)
- [x] 5.4 Test: `EquipoDetailPage` muestra el banner para equipo de temporada cerrada y no lo muestra para temporada abierta

## 6. Frontend: deshabilitar escritura por pestaña

- [x] 6.1 `AsistenciaTab` (`apps/web/src/asistencia/AsistenciaTab.tsx`): con `readOnly`, las celdas de asistencia no ciclan estado al click y el botón "+ Jugador" no se renderiza
- [x] 6.2 `AsistenciaF11Tab` (`apps/web/src/asistencia/f11/AsistenciaF11Tab.tsx`): con `readOnly`, el click en celda no abre el menú contextual "MARCAR SESIÓN"
- [x] 6.3 `MinutajeTab` (`apps/web/src/minutaje/MinutajeTab.tsx`): con `readOnly`, el botón "GUARDAR JORNADA" no se renderiza y las pills de participación no son interactivas
- [x] 6.4 `AsistenciaEntrenadoresTab` (`apps/web/src/asistencia/entrenadores/AsistenciaEntrenadoresTab.tsx`): con `readOnly`, las celdas no ciclan estado y el modo edición (quitar sesión) no está disponible
- [x] 6.5 Test: cada uno de los 4 tabs anteriores, con `readOnly=true`, no dispara ninguna llamada de escritura al hacer click en sus controles interactivos

## 7. Frontend: badge "cerrada" en selectores de temporada

- [x] 7.1 En `apps/web/src/catalogo/AppShell.tsx`: mostrar una etiqueta "cerrada" junto a cada temporada con `estado: 'cerrada'` en el selector; sin cambios en el comportamiento de selección
- [x] 7.2 En `apps/web/src/panel/PanelPage.tsx`: mismo badge en su selector de temporada
- [x] 7.3 Test: el selector de `AppShell` muestra la etiqueta "cerrada" para temporadas cerradas y permite seleccionarlas
- [x] 7.4 Test: el selector de `PanelPage` muestra la etiqueta "cerrada" para temporadas cerradas

## 8. Verificación final

- [x] 8.1 Ejecutar la suite completa de tests de `apps/api` y `apps/web` en verde
- [ ] 8.2 Probar manualmente: cerrar una temporada de prueba desde `/admin/temporadas`; como `director`, navegar a `/admin/historico` y confirmar que aparece con sus estadísticas; abrir un equipo de esa temporada y confirmar el banner de solo lectura y que ninguna acción de escritura está disponible en ninguna pestaña; confirmar que `coordinador`/`entrenador` no pueden acceder a `/admin/historico`
