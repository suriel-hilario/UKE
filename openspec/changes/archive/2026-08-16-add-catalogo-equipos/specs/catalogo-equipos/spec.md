## ADDED Requirements

### Requirement: Resolución de scope de catálogo por rol
El sistema SHALL exponer un único servicio (`CatalogoAccessService`) que resuelve el `usuario` local desde el `auth0_id` del JWT y determina qué `equipo` puede ver cada rol según la matriz de permisos: `admin` y `director` ven todos los equipos de la temporada; `coordinador` solo los de su `categoria_asignada`; `entrenador` solo los vinculados vía `usuario_equipo`. Ningún endpoint de `/catalogo/*` SHALL construir su propio filtro de scope (`99-decisiones.md` § G-B1, matriz de permisos, fila "Catálogo"; `design.md` § D1).

#### Scenario: Coordinador sin categoria_asignada no ve ningún equipo
- **WHEN** un usuario con rol `coordinador` y `categoria_asignada` nula pide equipos de una temporada
- **THEN** el sistema no le devuelve ningún equipo (no interpreta "sin categoría" como "todas las categorías")

#### Scenario: Entrenador solo ve sus equipos vinculados
- **WHEN** un usuario con rol `entrenador` vinculado a 2 de los 5 equipos de una temporada pide la lista de equipos
- **THEN** el sistema le devuelve únicamente esos 2 equipos

### Requirement: Listado de temporadas
`GET /catalogo/temporadas` SHALL devolver todas las `temporada` (`id`, `nombre`, `estado`) sin aplicar scope por rol, accesible a cualquier usuario autenticado con rol `admin`, `director`, `coordinador` o `entrenador` (proposal; `99-decisiones.md` § G-B1).

#### Scenario: Cualquier rol autenticado lista temporadas
- **WHEN** un usuario autenticado con rol `admin`, `director`, `coordinador` o `entrenador` hace `GET /catalogo/temporadas`
- **THEN** el sistema responde 200 con la lista completa de temporadas, igual para todos los roles

### Requirement: Listado de equipos de una temporada filtrado por scope
`GET /catalogo/temporadas/:id/equipos` SHALL devolver los `equipo` de la temporada indicada, filtrados según el scope del rol llamante (Requirement "Resolución de scope de catálogo por rol"), incluyendo `nombre`, `categoria`, `color`, `icono` y `num_miembros_activos` calculado. Un scope vacío SHALL devolver 200 con lista vacía, nunca un error (`design.md` § D4, D6).

#### Scenario: Director ve todos los equipos de la temporada
- **WHEN** un usuario con rol `director` hace `GET /catalogo/temporadas/:id/equipos`
- **THEN** el sistema responde 200 con todos los equipos de esa temporada

#### Scenario: Coordinador sin equipos en su categoría recibe lista vacía
- **WHEN** un usuario con rol `coordinador` cuya `categoria_asignada` no tiene ningún equipo en esa temporada hace `GET /catalogo/temporadas/:id/equipos`
- **THEN** el sistema responde 200 con una lista vacía (no 403, no error)

### Requirement: Detalle de equipo con plantilla activa
`GET /catalogo/equipos/:id` SHALL devolver el detalle completo del `equipo` (`nombre`, `categoria`, `color`, `icono`, `minutos_por_periodo`, `num_periodos`, `dias_entrenamiento`) junto con sus `miembro_equipo` activos (`fecha_baja IS NULL` o `fecha_baja > hoy`, ordenados por `orden`), cada uno con `persona` (`nombre`, `alias`, `foto_url`), `grupo`, `rol_entrenador`, `fecha_incorporacion`, `fecha_baja`. SHALL responder 403 si el equipo está fuera del scope del caller (`98-modelo-datos.md` § equipo, § miembro_equipo, § persona; `design.md` § D1).

#### Scenario: Acceso a equipo dentro del scope
- **WHEN** un usuario con acceso al equipo (según su rol y scope) hace `GET /catalogo/equipos/:id`
- **THEN** el sistema responde 200 con el detalle del equipo y su lista de miembros activos ordenada por `orden`

#### Scenario: Acceso a equipo fuera del scope
- **WHEN** un usuario con rol `entrenador` no vinculado a un equipo, o `coordinador` cuya `categoria_asignada` no coincide con la `categoria` del equipo, hace `GET /catalogo/equipos/:id`
- **THEN** el sistema responde 403

#### Scenario: Miembro dado de baja no aparece en la plantilla
- **WHEN** un `miembro_equipo` del equipo tiene `fecha_baja` en el pasado
- **THEN** ese miembro no aparece en la respuesta de `GET /catalogo/equipos/:id`

### Requirement: Listado de sesiones de un equipo por bloque
`GET /catalogo/equipos/:id/sesiones` SHALL devolver las `sesion` del equipo indicado para el `bloque_id` recibido como query param obligatorio, excluyendo las marcadas `eliminada = true`, con campos `id`, `fecha`, `numero`, `tipo`, `origen`. Sujeto al mismo scope que el detalle de equipo; SHALL responder 403 si el equipo está fuera de ámbito (`98-modelo-datos.md` § sesion; `design.md` § D1).

#### Scenario: Listar sesiones de un bloque
- **WHEN** un usuario con acceso al equipo hace `GET /catalogo/equipos/:id/sesiones?bloque_id=<id>`
- **THEN** el sistema responde 200 con las sesiones de ese equipo y bloque cuya `eliminada` es `false`

#### Scenario: Falta el parámetro bloque_id
- **WHEN** un usuario hace `GET /catalogo/equipos/:id/sesiones` sin `bloque_id`
- **THEN** el sistema responde con un error de validación (400)

#### Scenario: Acceso a sesiones de un equipo fuera del scope
- **WHEN** un usuario sin acceso al equipo hace `GET /catalogo/equipos/:id/sesiones?bloque_id=<id>`
- **THEN** el sistema responde 403

### Requirement: Preferencia de idioma del usuario autenticado
`PATCH /auth/me/idioma` SHALL actualizar el campo `usuario.idioma` (`eu`/`es`) del usuario autenticado, resuelto por `auth0_id`, accesible a cualquier rol autenticado (`99-decisiones.md` § G-C5; `add-auth`, endpoint `/auth/me` existente; `design.md` § D7).

#### Scenario: Actualizar idioma a castellano
- **WHEN** un usuario autenticado hace `PATCH /auth/me/idioma` con `{ idioma: 'es' }`
- **THEN** el sistema actualiza `usuario.idioma` a `es` y responde 200

#### Scenario: Usuario autenticado sin fila local
- **WHEN** un usuario con JWT válido pero sin fila `usuario` correspondiente en BD hace `PATCH /auth/me/idioma`
- **THEN** el sistema responde 404

### Requirement: Shell de navegación persistente para roles no-admin
El frontend SHALL mostrar, tras el login, un shell persistente con topbar (nombre de la app, toggle de idioma EU/ES, badge de usuario con `nombre_visible` y `rol`, botón de logout) y navegación por categoría (Eskola/F7/F11) derivada de las categorías presentes en los equipos visibles para el usuario (`99-decisiones.md` § G-A9; `design.md` § D8).

#### Scenario: Navegación filtrada al scope del usuario
- **WHEN** un usuario cuyo scope solo incluye equipos de categoría F7 entra en la aplicación
- **THEN** el shell muestra únicamente la pestaña de categoría F7, sin Eskola ni F11

### Requirement: Tarjetas de equipo en el área principal
El frontend SHALL mostrar, dentro de la categoría seleccionada, una tarjeta por `equipo` visible con `nombre`, badge de `categoria`, punto de `color`, `icono` y número de miembros activos; al hacer click SHALL navegar al detalle del equipo (proposal).

#### Scenario: Click en tarjeta navega al detalle
- **WHEN** un usuario hace click en una tarjeta de equipo
- **THEN** la aplicación navega a `/equipos/:id` con ese equipo

### Requirement: Página de detalle de equipo con pestaña Plantilla
El frontend SHALL mostrar en `/equipos/:id` una cabecera (`nombre`, `categoria`, `color`, `icono`) y una barra de pestañas que en este change contiene únicamente "Plantilla"; esta pestaña SHALL listar los miembros activos agrupados por `grupo` (Con Ficha / Sin Ficha / Entrenadores) y ordenados por `orden` dentro de cada grupo, mostrando foto/avatar (iniciales como fallback), `nombre`, `alias?`, `rol_entrenador?` y `fecha_incorporacion`. Las pestañas de Asistencia y Minutaje NO SHALL añadirse en este change (proposal).

#### Scenario: Plantilla agrupada por grupo y ordenada
- **WHEN** un usuario con acceso al equipo abre la pestaña "Plantilla"
- **THEN** ve los miembros activos agrupados en Con Ficha / Sin Ficha / Entrenadores, cada grupo ordenado por `orden`

### Requirement: Control de acceso a la ruta de detalle de equipo
El frontend SHALL proteger `/equipos/:id` con el `ProtectedRoute` existente (`add-auth`, sin modificar) y un nuevo componente `ScopeGuard` que llama a `GET /catalogo/equipos/:id`; si la respuesta es 403, SHALL redirigir a una pantalla "Sin acceso / Sarbiderik ez" (proposal; `design.md` § D9).

#### Scenario: Usuario fuera de scope es redirigido
- **WHEN** un usuario autenticado sin acceso a un equipo navega a `/equipos/:id` de ese equipo
- **THEN** la aplicación muestra la pantalla "Sin acceso / Sarbiderik ez" en vez del detalle

### Requirement: Toggle de idioma persiste la preferencia del usuario
El toggle de idioma EU/ES del shell SHALL llamar a `PATCH /auth/me/idioma` para persistir la preferencia del usuario autenticado (`99-decisiones.md` § G-C5).

#### Scenario: Cambiar idioma desde el toggle
- **WHEN** un usuario pulsa el toggle de idioma y selecciona `es`
- **THEN** la aplicación llama a `PATCH /auth/me/idioma` con `{ idioma: 'es' }` y actualiza los literales de la UI a castellano
