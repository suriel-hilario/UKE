## ADDED Requirements

### Requirement: Transporte SMTP configurable por entorno
El sistema SHALL enviar todos los emails de notificación a través de un transporte SMTP configurado exclusivamente por variables de entorno (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), sin dependencia de un proveedor concreto (`project.md` § Infraestructura; `99-decisiones.md` § G-A5). Si falta `SMTP_HOST`, `SMTP_PORT` o `SMTP_FROM`, el módulo SHALL fallar de forma explícita al arrancar.

#### Scenario: Arranque falla si falta configuración SMTP obligatoria
- **WHEN** la aplicación arranca sin `SMTP_HOST` definido en el entorno
- **THEN** el proceso lanza un error indicando qué variables de entorno faltan, antes de aceptar tráfico

#### Scenario: SMTP_FROM libre sin formato institucional exigido
- **WHEN** se configura `SMTP_FROM="UKE App <noreply@uke.local>"`
- **THEN** el sistema usa ese valor literal como remitente de todos los emails enviados

### Requirement: Contenido bilingüe según idioma del usuario
Cada email SHALL componerse en euskera o castellano según el campo `usuario.idioma` (`eu` o `es`) del destinatario, usando plantillas de texto plano definidas en el propio código (sin motor de plantillas externo), con envío multipart (`text` + `html`) (`98-modelo-datos.md` enum `Idioma`; `99-decisiones.md` § G-C5; `design.md` § D1).

#### Scenario: Usuario con idioma 'eu' recibe el email en euskera
- **WHEN** se envía una notificación `asistencia_dia` a un `usuario` con `idioma: eu`
- **THEN** el asunto y el cuerpo (`text` y `html`) del email usan el texto en euskera definido en `proposal.md` § Templates de email ("Mesedez, erregistratu gaurko asistentzia...")

#### Scenario: Usuario con idioma 'es' recibe el email en castellano
- **WHEN** se envía una notificación `asistencia_dia` a un `usuario` con `idioma: es`
- **THEN** el asunto y el cuerpo (`text` y `html`) del email usan el texto en castellano definido en `proposal.md` § Templates de email ("Por favor, registre la asistencia de hoy...")

#### Scenario: El email incluye equipo, fecha y deep link
- **WHEN** se compone cualquier email de tipo `asistencia_dia` o `minutaje_dia`
- **THEN** el cuerpo incluye el nombre del `equipo`, la `fecha` de la sesión, y un deep link a `APP_BASE_URL` + `/equipos/:id` con `?tab=asistencia` o `?tab=minutaje` según corresponda

### Requirement: Job diario de asistencia_dia y minutaje_dia respeta la zona horaria configurada
El sistema SHALL registrar un cron job diario que se ejecute a las 20:00 en la zona horaria indicada por la variable de entorno `TZ` (default `Europe/Madrid`), no en UTC ni en la hora del servidor si difiere de `TZ`. El registro del job SHALL aplicar el `timezone` de forma efectiva en tiempo de ejecución (vía `SchedulerRegistry.addCronJob`), no solo leerlo sin usarlo (`99-decisiones.md` § G-A5; `design.md` § D2).

#### Scenario: El job diario se ejecuta a las 20:00 en Europe/Madrid, no en UTC
- **WHEN** `TZ=Europe/Madrid` está configurado y es horario de verano (UTC+2)
- **THEN** el job diario se dispara a las 18:00 UTC (20:00 hora local de Madrid), y el `timezone` efectivamente aplicado al cron job registrado es `Europe/Madrid`, no `undefined` ni UTC

#### Scenario: Por cada sesión de hoy se notifica a cada entrenador del equipo
- **WHEN** existe una `sesion` con `fecha = hoy`, `eliminada = false` y `tipo = entrenamiento` para un `equipo`
- **THEN** cada `usuario` con rol `entrenador` vinculado a ese `equipo` vía `usuario_equipo` recibe un email `asistencia_dia` para ese equipo

#### Scenario: Sesión de partido dispara minutaje_dia en vez de asistencia_dia
- **WHEN** existe una `sesion` con `fecha = hoy`, `eliminada = false` y `tipo = partido` para un `equipo`
- **THEN** cada entrenador del equipo recibe un email `minutaje_dia` en vez de `asistencia_dia`

#### Scenario: Entrenador con dos equipos con sesión hoy recibe dos emails
- **WHEN** un `usuario` con rol `entrenador` está vinculado a dos `equipo` que ambos tienen sesión hoy
- **THEN** recibe un email independiente por cada equipo (uno con el deep link y nombre del primer equipo, otro con los del segundo)

### Requirement: Job semanal de recordatorio_semanal exige bloque activo, no solo temporada abierta
El sistema SHALL registrar un cron job semanal (lunes 08:00, zona horaria `TZ`) que envíe `recordatorio_semanal` únicamente a entrenadores con al menos un `equipo` que cumpla **ambas** condiciones: su `temporada.estado = 'abierta'` **y** existe al menos un `bloque` de esa temporada con `fecha_activacion <= hoy` (mismo criterio de "bloque activo" que `add-panel-estado` § D9). Un entrenador cuyos equipos están en temporada abierta pero sin ningún bloque aún activado SHALL NOT recibir el recordatorio semanal (`99-decisiones.md` § G-A5; addendum de `proposal.md` sobre bloque activo; `design.md` § D3).

#### Scenario: Entrenador con equipo en temporada abierta pero sin bloque activo no recibe el semanal
- **WHEN** un entrenador tiene un único `equipo` cuya `temporada.estado = 'abierta'`, pero ningún `bloque` de esa temporada tiene `fecha_activacion <= hoy` (todos los bloques activan en el futuro)
- **THEN** el job semanal NO envía `recordatorio_semanal` a ese entrenador, y no se inserta ninguna fila `notificacion_enviada` de tipo `recordatorio_semanal` para él

#### Scenario: Entrenador con equipo en temporada abierta y bloque ya activo recibe el semanal
- **WHEN** un entrenador tiene un `equipo` cuya `temporada.estado = 'abierta'` y con un `bloque` cuya `fecha_activacion <= hoy`
- **THEN** el job semanal envía `recordatorio_semanal` a ese entrenador, listando ese equipo con su deep link

#### Scenario: Entrenador sin ningún equipo elegible no recibe el semanal
- **WHEN** un entrenador no tiene ningún `equipo` en temporada abierta, o ninguno con bloque activo
- **THEN** no recibe `recordatorio_semanal`

### Requirement: Idempotencia por notificacion_enviada
El sistema SHALL evitar reenvíos de una misma notificación usando `notificacion_enviada` como registro de idempotencia por `(usuario_id, equipo_id, tipo, fecha del día)`, insertando la fila únicamente tras un envío exitoso (`98-modelo-datos.md` § notificacion_enviada; `99-decisiones.md` § G-A5).

#### Scenario: No se reenvía asistencia_dia si ya se envió hoy
- **WHEN** ya existe una fila `notificacion_enviada` para `(usuario_id, equipo_id, tipo='asistencia_dia')` con `fecha_envio` de hoy
- **THEN** el job diario no vuelve a enviar el email a ese entrenador para ese equipo, ni inserta una segunda fila

#### Scenario: Se inserta notificacion_enviada solo tras envío exitoso
- **WHEN** el envío SMTP de un email falla (excepción del transporte)
- **THEN** el sistema NO inserta una fila `notificacion_enviada` para ese intento, permitiendo que un reintento posterior lo reenvíe

### Requirement: Desarrollo local sin envío de emails reales
El entorno de desarrollo SHALL poder configurarse con `mailpit` como servidor SMTP local, documentado en `docker-compose.yml` y `NOTIFICATIONS.md`, de forma que ningún email de desarrollo llegue a una bandeja de entrada real (`project.md` § Infraestructura).

#### Scenario: SMTP apuntando a mailpit en desarrollo
- **WHEN** el entorno de desarrollo configura `SMTP_HOST=mailpit` y `SMTP_PORT=1025`
- **THEN** los emails enviados por los jobs quedan capturados en la interfaz de `mailpit` y no salen a ningún destinatario real
