# Notificaciones

Módulo `src/notifications/`: emails automáticos a entrenadores para recordar el registro de asistencia y minutaje, más un recordatorio semanal general.

## Variables de entorno

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `SMTP_HOST` | Sí | Host del servidor SMTP |
| `SMTP_PORT` | Sí | Puerto SMTP (465 activa TLS implícito) |
| `SMTP_USER` | No | Usuario SMTP, si el servidor lo requiere |
| `SMTP_PASS` | No | Contraseña SMTP |
| `SMTP_FROM` | Sí | Remitente (formato libre, p. ej. `UKE App <noreply@uke.local>`) |
| `APP_BASE_URL` | Sí | Base para los deep links a `/equipos/:id` incluidos en los emails |
| `TZ` | No (default `Europe/Madrid`) | Zona horaria usada para programar los cron jobs |

Si falta `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` o `APP_BASE_URL`, la aplicación falla al arrancar con un error explícito listando las variables ausentes.

## Jobs programados

- **Diario, 20:00 (`TZ`)**: por cada `sesion` de hoy no eliminada, envía `asistencia_dia` (sesión de entrenamiento) o `minutaje_dia` (sesión de partido) a cada entrenador del equipo.
- **Semanal, lunes 08:00 (`TZ`)**: envía `recordatorio_semanal` a cada entrenador con al menos un equipo en temporada `abierta` que además tenga un bloque con `fecha_activacion <= hoy` ("bloque activo").

Ambos jobs se registran dinámicamente en `NotificationsScheduler.onModuleInit` vía `SchedulerRegistry.addCronJob`, aplicando `TZ` como zona horaria real del cron (no solo como valor leído y descartado).

## Idempotencia

Toda notificación enviada se registra en `notificacion_enviada` (`usuario_id`, `equipo_id`, `tipo`, `fecha_envio`) inmediatamente después de un envío SMTP exitoso. Antes de enviar, se comprueba si ya existe una fila de hoy para esa combinación; si existe, no se reenvía. Si el envío SMTP falla, no se inserta la fila, permitiendo que una ejecución posterior reintente.

## Desarrollo local con Mailpit

`docker-compose.yml` incluye un servicio `mailpit` (SMTP en `1025`, UI web en `8025`). El servicio `api` en Docker Compose ya apunta por defecto a `SMTP_HOST=mailpit`, `SMTP_PORT=1025`.

```bash
docker compose up -d mailpit
open http://localhost:8025   # UI de Mailpit
```

Ningún email de desarrollo sale a un destinatario real: todos quedan capturados en Mailpit.

### Forzar la ejecución manual de un job en dev

Los jobs no exponen un endpoint HTTP. Para probarlos manualmente en desarrollo, usar la consola de Nest (`nest start --watch` con un breakpoint, o un script ad-hoc) para instanciar `NotificationsScheduler` desde el `AppModule` y llamar directamente a `handleDaily()` / `handleWeekly()`.
