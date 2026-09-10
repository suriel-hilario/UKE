## Context

`99-decisiones.md` § G-A7 (DECIDIDO) exige que al cerrar una temporada sus datos pasen a solo lectura, con histórico accesible a `admin` y `director`. El cierre (`POST /admin/temporadas/:id/close`, `TemporadasService.close`) y el único guard de escritura (`AsistenciaAccessService.assertTemporadaAbierta`, que lanza 409 cuando `equipo.temporada.estado === 'cerrada'`) ya existen desde `add-backoffice` y se auditó su cobertura en `proposal.md`: está aplicado consistentemente en todos los endpoints `@Post`/`@Patch`/`@Delete` de asistencia, F11, minutaje y entrenadores, nunca en los `@Get`.

Durante el diseño se detectaron dos gaps de código no mencionados en `proposal.md`:

1. **`GET /catalogo/equipos/:id` no incluye `temporada`** (`CatalogoService.findEquipoDetail`, `apps/api/src/catalogo/catalogo.service.ts:44-57`). El frontend (`EquipoContext`/`EquipoDetalle`, `apps/web/src/catalogo/EquipoContext.tsx`) no tiene forma de saber si el equipo que está viendo pertenece a una temporada cerrada — hace falta para el banner de solo lectura.
2. **La ruta `/admin` está protegida por un único `RoleGuard roles={['admin']}` en el nodo padre** (`apps/web/src/App.tsx:42-54`), no por-ruta-hija. Todas las rutas hijas (`usuarios`, `temporadas`, `equipos`) heredan ese guard único. Añadir `historico` como hija directa la dejaría también admin-only, contradiciendo G-A7.

## Goals / Non-Goals

**Goals:**
- `GET /admin/historico?page=&limit=` accesible a `admin` y `director`, sin tocar el guard admin-only del resto de `/admin/*`.
- Banner de solo lectura + deshabilitación de acciones de escritura en `/equipos/:id` cuando `equipo.temporada.estado === 'cerrada'`, en las 4 pestañas relevantes (Plantilla, Asistencia, F11, Minutaje, Entrenadores).
- Badge "cerrada" en los selectores de temporada de `AppShell` y `PanelPage` (ambos ya listan temporadas cerradas sin filtrar).
- Documentar formalmente (specs) los guards 409 ya existentes, sin reimplementarlos.

**Non-Goals:**
- Reabrir una temporada (irreversible por G-A7).
- Cambiar el comportamiento de los guards `assertTemporadaAbierta` existentes — se documentan tal cual.
- Exportar o borrar datos históricos.
- Nuevas tablas o columnas en el schema (`temporada.estado` ya basta).

## Decisions

**D1. `GET /admin/historico` vive en un `HistoricoController` nuevo (`apps/api/src/admin/historico/`), no en `TemporadasController`, con `@Roles('admin', 'director')` propio a nivel de controller.**
`TemporadasController` completo está `@Roles('admin')` (requisito existente de `backoffice`); añadir un método con un `@Roles` distinto al del controller sería inconsistente con el patrón ya usado en el resto de `AdminModule` (un rol por controller, no por método). Un controller separado mantiene esa convención y aísla el único punto de `AdminModule` accesible a `director`.

**D2. Cálculo de estadísticas resumen: `equipo.count`, `sesion.count`, `jornada.count` por `temporada_id`, uno por cada temporada de la página solicitada (sin `_count` agregado precalculado, sin nueva tabla).**
Mismo criterio de coste que `panel-estado` § Risks ("cálculo 100% on-the-fly... aceptado dado el volumen esperado: un club"): el histórico se pagina (`page`/`limit`), así el número de temporadas por request es acotado, y no hay lectura repetida cada 60s como en el panel — se abre una vez al navegar a `/admin/historico`. Alternativa descartada: añadir columnas de contador cacheadas en `temporada` — se descarta por la misma razón que `add-panel-estado` § D2 rechazó materializar estado sin evidencia de que el volumen lo exija.

**D3. `GET /catalogo/equipos/:id` se extiende para incluir `temporada: { select: { estado: true } }` en el `include` de `CatalogoService.findEquipoDetail`.**
Es el único endpoint que alimenta `EquipoContext` (`ScopeGuard.tsx`), consumido por las 5 pestañas de `/equipos/:id`. Sin este campo no hay forma de derivar el estado de solo lectura en el frontend sin una llamada adicional. `EquipoDetalle` (frontend) gana `temporada: { estado: 'abierta' | 'cerrada' }`.

**D4. `App.tsx`: el `RoleGuard` del nodo padre de `/admin` pasa de `roles={['admin']}` a `roles={['admin', 'director']}`; cada ruta hija existente (`usuarios`, `temporadas`, `equipos`) se envuelve individualmente en su propio `<RoleGuard roles={['admin']}>`; la ruta nueva `historico` queda sin guard adicional (ya cubierta por el guard admin+director del padre).**
Es el cambio mínimo que abre `/admin/historico` a `director` sin tocar el resto: las 3 rutas existentes quedan exactamente igual de protegidas que hoy (dos guards anidados con el mismo resultado neto — `admin` únicamente), y solo la ruta nueva queda con el scope ampliado. Alternativa descartada: sacar `/admin/historico` como ruta top-level fuera de `/admin`, fuera de `AdminLayout` — se descarta porque G-A7 pide que sea "accesible desde administración" (mismo shell/sidebar que el resto de backoffice), no una sección aislada.

**D5. `AdminLayout.tsx`: el link "Histórico" del `<nav>` se muestra siempre (director solo ve ese link renderizado con datos, ya que las otras rutas igualmente redirigirían a "Sin permiso" si las visitara); los links "Usuarios"/"Temporadas"/"Equipos" se ocultan condicionalmente si `usuario.rol !== 'admin'` para no mostrarle a un director enlaces que sabemos que le van a devolver "Sin permiso".**
Evita la mala UX de un director viendo 3 enlaces muertos; usa el mismo patrón ya usado en `AppShell.tsx` para el enlace a `/panel` (visibilidad condicional por rol, `add-panel-estado`).

**D6. Read-only: `EquipoDetailPage` calcula `const soloLectura = equipo.temporada.estado === 'cerrada'` y pasa `readOnly={soloLectura}` a cada tab (`PlantillaTab`, `AsistenciaTab`, `AsistenciaF11Tab`, `MinutajeTab`, `AsistenciaEntrenadoresTab`); cada tab es responsable de deshabilitar sus propias acciones de escritura cuando `readOnly` es `true`, más un `<ReadOnlyBanner>` nuevo (componente compartido en `catalogo`) renderizado en `EquipoDetailPage` cuando `soloLectura`.**
Cada tab ya conoce sus propios botones de escritura (`editMode`, `handleCellClick`, `togglePillEstado`, `handleGuardar`, `+ Jugador`, etc. — `apps/web/src/asistencia/AsistenciaTab.tsx`, `apps/web/src/minutaje/MinutajeTab.tsx`); centralizar la lógica de qué deshabilitar en el padre requeriría levantar todo ese estado, un cambio mucho mayor no pedido por ninguna fuente. Pasar un único prop booleano y dejar que cada tab decida qué desactivar es el cambio mínimo, mismo patrón que los tabs ya reciben `equipo` vía `useEquipo()`.

**D7. Badge "cerrada": `AppShell.tsx` y `PanelPage.tsx` añaden `{temporada.estado === 'cerrada' && <span>({t('cerrada', lang)})</span>}` junto al `<option>`/entrada de cada temporada en sus selectores ya existentes — sin cambios de comportamiento de selección (ambos ya permiten seleccionar temporadas cerradas hoy).**
Cambio puramente visual sobre selectores que ya funcionan correctamente; no se toca la lógica de auto-selección de temporada abierta (`AppShell.tsx` D-existente) ni el requisito `temporada_id` obligatorio de `panel-estado` (`design.md` § D7 de ese change).

## Risks / Trade-offs

- **[Riesgo] D2: N+1 queries de conteo por página de histórico (3 counts × temporadas por página)** → Aceptado: paginado y navegación explícita (no polling), volumen esperado bajo (un club, pocas temporadas cerradas por año).
- **[Trade-off] D4 duplica el `RoleGuard` (uno en el padre `admin+director`, otro por ruta hija `admin`) en vez de un único guard con lógica condicional por ruta** → Aceptado: `RoleGuard` ya es un componente simple sin estado: anidarlo es más legible y menos propenso a errores que enseñarle a `RoleGuard` a variar su comportamiento por ruta hija.
- **[Riesgo] D6 depende de que cada tab implemente correctamente su propio `readOnly`** → Mitigado: el backend ya rechaza toda escritura sobre temporada cerrada con 409 (`assertTemporadaAbierta`) independientemente de lo que haga el frontend — un tab que olvide deshabilitar un botón produce un 409 visible, no una escritura fantasma.

## Migration Plan

1. Backend: `catalogo.service.ts` — añadir `temporada: { select: { estado: true } }` al `include` de `findEquipoDetail` (D3).
2. Backend: `HistoricoController`/`HistoricoService` nuevo bajo `apps/api/src/admin/historico/`, registrado en `AdminModule` (D1, D2).
3. Frontend: `EquipoDetalle` (tipo) gana `temporada: { estado: 'abierta' | 'cerrada' }`; `EquipoDetailPage` calcula `soloLectura` y renderiza `<ReadOnlyBanner>` + pasa `readOnly` a cada tab (D6).
4. Frontend: `App.tsx` reestructura los guards de `/admin` (D4); `AdminLayout.tsx` añade el link "Histórico" con visibilidad condicional (D5); nueva `HistoricoPage`.
5. Frontend: `AppShell.tsx` y `PanelPage.tsx` añaden el badge "cerrada" (D7).

Sin migración de base de datos. Rollback: revertir el deploy de `apps/api`/`apps/web`; no hay estado persistente nuevo.

## Open Questions

Ninguna. El único punto de diseño no resuelto en `proposal.md` (routing de `/admin/historico` para `director`) queda resuelto en D1, D4 y D5 arriba.
