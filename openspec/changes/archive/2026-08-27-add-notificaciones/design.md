## Context

`99-decisiones.md` § G-A5 (DECIDED) fija el diseño de notificaciones por email: dos jobs cron (`asistencia_dia`/`minutaje_dia` diario a las 20:00, `recordatorio_semanal` los lunes a las 08:00), idempotencia vía `notificacion_enviada`, y contenido bilingüe (eu/es) según `usuario.idioma`. `98-modelo-datos.md` fija el modelo: `notificacion_enviada` tiene `usuario_id`, `equipo_id` **no-nulo** y `tipo: NotificacionTipo`.

Ya existe en el repo un módulo `apps/api/src/notifications/` (no versionado hasta ahora, registrado en `AppModule`) con una primera pasada de `MailerService`, `NotificationsService` y `NotificationsScheduler`. Se revisó ese código contra los requisitos de `proposal.md` y presenta tres desviaciones que este diseño resuelve antes de generar `tasks.md`:

1. Los emails están hardcodeados en inglés — el requisito 6 exige eu/es según `usuario.idioma`.
2. Los `@Cron(...)` usan `timeZone: undefined` y una expresión fija; el `tz` cargado en el constructor (`loadMailerConfig().tz`) nunca llega al decorador, porque los decoradores de Nest se evalúan en tiempo de import, no de instancia — el requisito 4 (`TZ` configurable) no se cumple realmente hoy.
3. `handleWeekly` filtra solo por `temporada.estado === 'abierta'`, sin exigir `bloque.fecha_activacion <= hoy` — el addendum de `proposal.md` ("Bloque activo... mismo criterio que add-panel-estado § D9") no está implementado, y además usa `coach.equipos[0]?.equipo_id` como relleno arbitrario para el `equipo_id` no-nulo de `notificacion_enviada`, lo que hace frágil la idempotencia (si ese primer equipo cambia de orden en la query, se pueden reenviar recordatorios).

Este diseño ajusta la implementación existente en vez de sustituirla desde cero.

## Goals / Non-Goals

**Goals:**
- Cumplir literalmente los 8 requisitos numerados de `proposal.md`: canal SMTP configurable, 3 tipos de notificación, scheduling con `@nestjs/schedule` respetando `TZ`, individualización por equipo, contenido bilingüe con deep link, persistencia idempotente en `notificacion_enviada`, y `mailpit` documentado para dev.
- Corregir las 3 desviaciones detectadas en el código existente (idioma, TZ real, criterio de bloque activo) sin romper la estructura de módulos ya presente.

**Non-Goals:**
- Preferencias de notificación por usuario, unsubscribe, push, UI de historial (ya excluidos en `proposal.md`).
- Cambios de esquema Prisma — `notificacion_enviada` ya tiene todos los campos necesarios.
- Reescribir `MailerService`/módulo desde cero: se extiende el código existente.

## Decisions

**D1. Plantillas bilingües como funciones puras `buildAsistenciaDiaTemplate(usuario, equipo, fecha, link)` etc. en un `templates.ts` nuevo, seleccionando eu/es por `usuario.idioma` en tiempo de envío.**
Los textos EU/ES ya están literalmente definidos en `proposal.md` § Templates de email. Se implementan como funciones puras (sin motor de plantillas externo, tal como pide requisito 6) que reciben el `usuario` completo y devuelven `{subject, text, html}`. `NotificationsService.sendEquipoNotification` deja de recibir `subject/text/html` ya compuestos desde el scheduler; en su lugar recibe `tipo` + datos crudos (`equipo`, `fecha`, `link`) y compone la plantilla internamente tras cargar el `usuario` (ya lo hace hoy para obtener el email). Esto centraliza la lógica de idioma en un solo sitio en vez de duplicarla en cada llamada del scheduler.

**D2. TZ real: sustituir los `@Cron(...)` estáticos por registro dinámico de cron jobs vía `SchedulerRegistry.addCronJob` en `onModuleInit`, usando `timeZone: loadMailerConfig().tz`.**
`@Cron` es un decorador evaluado en tiempo de import de la clase — no puede leer `process.env.TZ` de forma perezosa ni pasar el `tz` cargado en el constructor. `node-cron` (usado internamente por `@nestjs/schedule`) sí soporta `timezone` como opción de instancia cuando el job se registra programáticamente. `NotificationsScheduler` pasa a implementar `OnModuleInit` y registrar `dailyNotifications` (`0 0 20 * * *`) y `weeklyReminder` (`0 0 8 * * 1`) con `{ timezone: this.tz }` vía `SchedulerRegistry`, en vez de decoradores. Alternativa descartada: mantener `@Cron` y ajustar solo la hora manualmente sumando/restando el offset de `TZ` — se descarta porque no maneja horario de verano correctamente y `node-cron`/`SchedulerRegistry` ya resuelve esto de forma nativa.

**D3. Criterio de "bloque activo" para `recordatorio_semanal`: reutilizar la misma condición que `add-panel-estado` § D9 (`temporada.estado='abierta'` AND existe `bloque` con `fecha_activacion <= hoy`), evaluada en memoria sobre los `equipo.temporada` y `bloque` ya cargados — sin nuevo servicio de acceso compartido.**
`add-panel-estado` ya estableció este criterio exacto para "bloque activo" citando la misma fuente (`99-decisiones.md` § G-A5). Se evita crear una dependencia cruzada entre módulos (`panel` y `notifications`) para una condición de una sola línea; en su lugar `NotificationsScheduler.handleWeekly` carga `usuario.equipos.equipo.{temporada, temporada.bloques}` y filtra en memoria — volumen esperado (un club, decenas de equipos) hace innecesaria una query más elaborada.

**D4. `recordatorio_semanal`: un único email por entrenador (listando todos sus equipos elegibles), pero **una fila `notificacion_enviada` por cada `equipo_id` elegible del entrenador**, todas con el mismo `tipo='recordatorio_semanal'` y `fecha_envio=now()` tras el envío exitoso del único email.**
`notificacion_enviada.equipo_id` es no-nulo por esquema, y `recordatorio_semanal` no es por-equipo conceptualmente — pero como el email es uno solo por entrenador, hace falta decidir qué idempotencia usar. Escribir una fila por equipo elegible (en vez de una fila arbitraria con `coach.equipos[0]`) hace que: (a) la comprobación de "¿ya se envió hoy?" sea estable independientemente del orden de la query, y (b) si el conjunto de equipos elegibles de un entrenador cambia entre semanas (p. ej. se le asigna un equipo nuevo a mitad de semana), la fila para ese equipo nuevo simplemente no existe todavía y no bloquea nada. La comprobación de "ya enviado" se hace sobre **cualquiera** de sus equipos elegibles (si existe una fila de hoy para alguno, se asume que el email semanal ya salió) para evitar reenvíos parciales.

**D5. `NotificationsService.sendEquipoNotification` conserva su firma de idempotencia actual (`usuario_id + equipo_id + tipo + fecha del día`) sin cambios — D1 y D4 se implementan como llamadas repetidas a este método existente, no como un método nuevo.**
El método ya hace exactamente lo que requiere requisito 7 (persistir tras envío exitoso) y requisito 3 (evitar reenvíos por `(usuario_id, equipo_id, tipo, fecha)`). Para `recordatorio_semanal`, el *contenido* del email es el mismo para todas las llamadas de un mismo entrenador en la misma ejecución (D4), así que en la práctica solo la primera llamada dispara `mailer.sendMail`; hace falta un ajuste menor: separar "enviar mail" (una vez) de "registrar fila de idempotencia" (N veces) — ver tarea correspondiente en `tasks.md`.

**D6. `mailpit` se añade como servicio opcional en `docker-compose.yml` (perfil `dev`, no en `Dockerfile.api`/producción), con `SMTP_HOST=mailpit`, `SMTP_PORT=1025` documentados en `.env.example` y `NOTIFICATIONS.md`.**
Requisito 8 pide "aconsejar mailpit... no enviar emails reales en dev", no lo exige como parte del stack obligatorio — se añade como servicio adicional en `docker-compose.yml` para que quien lo quiera lo levante, documentado en `NOTIFICATIONS.md` (tarea 3 de `proposal.md`).

## Risks / Trade-offs

- **[Riesgo] D2 registra los cron jobs dinámicamente en `onModuleInit`; si `loadMailerConfig()` lanza (env vars SMTP faltantes) el módulo entero falla al arrancar** → Aceptado: es el comportamiento ya existente hoy en `MailerService`/`mailer.config.ts` (`loadMailerConfig` ya lanza si faltan `SMTP_HOST`/`SMTP_PORT`/`SMTP_FROM`/`APP_BASE_URL`); no se introduce un fallo nuevo, solo se mueve el punto donde se evalúa.
- **[Riesgo] D4 puede insertar varias filas de `notificacion_enviada` con `fecha_envio` idénticos para un mismo entrenador (una por equipo elegible)** → Aceptado: no rompe ninguna unicidad del esquema (no hay `@@unique` en `notificacion_enviada`) y simplifica la idempotencia; el volumen es proporcional al número de equipos del entrenador (típicamente 1-2).
- **[Trade-off] D3 evalúa "bloque activo" en memoria en vez de vía query SQL** → Aceptado dado el volumen (un club); si crece, se puede migrar a una query dedicada sin cambiar la interfaz del scheduler.

## Migration Plan

1. Ajustar `apps/api/src/notifications/notifications.scheduler.ts`: pasar de `@Cron` a `SchedulerRegistry.addCronJob` con `timezone` (D2), aplicar criterio de bloque activo (D3) e idempotencia por-equipo (D4) en `handleWeekly`.
2. Añadir `apps/api/src/notifications/templates.ts` con las funciones de plantilla eu/es (D1) y adaptar `NotificationsService.sendEquipoNotification` para componer subject/text/html internamente a partir de `tipo` + datos crudos.
3. Añadir `mailpit` a `docker-compose.yml` y documentar en `NOTIFICATIONS.md` (D6).
4. Tests unitarios: `NotificationsService` (idempotencia, selección de idioma), `NotificationsScheduler` (selección de sesiones del día, criterio de bloque activo, no-reenvío).

Sin migración de base de datos. Rollback: revertir el deploy de `apps/api`; no hay estado persistente incompatible entre versiones (las filas de `notificacion_enviada` ya escritas siguen siendo válidas bajo el esquema de idempotencia anterior).

## Open Questions

- Ninguna abierta: los tres puntos de desviación detectados en el código existente (idioma, TZ real, criterio de bloque activo) quedan resueltos por D1–D4 arriba, con fuente directa en `proposal.md` y `add-panel-estado` § D9.
