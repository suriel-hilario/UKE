## Why

Ningún change hasta ahora tiene modelo de datos propio: `add-auth` resuelve identidad leyendo únicamente el JWT. Los siguientes changes de la secuencia (`add-backoffice`, catálogo, módulos deportivos) necesitan persistencia real en PostgreSQL para equipos, personas, calendario, asistencia y minutaje. Este change transcribe el modelo ya validado en `98-modelo-datos.md` a un schema de Prisma, sin lógica de negocio ni endpoints (`project.md` § Secuencia de changes prevista, punto 3).

## What Changes

- `prisma/schema.prisma` con los 13 modelos de `98-modelo-datos.md`: `temporada`, `bloque`, `equipo`, `festivo`, `persona`, `miembro_equipo`, `usuario`, `usuario_equipo`, `sesion`, `registro_asistencia`, `jornada`, `participacion_jornada`, `notificacion_enviada` (98-modelo-datos.md §§ 1–5). `categoria` se modela como enum de Prisma, no como tabla (98-modelo-datos.md § 1, "Enum o tabla de referencia").
- Enums de Prisma: `TemporadaEstado` (`abierta`/`cerrada`, § temporada), `BloqueTipo` (`pretemporada`/`temporada`/`unico`, § bloque), `Categoria` (`eskola`/`f7`/`f11`, § categoria), `MiembroGrupo` (`con_ficha`/`sin_ficha`/`entrenador`, § miembro_equipo), `UsuarioRol` (`admin`/`director`/`coordinador`/`entrenador`, § usuario), `Idioma` (`eu`/`es`, § usuario), `SesionTipo` (`entrenamiento`/`partido`, § sesion), `SesionOrigen` (`regla`/`manual`, § sesion), `Campo` (`local`/`visitante`, § jornada), `BajaTipo` (`LES`/`SAN`/`ENF`/`VAC`/`NJ`, § participacion_jornada), `NotificacionTipo` (`asistencia_dia`/`minutaje_dia`/`recordatorio_semanal`, § notificacion_enviada).
- `registro_asistencia.estado` como `String` (no enum), con comentario en el schema documentando que el CHECK por categoría (P/A en Eskola/F7/entrenadores; 10 estados en F11) se aplica a nivel de aplicación, no de constraint de BD (98-modelo-datos.md § D1).
- Todas las claves primarias `UUID` por defecto (98-modelo-datos.md § Notación: "todas UUID salvo indicación").
- Migración inicial (`prisma migrate dev --name init`) contra el `postgres` de `docker-compose.yml`.
- Seed mínimo (`prisma/seed.ts`): una `temporada` "2026-27", un `equipo` por categoría, y un `usuario` por rol (`admin`/`director`/`coordinador`/`entrenador`) con `auth0_id` placeholder — suficiente para ejercitar `/auth/me` de `add-auth` contra datos reales en un change posterior (no se conecta aquí; `add-auth` sigue leyendo solo el JWT).
- `prisma/` lives at `apps/api/prisma/` (co-located with the NestJS app that owns DB access).
  Source: project.md § Monorepo (apps/api workspace).
- `registro_asistencia.estado` has no default value: absence of row means "sin marcar"
  (98-modelo-datos.md § D1). No DB-level CHECK constraint in this change.

## Capabilities

### New Capabilities
- `data-model`: schema Prisma completo del dominio (catálogo, personas/usuarios, calendario/asistencia, minutaje, notificaciones), migraciones y seed mínimo.

### Modified Capabilities
(ninguna — no existen specs previas de modelo de datos; `auth` no cambia: sigue sin tocar BD)

## Impact

- **Nuevo** `apps/api/prisma/schema.prisma` (o `prisma/` en la raíz del workspace `api` — a decidir en design.md), `prisma/migrations/`, `prisma/seed.ts`.
- **apps/api**: nueva dependencia `@prisma/client` + `prisma` (devDependency); nueva `DATABASE_URL` ya existe en `docker-compose.yml` desde `add-infrastructure`, sin cambios ahí.
- **Fuera de alcance** (explícito): ningún endpoint de API, ninguna lógica de negocio (cómputo de %, panel de estado, notificaciones), ninguna llamada a Auth0, ningún cambio de UI. El código de cómputo derivado (G-A4/G-C9/D2, G-A6) descrito en `98-modelo-datos.md` §§ 3–5 se implementa en changes posteriores; aquí solo se modela el dato base.
