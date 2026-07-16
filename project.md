# UKE App — Contexto de proyecto (OpenSpec)

## Propósito
Aplicación de gestión para Urretxindorra Kirol Elkartea: asistencia a entrenamientos (jugadores y entrenadores), minutaje en partidos, backoffice de administración, panel de supervisión y notificaciones. Una única aplicación con navegación Categoría (Eskola / F7 / F11) → Equipo → Módulo (99-decisiones.md § G-A9).

## Fuentes de verdad (por orden de precedencia)
1. `UKE-Docs/inventario/99-decisiones.md` — decisiones cerradas; ante conflicto, manda.
2. `UKE-Docs/inventario/01..04-*.md` — inventarios funcionales VALIDADOS de los mockups.
3. `UKE-Docs/inventario/98-modelo-datos.md` — modelo de datos (input de add-data-model).
4. `UKE-Docs/inventario/00-especificaciones-cliente.md` — requisitos del cliente.

**Reglas anti-alucinación (obligatorias en todo propose):**
- Especificar ÚNICAMENTE lo trazable a estas fuentes. Cada requirement cita su origen: `(inventario/NN.md § sección)` o `(99-decisiones.md § G-XX)`.
- Si falta información: sección `## Open Questions` en la propuesta. NUNCA inventar.
- Requisito sin origen trazable = se elimina en revisión.

## Stack técnico (NO negociable, no proponer alternativas)
- **Frontend:** React 18 + TypeScript + Vite. PWA responsive, mobile-first (uso principal en móvil Android/iOS vía navegador; funcional en desktop). Sin apps nativas.
- **Backend:** Node.js 22 LTS + NestJS + TypeScript. API REST con OpenAPI generado.
- **BD:** PostgreSQL 16 vanilla (sin extensiones propietarias). Migraciones y acceso con Prisma.
- **Autenticación:** Auth0. JWT RS256 validado en backend (audience + issuer). MFA por política Auth0. Autoregistro DESACTIVADO. Alta de usuarios solo desde backoffice vía Auth0 Management API. Reset de contraseña = flujo estándar Auth0. Prohibido especificar cualquier flujo de credenciales de los mockups (99-decisiones § G-B2).
- **Roles:** `admin`, `director`, `coordinador`, `entrenador` como roles Auth0 inyectados en el JWT vía Action. Ámbitos (categoría del coordinador, equipos N:M del entrenador) en BD propia, resueltos en backend. Matriz de permisos completa: 99-decisiones § G-B1 — es normativa.
- **Infraestructura:** Docker. docker-compose local (web, api, postgres). Imágenes OCI estándar, vendor-agnostic: prohibido depender de servicios gestionados de un cloud concreto en el código. Email transaccional vía SMTP configurable (G-A5).
- **Monorepo:** pnpm workspaces — `apps/web`, `apps/api`, `packages/shared` (tipos compartidos).

## Reglas funcionales transversales
- **Idiomas:** EU y ES en todos los literales de UI; preferencia por usuario, default de instancia euskera (G-C5). Los literales de los mockups se transcriben tal cual, sin traducir ni corregir.
- **Porcentajes:** cálculo y presentación con 1 decimal en toda la app (G-C9). Umbrales de color por métrica según G-C3.
- **Cómputo de %:** siempre desde `fecha_incorporacion` del miembro (G-A4) y dentro del bloque (G-A3).
- **Edición:** registros editables en cualquier momento mientras la temporada esté abierta; sin bloqueos temporales (G-B3). Temporadas cerradas = solo lectura total (G-A7).
- **Catálogo único:** equipos, personas y usuarios se gestionan una sola vez (backoffice/catálogo, matriz G-B1); los módulos lo consumen (G-C1).
- **Taxonomías de estado por módulo** según G-C2; no unificar entre módulos.

## Convenciones de desarrollo
- Código, comentarios, nombres de API y de BD en inglés; literales de UI según mockups (EU/ES).
- Tests: Vitest + Testing Library (web), Jest + Supertest (api). Cada change incluye tests de sus requirements.
- Cada change de OpenSpec es un slice pequeño (una capability o menos). Validación: `openspec validate --strict` + revisión humana de trazabilidad antes de apply. Tras apply: verificación contra el mockup correspondiente ("golden screen").

## Secuencia de changes prevista
1. `add-infrastructure` — monorepo, docker-compose, CI (lint+test+build). Sin funcionalidad.
2. `add-auth` — Auth0 front+back, guards por rol, endpoint `/me`.
3. `add-data-model` — esquema Prisma desde `98-modelo-datos.md`. Solo migraciones + seed mínimo.
4. `add-backoffice` — gestión de usuarios (Management API), temporadas, bloques, equipos, festivos; import Excel de jugadores (G-A2). Rol admin.
5. `add-catalogo-equipos` — navegación categoría→equipo, plantillas (miembros, fecha_incorporacion, orden, fotos).
6. `add-asistencia-jugadores` — módulo P/A Eskola/F7 (inventario 01).
7. `add-asistencias-f11` — módulo de 10 estados (inventario 03).
8. `add-minutaje` — FieldBook (inventario 04).
9. `add-asistencia-entrenadores` — inventario 02.
10. `add-panel-estado` — semáforos de actualización (G-A6).
11. `add-notificaciones` — emails programados (G-A5).
12. `add-historico` — cierre de temporada y modo solo lectura (G-A7).
