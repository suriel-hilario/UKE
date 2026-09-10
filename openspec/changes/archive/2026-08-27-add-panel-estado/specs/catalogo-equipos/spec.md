## MODIFIED Requirements

### Requirement: Shell de navegación persistente para roles no-admin
El frontend SHALL mostrar, tras el login, un shell persistente con topbar (nombre de la app, toggle de idioma EU/ES, badge de usuario con `nombre_visible` y `rol`, botón de logout) y navegación por categoría (Eskola/F7/F11) derivada de las categorías presentes en los equipos visibles para el usuario (`99-decisiones.md` § G-A9; `design.md` § D8). Para usuarios con rol `director` o `coordinador`, el shell SHALL incluir además un enlace a `/panel` (`99-decisiones.md` § G-A6, G-B1; `add-panel-estado`).

#### Scenario: Navegación filtrada al scope del usuario
- **WHEN** un usuario cuyo scope solo incluye equipos de categoría F7 entra en la aplicación
- **THEN** el shell muestra únicamente la pestaña de categoría F7, sin Eskola ni F11

#### Scenario: Enlace al panel visible para director y coordinador
- **WHEN** un usuario con rol `director` o `coordinador` entra en la aplicación
- **THEN** el shell muestra un enlace a `/panel`

#### Scenario: Enlace al panel ausente para entrenador y admin
- **WHEN** un usuario con rol `entrenador` entra en la aplicación
- **THEN** el shell no muestra ningún enlace a `/panel`
