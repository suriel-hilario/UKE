## Why

`add-backoffice` deja el catálogo (temporadas, equipos, plantillas) gestionable solo por `admin`, pero ningún rol no-admin (`director`, `coordinador`, `entrenador`) tiene todavía forma de navegar ni ver ese catálogo — hoy solo pueden loguearse y ver la pantalla post-login vacía. Es el quinto change de la secuencia prevista (`project.md` § Secuencia de changes prevista, punto 5) y el prerrequisito de navegación/scope que todos los módulos deportivos (asistencia, minutaje) necesitan antes de poder registrar nada.

## What Changes

Backend (`apps/api`):
- Helper/guard de scope compartido (no duplicado por endpoint): resuelve el `usuario` local por `auth0_id` del JWT y valida acceso a un `equipo` según la matriz de permisos — `director` accede a todos los equipos de la temporada, `coordinador` solo a los de su `categoria_asignada`, `entrenador` solo a los vinculados vía `usuario_equipo`, `admin` a todos (`99-decisiones.md` § G-B1, fila "Catálogo"). Responde 403 si el usuario está fuera de su ámbito.
- `GET /catalogo/temporadas` — lista `temporada` (`id`, `nombre`, `estado`); accesible a `admin`, `director`, `coordinador`, `entrenador` (G-B1).
- `GET /catalogo/temporadas/:id/equipos` — lista `equipo` de una temporada, filtrados por el scope del rol llamante (G-B1).
- `GET /catalogo/equipos/:id` — detalle de `equipo` (`nombre`, `categoria`, `color`, `icono`, `minutos_por_periodo`, `num_periodos`, `dias_entrenamiento`) más sus `miembro_equipo` activos (`fecha_baja IS NULL` o `fecha_baja > hoy`, ordenados por `orden`), con `persona` (`nombre`, `alias`, `foto_url`), `grupo`, `rol_entrenador`, `fecha_incorporacion`, `fecha_baja`. Sujeto al mismo scope; 403 si el equipo está fuera del ámbito del caller (`98-modelo-datos.md` § equipo, § miembro_equipo, § persona).
- `GET /catalogo/equipos/:id/sesiones` — lista `sesion` de un equipo para un `bloque_id` dado (query param obligatorio), filtrando `eliminada = false`; campos `id`, `fecha`, `numero`, `tipo`, `origen`. Mismo scope (`98-modelo-datos.md` § sesion).
- `PATCH /auth/me/idioma` — actualiza `usuario.idioma` (`eu`/`es`) del usuario autenticado; extiende el recurso `/auth/me` ya existente de `add-auth`; accesible a cualquier rol autenticado (`99-decisiones.md` § G-C5, idioma como preferencia por usuario; `add-auth`, endpoint `/auth/me` existente).

Frontend (`apps/web`):
- Shell de navegación persistente para roles no-admin tras login: topbar (nombre de la app, toggle de idioma EU/ES, badge de usuario con `nombre_visible` + `rol`, botón de logout), navegación lateral (o inferior en móvil) por categoría (Eskola/F7/F11) filtrada al scope visible del usuario, área principal con tarjetas de equipo dentro de la categoría seleccionada (`99-decisiones.md` § G-A9, navegación Categoría → Equipo → Módulo; referencia UX: `UKE-Docs/inventario/01-asistencias-jugadores-eskola-f7.md` § Pantalla 2, `03-asistencias-f11.md` § Pantalla 2).
- Tarjeta de equipo: `nombre`, badge de `categoria`, punto de `color`, `icono`, nº de miembros activos; click navega al detalle.
- Página de detalle de equipo (`/equipos/:id`): cabecera (`nombre`, `categoria`, `color`, `icono`); barra de pestañas con, en este change, únicamente la pestaña "Plantilla" (las pestañas "Asistencia" y "Minutaje" se añaden en sus changes respectivos, `add-asistencia-*`/`add-minutaje` — no se crean aquí).
- Pestaña "Plantilla": lista de `miembro_equipo` activos agrupados por `grupo` (Con Ficha / Sin Ficha / Entrenadores), ordenados por `orden` dentro de cada grupo; cada fila muestra foto/avatar (iniciales como fallback), `nombre`, `alias?`, `rol_entrenador?`, `fecha_incorporacion`.
- Nuevo componente `ScopeGuard`: envuelve `/equipos/:id` junto con el `ProtectedRoute` ya existente (`add-auth`, sin modificarlo); llama a `GET /catalogo/equipos/:id` y redirige a una pantalla "Sin acceso / Sarbiderik ez" si la respuesta es 403.
- El toggle de idioma llama a `PATCH /auth/me/idioma` para persistir la preferencia.

Fuera de alcance (explícito): registro de asistencia, registro de minutaje, panel de estado, notificaciones, cualquier operación de escritura sobre `equipo`/`miembro_equipo` (eso es `add-backoffice`, ya completado).

## Capabilities

### New Capabilities
- `catalogo-equipos`: navegación de catálogo de solo lectura (temporadas, equipos, plantillas, sesiones por bloque) con scope por rol, backend + frontend, para roles `admin`/`director`/`coordinador`/`entrenador`.

### Modified Capabilities
(ninguna — `auth`, `data-model` y `backoffice` no cambian sus requirements; este change los consume tal como están)

## Impact

- **apps/api**: nuevo módulo `catalogo` con endpoints de temporadas/equipos/sesiones de solo lectura; nuevo helper/guard de scope por rol (reutilizable, no duplicado); nuevo endpoint `PATCH /auth/me/idioma` en el módulo `auth` existente, junto a `GET /auth/me`.
- **apps/web**: nuevo shell de navegación persistente (topbar + sidebar/bottom-nav), nuevas páginas de catálogo de equipos y detalle de equipo (pestaña Plantilla), nuevo componente `ScopeGuard`, nueva pantalla "Sin acceso".
- **BD**: ningún cambio de schema — usa los modelos ya migrados en `add-data-model` (`usuario.idioma` ya existe) tal cual.
- **Fuera de alcance** (explícito): módulos deportivos (asistencia, minutaje); panel de estado; notificaciones; cualquier escritura sobre catálogo (eso sigue siendo `add-backoffice`).
