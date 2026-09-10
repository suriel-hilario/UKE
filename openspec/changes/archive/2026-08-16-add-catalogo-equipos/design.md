## Context

`add-backoffice` dejó el guard global (`JwtAuthGuard` + `RolesGuard`) rechazando por defecto cualquier request sin `@Roles(...)` que coincida con el rol del JWT, y un `AdminModule` cuyos endpoints son todos `@Roles('admin')`. Ese guard solo mira el claim de rol del JWT — nunca toca la BD. Este change es el primer consumidor que necesita algo más granular: no basta con "tiene rol X", hay que resolver *qué* `equipo`s puede ver ese usuario según `usuario.categoria_asignada` (coordinador) o `usuario_equipo` (entrenador), datos que solo existen en Postgres. Es también el primer módulo visible para roles no-admin, así que introduce el shell de navegación persistente sobre el que se montarán todos los módulos deportivos siguientes.

## Goals / Non-Goals

**Goals:**
- Un mecanismo de scope por rol reutilizable entre los tres endpoints de catálogo que lo necesitan (equipos, detalle de equipo, sesiones), sin duplicar la lógica de "¿puede este usuario ver este equipo?".
- Endpoints de solo lectura bajo `/catalogo/*`, accesibles a los 4 roles, cada uno filtrado a lo que ese rol puede ver.
- Shell de navegación persistente (topbar + navegación por categoría) que sirva de base a los módulos deportivos futuros.
- `PATCH /auth/me/idioma` como extensión mínima del `/auth/me` ya existente.

**Non-Goals:**
- Ninguna escritura sobre `equipo`/`miembro_equipo`/`temporada` (sigue siendo `add-backoffice`).
- Ninguna pestaña de Asistencia ni Minutaje en el detalle de equipo — solo "Plantilla".
- Ningún panel de estado, notificación ni cómputo de porcentajes (fuera de alcance del proposal).
- Ninguna selección multi-temporada persistida por usuario — ver D5.

## Decisions

**D1. El scope se resuelve en un `CatalogoAccessService` inyectable, no en un Guard de ruta.**
A diferencia de `RolesGuard` (una comprobación booleana sobre el claim del JWT, igual para cualquier ruta), el scope de catálogo tiene dos formas distintas de uso: (a) un filtro de fila para listados (`GET .../equipos` devuelve *menos* filas, nunca 403) y (b) una comprobación de todo-o-nada para un recurso concreto (`GET .../equipos/:id`, `GET .../equipos/:id/sesiones` → 403 si el `equipoId` no está en el ámbito). Un Guard de ruta no modela bien el caso (a) porque no puede alterar la query que hace el service. Se centraliza en un servicio con dos métodos:
  - `resolveUsuario(auth0Id): Promise<Usuario>` — un único punto que traduce `req.user.sub` a la fila `usuario` local (usado también por `PATCH /auth/me/idioma`).
  - `getEquiposWhere(usuario, temporadaId): Prisma.equipoWhereInput` — construye el filtro según rol (`director`/`admin`: `{ temporada_id }`; `coordinador`: `{ temporada_id, categoria: usuario.categoria_asignada }`; `entrenador`: `{ temporada_id, equipos: { some: { usuario_id: usuario.id } } }`).
  - `assertEquipoAccess(usuario, equipoId): Promise<void>` — reutiliza `getEquiposWhere` con `findFirst` sobre el `equipoId` concreto; lanza `ForbiddenException` (403) si no hay match.
  Ningún controller ni service de `catalogo` construye su propia condición de scope — todos pasan por este servicio (mismo principio de aislamiento que `ManagementService` en `add-backoffice`).

**D2. Los endpoints de catálogo no llevan `@Roles(...)` — se apoyan en el comportamiento por defecto de `RolesGuard` (autenticado sin roles declarados = permitido).**
Los 4 roles pueden llamar a todos los endpoints de `/catalogo/*` (el filtrado real ocurre por scope, no por rol). Añadir `@Roles('admin','director','coordinador','entrenador')` sería redundante con "cualquier usuario autenticado" y se desincronizaría si se añade un rol nuevo en el futuro. Mismo patrón que `GET /auth/me` (`add-auth`), que tampoco lleva `@Roles`.

**D3. `GET /catalogo/temporadas` no aplica scope — todos los roles ven la misma lista completa.**
El proposal y G-B1 no distinguen ámbito para la visibilidad de `temporada` en sí (el scope aplica a `equipo`), y no tiene sentido ocultar temporadas: un coordinador necesita saber que existe una temporada aunque no vea todos sus equipos.

**D4. Listados con scope vacío devuelven `200` con array vacío, nunca `403`.**
`GET /catalogo/temporadas/:id/equipos` es una operación de listado que el caller siempre tiene permiso de invocar; el scope decide *cuántas* filas ve, no si puede llamar al endpoint. El `403` se reserva para accesos a un recurso concreto fuera de ámbito (`GET /catalogo/equipos/:id`, `.../sesiones`) — ahí sí hay una intención clara de acceder a un equipo específico que no le corresponde.

**D5. Selección de temporada en el frontend: por defecto la única `temporada` con `estado: abierta`; si hay cero o más de una, se muestra un selector simple.**
Ninguna fuente especifica una "temporada activa" explícita — en la práctica del club solo hay una `temporada` abierta a la vez (cerrar es irreversible, G-A7), pero el modelo no lo fuerza a nivel de BD. Decisión de ingeniería, no de producto: usar la abierta como default evita una pantalla de selección en el caso común (una única temporada abierta) sin bloquear el caso multi-temporada.

**D6. `GET /catalogo/temporadas/:id/equipos` incluye `num_miembros_activos` calculado (`_count` de `miembro_equipo` con `fecha_baja IS NULL` o `fecha_baja > hoy`) en la respuesta.**
La tarjeta de equipo del proposal exige mostrar ese número; no está en el modelo de datos como columna, así que se calcula en el service con `prisma.equipo.findMany` + `_count` o una subquery, no se persiste.

**D7. `PATCH /auth/me/idioma` vive en `AuthController` (`auth.module.ts`), no en el nuevo módulo `catalogo`.**
Extiende `/auth/me`, que ya vive ahí. `AuthModule` no importaba `PrismaService` hasta ahora, pero `PrismaModule` es `@Global()`, así que no hace falta tocar sus imports — sí se necesita inyectar `PrismaService` en `AuthController` (hoy no tiene dependencias). Si el `usuario` no existe en BD para ese `auth0_id` (caso borde: rol asignado en Auth0 pero nunca provisto en backoffice), responde `404` — mismo patrón que `findUniqueOrThrow` en `UsersService`.

**D8. Frontend: las pestañas de categoría (Eskola/F7/F11) del sidebar se derivan de las `categoria` presentes en la respuesta de `GET .../equipos`, no de un endpoint dedicado.**
No hay ninguna fuente que pida un endpoint de "categorías visibles"; construirlo sería una superficie de API no pedida. El shell simplemente agrupa la lista de equipos ya scoped por `categoria` y oculta las pestañas sin equipos.

**D9. `ScopeGuard` es un componente que envuelve el contenido de `/equipos/:id`, no una llamada duplicada de scope en cada módulo hijo.**
Llama una vez a `GET /catalogo/equipos/:id` al montar la ruta; si responde 403 redirige a "Sin acceso / Sarbiderik ez", si responde 200 pasa el `equipo` recibido a sus hijos vía contexto/props (evita que la pestaña "Plantilla" tenga que repetir el fetch — ya viene en el detalle).

## Risks / Trade-offs

- **[Riesgo] `getEquiposWhere` mal construido para `coordinador` filtraría por la `categoria_asignada` incorrecta si el usuario tiene ese campo `null`** (p. ej. un coordinador sin categoría asignada en backoffice) → Mitigación: si `categoria_asignada` es `null`, el filtro no debe matchear nada (lista vacía), nunca "todas" por accidente; se cubre con un test explícito.
- **[Riesgo] `assertEquipoAccess` y `getEquiposWhere` divergen con el tiempo si alguien añade un endpoint de catálogo nuevo sin pasar por `CatalogoAccessService`** → Mitigación: ningún controller de `catalogo` debe construir un `where` de `equipo` a mano; revisión de code review, no hay enforcement automático (fuera de alcance añadir un lint rule).
- **[Trade-off] `D5` (temporada abierta por defecto) es una decisión de UX no confirmada por producto** → Aceptado por ahora; si el club llega a operar con más de una temporada abierta simultánea, este comportamiento se revisita (no bloquea ningún dato, solo qué se muestra primero).
- **[Riesgo] `num_miembros_activos` (D6) recalculado en cada listado puede ser costoso con muchos equipos** → Aceptado: volumen del club es bajo (decenas de equipos), no se optimiza prematuramente.

## Migration Plan

No hay migración de BD (el schema ya existe desde `add-data-model`; `usuario.idioma` ya está migrado). Pasos de implementación:
1. `CatalogoAccessService` + módulo `catalogo` (`apps/api/src/catalogo/`), sin exponer sus métodos fuera del módulo salvo a través de los controllers.
2. Endpoints de catálogo (temporadas, equipos, detalle, sesiones), cada uno pasando por `CatalogoAccessService` desde el primer commit.
3. `PATCH /auth/me/idioma` en `AuthController` existente.
4. Frontend: shell de navegación + páginas de catálogo, consumiendo los endpoints anteriores; `ScopeGuard` envolviendo `/equipos/:id`.

Rollback: sin migración de datos, revertir el deploy de `apps/api`/`apps/web` es suficiente.

## Open Questions

Ninguna pendiente: la única abierta en el proposal (`/users/me/idioma` vs `/auth/me/idioma`) se resolvió en el proposal (`PATCH /auth/me/idioma`, extiende `/auth/me`).
