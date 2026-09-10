# Change: add-notificaciones

## Resumen

Automatizar notificaciones por email para entrenadores: recordatorios diarios para registrar asistencia y minutaje, y un recordatorio semanal general. Fuente principal: UKE-Docs/inventario/99-decisiones.md § G-A5 (DECIDED).

## Alcance

- Backend (`apps/api`) únicamente. No hay cambios de UI en `apps/web` en este change. (99-decisiones.md § G-A5)
- Canal: email únicamente (no push) en v1. (99-decisiones.md § G-A5)
- No se modifica el esquema de BD: se usa `notificacion_enviada` para idempotencia (98-modelo-datos.md § notificacion_enviada).

## Requisitos (cada requisito cita su origen)

1. Canal y transporte: SMTP configurable por variables de entorno — `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`. Implementación vendor-agnostic (project.md § Infraestructura; 99-decisiones.md § G-A5).

2. Tipos de notificación (98-modelo-datos.md enum NotificacionTipo y 99-decisiones.md § G-A5):
   - `asistencia_dia`: enviado en días de entrenamiento a los entrenadores del `equipo` — "por favor, registre la asistencia de hoy". (99-decisiones.md § G-A5)
   - `minutaje_dia`: enviado en días de partido (sesion.tipo='partido') a los entrenadores — "por favor, registre el minutaje del partido de hoy". (99-decisiones.md § G-A5)
   - `recordatorio_semanal`: envío semanal general a todos los entrenadores con al menos un `equipo` en bloque activo. (99-decisiones.md § G-A5)

3. Scheduling: usar `@nestjs/schedule` (cron jobs) en backend; no usar colas externas. (99-decisiones.md § G-A5)
   - Job diario: se ejecuta a las 20:00 hora local; por cada `equipo` con sesión hoy (sesion.fecha = today, eliminada=false), enviar `asistencia_dia` o `minutaje_dia` a cada `usuario` vinculado al equipo con rol `entrenador` (tabla `usuario_equipo`). Evitar reenvíos usando `notificacion_enviada` como registro de idempotencia para (usuario_id, equipo_id, tipo, fecha). (99-decisiones.md § G-A5; 98-modelo-datos.md § notificacion_enviada)
   - Job semanal: se ejecuta Lunes 08:00 hora local; enviar `recordatorio_semanal` a todos los `usuario` con `rol = entrenador` y con al menos un `equipo` en un bloque/temporada activo; idem idempotencia con `notificacion_enviada` y fecha = día de envío. (99-decisiones.md § G-A5; 98-modelo-datos.md § notificacion_enviada)

4. Timezone y configuración: la TZ es configurable por `TZ` (default `Europe/Madrid`). `APP_BASE_URL` debe estar disponible para construir deep links a `/equipos/:id` (project.md § Infraestructura). 

5. Individualización: `asistencia_dia` y `minutaje_dia` se envían por equipo por entrenador; un entrenador con 2 equipos recibe 2 emails si ambos tienen sesión hoy. (99-decisiones.md § G-A5)

6. Contenido del email: multipart plain-text + HTML básico; literal en euskera o castellano según `usuario.idioma` (enum `Idioma` en 98-modelo-datos.md; política de idiomas en 99-decisiones.md § G-C5). Incluir nombre del `equipo`, fecha, y deep link a la pestaña correspondiente (`/equipos/:id?tab=asistencia` o `?tab=minutaje`). (99-decisiones.md § G-C5)

7. Persistencia de envío: tras envío exitoso insertar `notificacion_enviada` con `fecha_envio = now()` (98-modelo-datos.md § notificacion_enviada). No es necesario `updatedAt` adicional. (98-modelo-datos.md § notificacion_enviada)

8. Local development: aconsejar `mailpit` en `docker-compose` como SMTP de desarrollo (project.md § Infraestructura). No enviar emails reales en dev.

- "Bloque activo" para recordatorio_semanal: temporada con estado='abierta'
  con al menos un bloque cuya fecha_activacion <= hoy (mismo criterio que
  add-panel-estado § D9). Entrenadores sin ningún equipo en esas condiciones
  no reciben el recordatorio_semanal.
  Source: 99-decisiones.md § G-A5; add-panel-estado design.md § D9.

  - SMTP_FROM: valor libre, configurable por variable de entorno, sin exigencia
  de formato institucional en ninguna fuente. Ejemplo por defecto:
  "UKE App <noreply@uke.local>". Source: project.md § Infraestructura
  (vendor-agnostic, configurable por entorno).
## No incluido / Out of scope

- Preferencias de notificación por usuario (no está en fuentes).  
- Flujo de baja/unsubscribe.  
- Notificaciones push.  
- UI para historial de notificaciones.

## Diseño técnico (alto nivel)

- Implementar un módulo `notifications` en `apps/api` que:
  - Provea un `Mailer` que use SMTP (`nodemailer`) configurado por variables de entorno. (project.md § Infraestructura)
  - Provea servicios para: detectar sesiones del día, enumerar entrenadores por equipo, componer plantillas de email (EU/ES) y enviar emails.
  - Use `@nestjs/schedule` para registrar dos cron jobs (daily, weekly) con respectiva lógica de idempotencia.

- Idempotencia: lectura en `notificacion_enviada` usando condición de fecha (por día) y campos `(usuario_id, equipo_id, tipo)`. Insertar registro solo después de envío exitoso.

- Deep links: usar `APP_BASE_URL` + `/equipos/:id` (añadir query `tab=asistencia|minutaje` según tipo).

## Templates de email (estructura)

- Placeholders: `{usuario.nombre_visible}`, `{equipo.nombre}`, `{fecha}`, `{link}`.  
- Enviar ambos formatos: `text` y `html` simples; no usar motor de plantillas externo.

Ejemplos (subject + texto) — deberán mantenerse en euskera/castellano según `usuario.idioma` (99-decisiones.md § G-C5):

- asistencia_dia (EU):
  - Subject: "Mesedez, erregistratu gaurko asistentzia — {equipo.nombre} ({fecha})"
  - Text: "Kaixo {usuario.nombre_visible},\nMesedez, erregistratu gaurko asistentzia talderako: {equipo.nombre}. Ireki: {link}"

- asistencia_dia (ES):
  - Subject: "Por favor, registre la asistencia de hoy — {equipo.nombre} ({fecha})"
  - Text: "Hola {usuario.nombre_visible},\nPor favor, registre la asistencia de hoy para el equipo {equipo.nombre}. Abrir: {link}"

- minutaje_dia (similar, apuntando a la pestaña minutaje).

- recordatorio_semanal: asunto genérico y listado de equipos con enlaces.

## Migraciones / Esquema de datos

- No se requieren cambios en la BD. `notificacion_enviada`, `usuario`, `usuario_equipo`, `sesion`, `equipo` ya existen en el modelo (98-modelo-datos.md § 5 y otras secciones).

## Seguridad / Permisos

- Los cron jobs y env vars confidenciales (SMTP_USER/PASS) se almacenan como variables de entorno de la instancia. No exponer credenciales en logs. (project.md § Infraestructura)

## Tareas propuestas (implementación mínima aceptable)

1. Crear `openspec` artifact: esta `proposal.md` (actual).  
2. Implementar `notifications` module en `apps/api`: `Mailer`, `NotificationsService` y `NotificationsScheduler` usando `@nestjs/schedule`. (tests requeridos)  
3. Añadir validación de env vars y documentación (`NOTIFICATIONS.md`).  
4. Añadir tests unitarios e2e: mock `nodemailer` + fixtures de `sesion` y `usuario_equipo` para verificar envíos e inserciones en `notificacion_enviada`.  
5. Añadir `mailpit` service al `docker-compose.yml` para desarrollo (opcional, documentado).  

Cada tarea debe referenciar los requisitos trazables arriba.

## Criterios de aceptación

- Jobs programados ejecutan a las horas especificadas (configurable por `TZ`).  
- Para una sesión de hoy, cada entrenador recibe exactamente un email por equipo (siempre que no exista `notificacion_enviada` para el día y tipo).  
- Tras envío exitoso se inserta `notificacion_enviada` con `fecha_envio`.  
- Emails contienen deep links válidos construidos con `APP_BASE_URL`.

## Anexos / Fuentes

- UKE-Docs/inventario/99-decisiones.md § G-A5 (DECIDED) — notificaciones email, tipos, individualización, scheduling.  
- UKE-Docs/inventario/98-modelo-datos.md § notificacion_enviada, usuario — modelo de datos usado para idempotencia y `usuario.idioma`.  
- openspec/project.md § Infraestructura — SMTP vendor-agnostic, Docker/dev guidance.
