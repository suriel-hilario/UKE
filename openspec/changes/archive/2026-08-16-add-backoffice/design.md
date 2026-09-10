## Context

`add-auth` ya deja un guard global de JWT y `@Roles()` funcionando; `add-data-model` deja los 13 modelos Prisma migrados. Este change es el primer consumidor real de ambos: añade el único punto de la app donde se puede escribir en `usuario`, `temporada`, `bloque`, `equipo`, `festivo` y `miembro_equipo`, y el único lugar que habla con la Auth0 Management API. Ningún módulo deportivo puede empezar antes de que exista esto, porque todos dependen del catálogo único (`99-decisiones.md` § G-C1).

No hay lógica de negocio compleja que diseñar (cómputos de %, semáforos): es CRUD de catálogo más un flujo de import con preview. El trabajo de diseño real está en (a) cómo aislar la llamada a Auth0 Management API de forma segura y testeable, y (b) cerrar las tres Open Questions del proposal sin inventar comportamiento no pedido.

## Goals / Non-Goals

**Goals:**
- Un módulo `admin` en `apps/api` con endpoints de usuarios y catálogo, todos protegidos por `@Roles('admin')`.
- Un cliente de Auth0 Management API aislado (un solo punto de contacto con Auth0 para altas/bajas/edición de usuarios).
- Import de Excel con preview obligatorio antes de persistir (G-A2).
- Frontend `/admin` funcional para las tres áreas (usuarios, temporadas, equipos) con literales EU/ES.

**Non-Goals:**
- Ningún módulo deportivo (asistencia, minutaje) ni sus cómputos derivados.
- Ninguna lectura de catálogo para roles no-admin (es `add-catalogo-equipos`).
- Ninguna notificación por email más allá del reset de contraseña estándar de Auth0.
- Ninguna librería de UI/design-system nueva: se mantiene el mismo enfoque minimalista que ya tiene `apps/web` (sin dependencias de componentes añadidas en `add-auth`).

## Decisions

**D1. Cliente Auth0 Management API con el SDK oficial `auth0` (Node), no llamadas REST manuales.**
A diferencia de `add-auth` (donde el SDK completo de Auth0 era excesivo solo para validar JWT), aquí sí se necesita hablar con múltiples endpoints de Management API (crear usuario, actualizar, bloquear, disparar reset de contraseña) con manejo de token M2M, reintentos y tipado — exactamente el caso de uso para el que existe el SDK. Se aísla en un único `ManagementService` (módulo `admin/auth0-management`), de forma que ningún otro punto del código llame a Auth0 directamente.

**D2. Token M2M cacheado en memoria con expiración, no pedido en cada request.**
El SDK de Auth0 gestiona el ciclo de vida del token de client credentials internamente; se configura una sola instancia de `ManagementClient` a nivel de módulo (no por-request) para reutilizar la caché de token del propio SDK.

**D3. `PATCH /admin/users/:id` con `equipo_ids` hace reemplazo completo del conjunto de vínculos `usuario_equipo` (resuelve Open Question 1 del proposal).**
Se trata como un `PUT` semántico sobre la relación N:M: el array recibido es el estado final deseado. Alternativa descartada (añadir sin quitar) porque haría imposible desvincular un equipo desde el frontend sin un endpoint adicional no pedido en el proposal. El frontend siempre debe enviar el conjunto completo actual + cambios, no un delta.

**D4. Columnas del Excel de import: exactamente `nombre` (obligatoria), `alias` (opcional), `fecha_incorporacion` (obligatoria, ISO o DD/MM/YYYY) — resuelve Open Question 2.**
Es el conjunto mínimo ya descrito en el proposal y el único que `99-decisiones.md` § G-A2 exige ("vista previa y validación"); no se añaden columnas no solicitadas (foto, alias de equipo, etc.) — eso pertenece al catálogo de personas más amplio, fuera de alcance aquí.

**D5. Preview de import: `{ valid: PersonaValida[], errors: { fila: number, columna?: string, mensaje: string }[] }` — resuelve Open Question 3.**
Formato mínimo que permite al frontend pintar una tabla con estado por fila sin inventar una taxonomía de códigos de error no pedida.

**D6. `DELETE /admin/users/:id` es bloqueo en Auth0 (`blocked: true`), no borrado de la fila local — y esto es también una necesidad técnica, no solo de política.**
`add-data-model` dejó las FKs con `onDelete` por defecto (`RESTRICT`, decisión D3 de ese change): borrar un `usuario` referenciado por `usuario_equipo` o `notificacion_enviada` fallaría de todos modos. La decisión de negocio (preservar histórico, `99-decisiones.md` § G-A7) y la restricción técnica apuntan al mismo resultado: soft-disable.

**D7. Import de Excel vía `multer` en memoria (`FileInterceptor`, `MemoryStorage`) + `exceljs`, sin escritura a disco.**
`@nestjs/platform-express` ya trae `multer`; se procesa el buffer directamente. Evita gestión de archivos temporales y limpieza.

**D8. `POST /admin/users` — compensación ante fallo de BD tras crear en Auth0.**
Si la inserción de `usuario` en BD falla después de que Auth0 haya creado la cuenta,
el `ManagementService` intenta borrar el usuario recién creado en Auth0 (delete por auth0_id)
como operación de compensación best-effort. Si la compensación también falla, se loguea
el `auth0_id` huérfano a nivel ERROR para intervención manual. No se usa saga distribuida
(fuera de alcance); se acepta la ventana de inconsistencia residual dado el volumen del club.

## Risks / Trade-offs

- **[Riesgo] Reemplazo completo de `equipo_ids` (D3) borra vínculos si el frontend envía un array incompleto por error** → Mitigación: contrato de API documentado explícitamente; tests que cubren el caso de reemplazo parcial accidental.
- **[Riesgo] Rate limits de la Management API de Auth0 en imports/altas masivas** → Fuera de alcance mitigar aquí (no hay import masivo de usuarios, solo de jugadores vía Prisma directo, no vía Auth0); el único uso de Management API es por-usuario individual desde el formulario admin.
- **[Trade-off] Sin concurrencia optimista en ediciones de catálogo (dos admins editando la misma `temporada` a la vez)** → Aceptado: ninguna fuente lo exige; el `admin` es un rol único por diseño de la matriz de permisos (G-B1), el caso de dos admins simultáneos es improbable en este club.
- **[Riesgo] Cerrar una temporada (`estado = cerrada`) es irreversible por diseño (G-A7)** → Mitigación: confirmación explícita en el frontend con advertencia; sin endpoint de reapertura (no lo pide ninguna fuente).

## Migration Plan

No hay migración de BD (el schema ya existe desde `add-data-model`). Pasos de implementación:
1. Variables de entorno nuevas: `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`, `AUTH0_M2M_AUDIENCE`, validadas fail-fast igual que `loadAuthConfig` de `add-auth`.
2. `ManagementService` + módulo `admin/auth0-management`, sin exponerlo fuera del módulo `admin`.
3. Endpoints de usuarios, luego catálogo, luego import — cada uno protegido por `@Roles('admin')` desde el primer commit (el guard global ya rechaza todo por defecto).
4. Frontend `/admin` consumiendo esos endpoints, reutilizando `ProtectedRoute`/`RoleGuard`/`useAuth()` de `add-auth` sin modificarlos.

Rollback: al no haber migración de datos, revertir el deploy de `apps/api`/`apps/web` es suficiente.

## Open Questions

Ninguna pendiente: las tres del proposal se resuelven en D3, D4 y D5.
