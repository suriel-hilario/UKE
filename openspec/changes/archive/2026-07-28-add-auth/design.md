## Context

`add-infrastructure` dejó el monorepo (`apps/web`, `apps/api`, `packages/shared`) y `docker-compose` funcionando sin ninguna capa de autenticación: hoy cualquier request a `apps/api` se sirve sin comprobar identidad. Este change introduce Auth0 como único proveedor de identidad (`project.md` § Autenticación; `99-decisiones.md` § G-B2) y el enforcement de roles a nivel de guard, para que los changes siguientes (`add-data-model`, `add-backoffice`, módulos deportivos) puedan asumir que todo endpoint no público ya está protegido.

No existe todavía modelo de datos propio (Prisma llega en `add-data-model`), por lo que el backend no puede resolver nada que no esté en el JWT. Los roles (`admin`, `director`, `coordinador`, `entrenador`) se modelan como roles de Auth0 inyectados en el token vía una Auth0 Action (decisión ya tomada en `99-decisiones.md` § D); este change consume ese claim, no lo produce — la configuración de la Action en el tenant de Auth0 es un prerrequisito operativo fuera del código de este repo.

## Goals / Non-Goals

**Goals:**
- Todo request a `apps/api` sin JWT válido recibe 401, salvo `/health` y `/auth/me` (marcados `@Public()`).
- Todo request a un endpoint marcado `@Roles(...)` cuyo JWT no tenga un rol permitido recibe 403.
- `GET /auth/me` devuelve `{ id, email, rol }` derivados exclusivamente del JWT, sin tocar BD.
- El frontend fuerza login universal de Auth0 para cualquier ruta protegida y oculta/bloquea UI según rol.
- Todo el mecanismo es configurable por entorno (dominio y audience de Auth0), sin credenciales hardcodeadas.

**Non-Goals:**
- No se implementa Auth0 Management API (alta/edición de usuarios) — es `add-backoffice`.
- No se resuelve `equipos` del usuario (requiere BD/Prisma) — es `add-backoffice`.
- No hay pantallas de negocio; la pantalla post-login es solo un smoke test del flujo.
- No se define aquí la configuración de la Auth0 Action que inyecta el claim de rol (vive en el tenant de Auth0, no en este repo).

## Decisions

**D1. Validación de JWT en backend: `passport-jwt` + `jwks-rsa`, no una librería "todo en uno" de Auth0.**
NestJS ya usa `@nestjs/passport` como patrón estándar de guards. `jwks-rsa` resuelve las claves públicas RS256 desde el JWKS endpoint de Auth0 (`https://$AUTH0_DOMAIN/.well-known/jwks.json`) con cache y rotación automática, sin necesitar el SDK completo de Auth0 en el backend (que está orientado a Management API, fuera de alcance aquí). Alternativa descartada: `auth0`/`express-openid-connect` (SDK completo) — trae superficie innecesaria (sesiones, Management API) para un backend puramente API REST sin sesión de servidor.

**D2. Guard global vía `APP_GUARD` + decorador `@Public()`, no guard por-ruta.**
Aplicar el guard de autenticación como proveedor global (`APP_GUARD`) hace que "autenticado por defecto" sea la postura segura: un desarrollador que olvida proteger un endpoint nuevo no introduce un agujero. `@Public()` (leído vía `Reflector`) es la excepción explícita, no al revés. Alternativa descartada: decorar cada controller/endpoint con `@UseGuards(AuthGuard)` — un olvido deja el endpoint abierto por defecto, que es el riesgo que `project.md` busca evitar.

**D3. Rol como claim custom namespaced en el JWT, resuelto vía `AUTH0_ROLE_CLAIM`.**
Auth0 requiere que los custom claims usen un namespace URI (`https://uke.local/rol`, decidido en el proposal) para evitar colisión con claims estándar de OIDC. El nombre del claim es una variable de entorno (`AUTH0_ROLE_CLAIM`) en vez de una constante hardcodeada, porque el valor real depende de cómo se configure la Auth0 Action en cada entorno (dev/staging/prod pueden usar tenants distintos). El guard de rol lee `payload[AUTH0_ROLE_CLAIM]` y compara contra los roles declarados en `@Roles(...)`.

**D4. `@Roles()` acepta un único rol por request, sin jerarquía implícita.**
La matriz de permisos (`99-decisiones.md` § G-B1) define 4 roles sin relación de herencia (p.ej. `admin` no hereda automáticamente permisos de `director`). El guard compara el rol del JWT contra la lista exacta de `@Roles(...)` del endpoint, sin lógica de "rol superior implica acceso". Endpoints que deban ser accesibles por varios roles listan todos explícitamente: `@Roles('admin', 'director')`.

**D5. Frontend: `@auth0/auth0-react`, `ProtectedRoute` y `RoleGuard` como componentes separados.**
`@auth0/auth0-react` es el SDK oficial para SPA y ya resuelve `Auth0Provider`, `useAuth0` (base de `useAuth()`), y el redirect a login universal. Se separan dos responsabilidades en dos componentes porque son fallos distintos: `ProtectedRoute` responde "¿hay sesión?" (redirige si no), `RoleGuard` responde "¿tiene permiso?" (bloquea con pantalla "Sin permiso" sin redirigir, porque el usuario sí está autenticado — redirigirlo al login de nuevo sería un bucle sin sentido).

**D6. `equipos` se omite de `/auth/me` y de `useAuth()` en este change (no un array vacío falso).**
Devolver `equipos: []` sería indistinguible de "usuario sin equipos asignados" una vez exista la BD. Se omite el campo del todo hasta `add-backoffice`, documentado como decisión explícita del proposal, para no crear un contrato de API ambiguo que haya que romper después.

## Risks / Trade-offs

- **[Riesgo] JWKS endpoint de Auth0 no accesible desde el contenedor `api` (red/DNS en local o CI)** → Mitigación: `jwks-rsa` cachea claves; fallo de red se traduce en 401 claro en vez de crash; documentar en `.env.example` que `AUTH0_DOMAIN` debe ser resoluble desde dentro del contenedor Docker.
- **[Riesgo] Guard global mal aplicado bloquea `/health`, rompiendo el healthcheck de `docker-compose` (`postgres` depende de él indirectamente vía orquestación)** → Mitigación: `/health` es el primer endpoint marcado `@Public()` y se cubre con test e2e específico antes de cerrar el change.
- **[Riesgo] Claim de rol mal configurado en la Auth0 Action (nombre de namespace distinto entre entornos)** → Mitigación: el nombre del claim vive en `AUTH0_ROLE_CLAIM` (env var), no hardcodeado; si el claim no existe en el token, el guard de rol trata el rol como ausente y responde 403, nunca asume un rol por defecto.
- **[Trade-off] Sin BD propia todavía, `/auth/me` es un espejo casi literal del JWT** → Aceptado: es exactamente el alcance decidido (ver D6); evita construir infraestructura de datos prematura solo para este endpoint.

## Migration Plan

No aplica migración de datos (no hay BD en este change). Pasos de despliegue:
1. Configurar la Auth0 Action que inyecta `https://uke.local/rol` en el tenant correspondiente (prerrequisito operativo, fuera del repo).
2. Añadir `AUTH0_DOMAIN`, `AUTH0_AUDIENCE`, `AUTH0_ROLE_CLAIM` a la config de `api` y `VITE_AUTH0_DOMAIN`, `VITE_AUTH0_CLIENT_ID`, `VITE_AUTH0_AUDIENCE` a la de `web` en `docker-compose.yml`/`.env`.
3. Desplegar backend con el guard global activo — a partir de este punto todo endpoint no marcado `@Public()` exige JWT.
4. Desplegar frontend con `Auth0Provider` y `ProtectedRoute` envolviendo la pantalla post-login.
5. Verificación manual: login completo, `/auth/me` responde 200 con rol correcto, acceso denegado (401/403) sin token o con rol incorrecto.

Rollback: revertir el deploy de ambos servicios a la imagen previa (sin guard global) — no hay estado persistente que limpiar.

## Open Questions

Ninguna pendiente: las dos abiertas en el proposal (namespace del claim de rol, alcance de `equipos`) se resolvieron ahí (`AUTH0_ROLE_CLAIM=https://uke.local/rol`; `equipos` diferido a `add-backoffice`).
