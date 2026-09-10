## 1. Plantillas bilingües

- [x] 1.1 Crear `apps/api/src/notifications/templates.ts` con funciones puras `buildAsistenciaDiaTemplate`, `buildMinutajeDiaTemplate`, `buildRecordatorioSemanalTemplate` que reciben `usuario` (para `idioma` y `nombre_visible`), equipo(s), fecha y link(s), y devuelven `{subject, text, html}` en eu/es según `usuario.idioma` (textos literales de `proposal.md` § Templates de email)
- [x] 1.2 Adaptar `NotificationsService.sendEquipoNotification` para recibir `tipo` + datos crudos en vez de `subject/text/html` ya compuestos, y componer la plantilla internamente tras cargar el `usuario`

## 2. Scheduling con TZ real

- [x] 2.1 Convertir `NotificationsScheduler` a `OnModuleInit`, eliminando los decoradores `@Cron`
- [x] 2.2 Registrar `dailyNotifications` (`0 0 20 * * *`) y `weeklyReminder` (`0 0 8 * * 1`) vía `SchedulerRegistry.addCronJob`, pasando `{ timezone: loadMailerConfig().tz }`
- [x] 2.3 Test: con `TZ=Europe/Madrid`, el cron job registrado en `SchedulerRegistry` tiene `timezone: 'Europe/Madrid'` (no `undefined`)

## 3. Job diario: asistencia_dia / minutaje_dia

- [x] 3.1 Mantener/verificar: buscar `sesion` con `fecha = hoy`, `eliminada = false`; `tipo='entrenamiento'` → `asistencia_dia`, `tipo='partido'` → `minutaje_dia`
- [x] 3.2 Para cada `usuario_equipo` con `usuario.rol = 'entrenador'` del equipo de la sesión, llamar a `sendEquipoNotification` con el `tipo` correspondiente usando las plantillas de la sección 1
- [x] 3.3 Test: sesión de tipo `entrenamiento` hoy → entrenadores del equipo reciben `asistencia_dia`
- [x] 3.4 Test: sesión de tipo `partido` hoy → entrenadores del equipo reciben `minutaje_dia`
- [x] 3.5 Test: entrenador con dos equipos con sesión hoy recibe dos emails independientes (uno por equipo)
- [x] 3.6 Test: usuario con `idioma: eu` recibe asunto/texto en euskera; usuario con `idioma: es` recibe asunto/texto en castellano

## 4. Job semanal: recordatorio_semanal con bloque activo

- [x] 4.1 En `handleWeekly`, cargar `usuario.equipos.equipo.{temporada, temporada.bloques}` para cada entrenador candidato
- [x] 4.2 Filtrar equipos elegibles del entrenador: `temporada.estado = 'abierta'` **y** existe `bloque` de esa temporada con `fecha_activacion <= hoy` (mismo criterio que `add-panel-estado` § D9)
- [x] 4.3 Si el entrenador no tiene ningún equipo elegible, no enviar nada
- [x] 4.4 Enviar un único email al entrenador listando sus equipos elegibles (plantilla de la sección 1); tras el envío exitoso, insertar una fila `notificacion_enviada` (`tipo='recordatorio_semanal'`, `fecha_envio=now()`) por **cada** equipo elegible
- [x] 4.5 Idempotencia: antes de enviar, comprobar si ya existe una fila `notificacion_enviada` de hoy para `(usuario_id, tipo='recordatorio_semanal')` en cualquiera de sus equipos elegibles; si existe, no reenviar
- [x] 4.6 Test: entrenador con equipo en temporada abierta pero sin bloque con `fecha_activacion <= hoy` → NO recibe el semanal, no se inserta `notificacion_enviada`
- [x] 4.7 Test: entrenador con equipo en temporada abierta y bloque activo → recibe el semanal con ese equipo listado
- [x] 4.8 Test: entrenador sin equipos en temporada abierta → no recibe nada
- [x] 4.9 Test: segunda ejecución del job el mismo día no reenvía (idempotencia)

## 5. Idempotencia y persistencia (asistencia_dia / minutaje_dia)

- [x] 5.1 Test: ya existe `notificacion_enviada` de hoy para `(usuario_id, equipo_id, tipo)` → no se reenvía ni se duplica la fila
- [x] 5.2 Test: si `mailer.sendMail` lanza una excepción, no se inserta `notificacion_enviada` (permite reintento posterior)

## 6. Desarrollo local

- [x] 6.1 Añadir servicio `mailpit` a `docker-compose.yml` (puertos SMTP 1025 y UI 8025), no requerido para producción
- [x] 6.2 Documentar en `NOTIFICATIONS.md`: variables de entorno requeridas, cómo levantar `mailpit`, y cómo probar los jobs manualmente en dev
- [x] 6.3 Añadir `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`, `APP_BASE_URL`, `TZ` de ejemplo a `.env.example`

## 7. Verificación final

- [x] 7.1 Ejecutar la suite completa de tests de `apps/api` en verde
- [x] 7.2 Probar manualmente en dev con `mailpit`: forzar ejecución de ambos jobs y confirmar en la UI de `mailpit` que los emails llegan en el idioma correcto, con deep links válidos, y que una segunda ejecución no duplica envíos
