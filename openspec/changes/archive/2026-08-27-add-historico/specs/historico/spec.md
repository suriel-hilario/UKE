## ADDED Requirements

### Requirement: Listado paginado de temporadas cerradas
`GET /admin/historico?page=&limit=` SHALL devolver una página de `temporada` con `estado: 'cerrada'`, cada una con `id`, `nombre`, `fecha_inicio`, `fecha_fin`, `estado` y estadísticas resumen (`total_equipos`, `total_sesiones`, `total_jornadas`), accesible a `admin` y `director` (`99-decisiones.md` § G-A7: "Accesible para admin y director"; `design.md` § D1, D2).

#### Scenario: Listado de temporadas cerradas con estadísticas
- **WHEN** un usuario con rol `admin` o `director` hace `GET /admin/historico?page=1&limit=20`
- **THEN** el sistema responde 200 con las temporadas de `estado: 'cerrada'` de esa página, cada una con `total_equipos`, `total_sesiones` y `total_jornadas`

#### Scenario: Temporadas abiertas excluidas del histórico
- **WHEN** existe una `temporada` con `estado: 'abierta'`
- **THEN** esa temporada no aparece en la respuesta de `GET /admin/historico`

### Requirement: Acceso a histórico restringido a admin y director
`GET /admin/historico` SHALL responder 403 a cualquier usuario cuyo rol no sea `admin` ni `director`, incluyendo explícitamente `coordinador` y `entrenador` (`99-decisiones.md` § G-A7; `design.md` § D1 — controller separado del resto de `AdminModule`, que sigue siendo admin-only).

#### Scenario: Coordinador sin acceso al histórico
- **WHEN** un usuario con rol `coordinador` hace `GET /admin/historico`
- **THEN** el sistema responde 403

#### Scenario: Entrenador sin acceso al histórico
- **WHEN** un usuario con rol `entrenador` hace `GET /admin/historico`
- **THEN** el sistema responde 403

#### Scenario: Director con acceso al histórico pero no al resto de /admin
- **WHEN** un usuario con rol `director` hace `GET /admin/historico` y, por separado, `GET /admin/users`
- **THEN** el primer request responde 200 y el segundo responde 403

### Requirement: Página /admin/historico con lista de temporadas cerradas
El frontend SHALL mostrar en `/admin/historico`, accesible desde una entrada "Histórico" en el sidebar de `/admin`, la lista paginada de temporadas cerradas (`nombre`, `fecha_inicio`, `fecha_fin`, estadísticas resumen); al hacer click en una temporada SHALL navegar a sus datos en modo lectura (`99-decisiones.md` § G-A7: "accesible desde administración").

#### Scenario: Navegar a los datos de una temporada cerrada
- **WHEN** un usuario hace click en una temporada de la lista de `/admin/historico`
- **THEN** la aplicación navega a la vista de equipos de esa temporada en modo lectura

#### Scenario: Entrada Histórico visible para admin y director
- **WHEN** un usuario con rol `admin` o `director` abre `/admin`
- **THEN** el sidebar de administración muestra una entrada "Histórico"
