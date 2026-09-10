## 1. Backend: módulo catalogo y scope

- [x] 1.1 Crear módulo `catalogo` (`apps/api/src/catalogo/catalogo.module.ts`), registrarlo en `AppModule`
- [x] 1.2 `CatalogoAccessService.resolveUsuario(auth0Id)` — resuelve `usuario` local desde `auth0_id`; lanza `NotFoundException` si no existe
- [x] 1.3 `CatalogoAccessService.getEquiposWhere(usuario, temporadaId)` — filtro Prisma por rol: `admin`/`director` → `{ temporada_id }`; `coordinador` → `{ temporada_id, categoria: usuario.categoria_asignada }` (si `categoria_asignada` es `null`, el filtro no debe matchear ningún equipo); `entrenador` → `{ temporada_id, equipos: { some: { usuario_id } } }`
- [x] 1.4 `CatalogoAccessService.assertEquipoAccess(usuario, equipoId)` — reutiliza `getEquiposWhere` con `findFirst`; lanza `ForbiddenException` (403) si no hay match

## 2. Backend: endpoints de catálogo

- [x] 2.1 `GET /catalogo/temporadas` — lista completa, sin scope, cualquier rol autenticado
- [x] 2.2 `GET /catalogo/temporadas/:id/equipos` — aplica `getEquiposWhere`; incluye `nombre`, `categoria`, `color`, `icono`, `num_miembros_activos` (`_count` de `miembro_equipo` activos); scope vacío devuelve 200 con `[]`
- [x] 2.3 `GET /catalogo/equipos/:id` — `assertEquipoAccess` primero (403 si falla); devuelve detalle de equipo + `miembro_equipo` activos (`fecha_baja IS NULL` o `fecha_baja > hoy`) ordenados por `orden`, con `persona`, `grupo`, `rol_entrenador`, `fecha_incorporacion`, `fecha_baja`
- [x] 2.4 `GET /catalogo/equipos/:id/sesiones` — `assertEquipoAccess` primero; requiere query param `bloque_id` (400 si falta); filtra `eliminada = false`; devuelve `id`, `fecha`, `numero`, `tipo`, `origen`

## 3. Backend: preferencia de idioma

- [x] 3.1 `PATCH /auth/me/idioma` en `AuthController` existente — inyecta `PrismaService`, resuelve `usuario` por `auth0_id`, actualiza `idioma` (`eu`/`es`); 404 si no existe fila local

## 4. Backend: tests e2e

- [x] 4.1 Test: `GET /catalogo/temporadas` accesible a los 4 roles, misma lista para todos
- [x] 4.2 Test: `GET /catalogo/temporadas/:id/equipos` con rol `director` → todos los equipos de la temporada
- [x] 4.3 Test: `GET /catalogo/temporadas/:id/equipos` con rol `coordinador` → solo equipos de su `categoria_asignada`
- [x] 4.4 Test: `GET /catalogo/temporadas/:id/equipos` con `coordinador.categoria_asignada = null` → lista vacía, no todas
- [x] 4.5 Test: `GET /catalogo/temporadas/:id/equipos` con rol `entrenador` → solo equipos vinculados vía `usuario_equipo`
- [x] 4.6 Test: `GET /catalogo/equipos/:id` dentro de scope → 200 con miembros activos ordenados por `orden`, sin miembros con `fecha_baja` pasada
- [x] 4.7 Test: `GET /catalogo/equipos/:id` fuera de scope → 403
- [x] 4.8 Test: `GET /catalogo/equipos/:id/sesiones` sin `bloque_id` → 400
- [x] 4.9 Test: `GET /catalogo/equipos/:id/sesiones` con `eliminada=true` → excluida del resultado
- [x] 4.10 Test: `GET /catalogo/equipos/:id/sesiones` fuera de scope → 403
- [x] 4.11 Test: `PATCH /auth/me/idioma` actualiza `usuario.idioma` y responde 200
- [x] 4.12 Test: `PATCH /auth/me/idioma` sin fila `usuario` local → 404

## 5. Frontend: shell de navegación

- [x] 5.1 Crear `apps/web/src/catalogo/` con `i18n.ts` (literales EU/ES propios de este módulo, euskera por defecto — mismo patrón que `apps/web/src/admin/i18n.ts`)
- [x] 5.2 Componente `AppShell`: topbar (nombre "UKE", toggle de idioma, badge `nombre_visible` + `rol`, logout) + navegación por categoría (Eskola/F7/F11) derivada de las categorías presentes en la respuesta de equipos
- [x] 5.3 Montar `AppShell` en `App.tsx` para las rutas no-admin, envuelto en `ProtectedRoute` existente (sin modificarlo)
- [x] 5.4 Selección de temporada: si existe una única `temporada` con `estado: abierta`, usarla por defecto; si hay 0 o más de una, mostrar selector simple

## 6. Frontend: catálogo de equipos

- [x] 6.1 Página de categoría: tarjetas de equipo (`nombre`, badge `categoria`, punto `color`, `icono`, `num_miembros_activos`) para la categoría seleccionada
- [x] 6.2 Click en tarjeta navega a `/equipos/:id`

## 7. Frontend: detalle de equipo

- [x] 7.1 Componente `ScopeGuard`: envuelve `/equipos/:id`, llama a `GET /catalogo/equipos/:id`, redirige a pantalla "Sin acceso / Sarbiderik ez" si 403, pasa el equipo recibido a los hijos si 200
- [x] 7.2 Página de detalle: cabecera (`nombre`, `categoria`, `color`, `icono`) + barra de pestañas con únicamente "Plantilla" (sin añadir Asistencia/Minutaje)
- [x] 7.3 Pestaña "Plantilla": miembros activos agrupados por `grupo` (Con Ficha / Sin Ficha / Entrenadores), ordenados por `orden` dentro de cada grupo; cada fila con avatar (iniciales como fallback), `nombre`, `alias?`, `rol_entrenador?`, `fecha_incorporacion`

## 8. Frontend: idioma

- [x] 8.1 Toggle de idioma en la topbar llama a `PATCH /auth/me/idioma` y actualiza los literales de la UI

## 9. Frontend: tests

- [x] 9.1 Test: navegación por categoría se filtra a las categorías presentes en los equipos visibles
- [x] 9.2 Test: `ScopeGuard` redirige a "Sin acceso" cuando `GET /catalogo/equipos/:id` responde 403
- [x] 9.3 Test: pestaña "Plantilla" agrupa y ordena miembros correctamente, excluyendo dados de baja
- [x] 9.4 Test: toggle de idioma llama a `PATCH /auth/me/idioma` con el payload correcto

## 10. Literales EU/ES

- [x] 10.1 Todos los literales nuevos del shell y catálogo en euskera y castellano (G-C5), euskera por defecto

## 11. Verificación manual end-to-end

- [x] 11.1 Loguear como `director` y confirmar que ve todos los equipos de la temporada abierta
- [x] 11.2 Loguear como `coordinador` y confirmar que solo ve equipos de su categoría asignada
- [x] 11.3 Loguear como `entrenador` y confirmar que solo ve sus equipos vinculados
- [x] 11.4 Navegar a `/equipos/:id` de un equipo fuera de scope (URL directa) y confirmar la pantalla "Sin acceso"
- [ ] 11.5 Cambiar el idioma desde el toggle y confirmar que persiste tras recargar (releer `usuario.idioma` en el siguiente `GET /auth/me`) — no verificado en vivo: el toggle vive en `AppShell`, que solo se renderiza para JWT con rol no-admin en Auth0 (la cuenta de prueba usada tiene rol `admin` en Auth0); cubierto por tests automatizados (`AppShell.test.tsx`, `catalogo.e2e-spec.ts`)
