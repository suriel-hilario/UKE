## Why

Al cerrar una temporada sus datos deben pasar a solo lectura y quedar accesibles como histórico para `admin` y `director` (`99-decisiones.md` § G-A7, DECIDIDO). El cierre (`POST /admin/temporadas/:id/close`) y el guard de escritura por temporada cerrada ya existen (`add-backoffice`, `AsistenciaAccessService.assertTemporadaAbierta`), pero no hay todavía (a) un punto de entrada dedicado para navegar el histórico, ni (b) ninguna señal en el frontend de que una temporada está cerrada — hoy un entrenador puede abrir una `sesion`/`jornada` de una temporada cerrada, intentar guardar y solo entonces descubrir el 409.

## What Changes

- Nuevo endpoint `GET /admin/historico?page=&limit=` — lista paginada de `temporada` con `estado='cerrada'` más estadísticas resumen, accesible a `admin` **y** `director` (`99-decisiones.md` § G-A7: "Accesible para admin y director").
  - **Conflicto con `backoffice` y resolución**: la spec actual de `backoffice` fija "todo endpoint bajo `/admin/*` SHALL estar marcado `@Roles('admin')`" (requirement existente, sourced a la matriz general G-B1) y el frontend protege toda la ruta `/admin` con `RoleGuard roles={['admin']}`. G-A7 es una decisión posterior y más específica que abre explícitamente el histórico a `director`; se resuelve a favor de G-A7 (específica > general): `GET /admin/historico` vive en un `HistoricoController` separado con `@Roles('admin', 'director')` propio, independiente del guard admin-only del resto de `AdminModule`. En el frontend, `/admin/historico` usa `RoleGuard roles={['admin','director']}`; la entrada "Histórico" en el sidebar es visible para ambos roles. El resto de `/admin/*` no cambia. Source: `99-decisiones.md` § G-A7 ("accesible para admin y director"); G-B1 (específico > general).
- Auditoría de los guards 409 "temporada cerrada" (`AsistenciaAccessService.assertTemporadaAbierta`) en los endpoints de escritura de `add-asistencia-jugadores`, `add-asistencias-f11`, `add-minutaje` y `add-asistencia-entrenadores`. **Hallazgo al escribir `specs/`**: ya están documentados como requisito formal en `asistencia-jugadores`, `minutaje` y `asistencia-entrenadores` (cada uno con su propio escenario 409); `asistencias-f11` reutiliza el mismo endpoint `PATCH /equipos/:id/asistencia` que `asistencia-jugadores`, así que queda cubierta por ese mismo requisito sin necesitar uno propio. No hace falta documentación de backend nueva — el gap real y lo único que añade este change en estas 4 capabilities es la deshabilitación de la interacción de escritura en el frontend cuando la temporada está cerrada (ver Modified Capabilities).
- Frontend: sección "Histórico" en el sidebar de `/admin`, visible para `admin` y `director` (`99-decisiones.md` § G-A7: "accesible desde administración").
- Frontend: página `/admin/historico` con lista de temporadas cerradas y navegación a sus datos en modo lectura.
- Frontend: banner de solo lectura ("Temporada cerrada / Denboraldia itxita — solo lectura / irakurketa soilik") en `/equipos/:id` cuando el equipo pertenece a una temporada cerrada, y deshabilitación de todas las acciones de escritura visibles en esa vista (celdas de asistencia, modo edición, botón guardar de minutaje, botón "+ Jugador") — mejora de UX preventiva; el backend ya rechaza esas escrituras con 409 (`99-decisiones.md` § G-A7: "ninguna edición posible sobre temporadas cerradas").
- Frontend: badge "cerrada" en los selectores de temporada existentes de `AppShell` (`catalogo-equipos`) y del panel de estado (`panel-estado`) — ambos ya listan temporadas cerradas (sin filtrar por `estado`), pero hoy no lo comunican visualmente.

**BREAKING**: ninguno — todo lo anterior es aditivo sobre endpoints/UI existentes.

## Capabilities

### New Capabilities
- `historico`: listado paginado de temporadas cerradas con estadísticas resumen (`GET /admin/historico`) y la página `/admin/historico` que lo consume.

### Modified Capabilities
- `backoffice`: nuevo acceso de `director` a `/admin/historico` vía `HistoricoController` propio con `@Roles('admin', 'director')` (ver resolución arriba) y nueva entrada "Histórico" en el sidebar de `/admin`, visible para `admin` y `director`.
- `asistencia-jugadores`: documentar como requisito formal que `assertTemporadaAbierta` bloquea con 409 la escritura sobre temporadas cerradas, y que el frontend deshabilita la interacción de celda cuando el equipo pertenece a una temporada cerrada.
- `asistencias-f11`: mismo requisito formal de bloqueo 409 + deshabilitación de UI para el módulo de 10 estados.
- `minutaje`: mismo requisito formal de bloqueo 409 + ocultar/deshabilitar el botón "Guardar jornada" cuando la temporada está cerrada.
- `asistencia-entrenadores`: mismo requisito formal de bloqueo 409 + deshabilitación de UI para asistencia de entrenadores.
- `catalogo-equipos`: banner de solo lectura en `/equipos/:id` para equipos de temporada cerrada; badge "cerrada" en el selector de temporada de `AppShell`; ocultar el botón "+ Jugador" en la plantilla cuando la temporada está cerrada.
- `panel-estado`: badge "cerrada" en el selector de temporada del panel.

## Impact

- **Backend** (`apps/api`): nuevo `HistoricoController`/`HistoricoService` (controller propio, no extensión de `admin/temporadas`, para poder declarar `@Roles('admin', 'director')` sin tocar el guard admin-only del resto de `AdminModule`) para `GET /admin/historico`; sin cambios de schema (`temporada.estado` ya existe — `98-modelo-datos.md` § temporada). No se tocan los guards `assertTemporadaAbierta` existentes, solo se documentan como requisitos.
- **Frontend** (`apps/web`): nueva página `HistoricoPage`, entrada de navegación en el sidebar de `/admin`, componente de banner de solo lectura reutilizable en la página de detalle de equipo, y ajuste de los selectores de temporada existentes en `AppShell.tsx` y `PanelPage.tsx` para mostrar el badge "cerrada".
- **Fuera de alcance**: reabrir una temporada cerrada (irreversible por G-A7, no existe endpoint y no debe crearse uno), borrar datos históricos, exportar datos históricos (ninguna fuente lo pide), migrar formato de datos entre temporadas.

## Open Questions

Ninguna — todos los requisitos citan G-A7, G-B1 o comportamiento ya verificado en el código existente (`AsistenciaAccessService.assertTemporadaAbierta`, `GET /catalogo/temporadas` sin filtro de `estado`), incluida la convivencia de `@Roles('admin')` del resto de `/admin/*` con el acceso de `director` a `/admin/historico` (resuelta arriba, § What Changes).
