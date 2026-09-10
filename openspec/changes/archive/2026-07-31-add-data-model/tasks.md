## 1. Setup

- [x] 1.1 Añadir `prisma` (devDependency) y `@prisma/client` (dependency) a `apps/api/package.json`; subir `typescript` a `^5.4.5` (requerido por `@prisma/client` 7.x) y quitar `noStrictGenericChecks` de `tsconfig.json` (removido en TS 5.5+)
- [x] 1.2 Ejecutar `prisma init` en `apps/api/` generando `apps/api/prisma/schema.prisma` (`datasource db { provider = "postgresql" }`, resuelto vía `prisma.config.ts`) y `generator client`; limpiar el ruido no solicitado que instala `prisma init` (`.claude/`, `.windsurf/`, `.agents/`, `skills-lock.json`, `.env` placeholder)
- [x] 1.3 Confirmar que `DATABASE_URL` ya llega al contenedor `api` vía `docker-compose.yml` (sin cambios, heredado de `add-infrastructure`)

## 2. Schema: catálogo y organización

- [x] 2.1 Definir enum `TemporadaEstado` (`abierta`/`cerrada`) y modelo `temporada` (`nombre` UQ, `fecha_inicio`, `fecha_fin`, `estado`)
- [x] 2.2 Definir enum `BloqueTipo` (`pretemporada`/`temporada`/`unico`) y modelo `bloque` (`temporada_id` FK, `tipo`, `fecha_activacion`, UQ `(temporada_id, tipo)`)
- [x] 2.3 Definir enum `Categoria` (`eskola`/`f7`/`f11`)
- [x] 2.4 Definir modelo `equipo` (`temporada_id` FK, `categoria`, `nombre`, `color?`, `icono?`, `minutos_por_periodo`, `num_periodos`, `dias_entrenamiento` `Int[]`)
- [x] 2.5 Definir modelo `festivo` (`temporada_id` FK, `fecha`, `descripcion?`, UQ `(temporada_id, fecha)`)

## 3. Schema: personas y usuarios

- [x] 3.1 Definir enum `UsuarioRol` (`admin`/`director`/`coordinador`/`entrenador`) y enum `Idioma` (`eu`/`es`)
- [x] 3.2 Definir modelo `usuario` (`auth0_id` UQ, `nombre_visible`, `email` UQ, `rol`, `categoria_asignada?`, `idioma` default `eu`)
- [x] 3.3 Definir modelo `persona` (`usuario_id?` FK UQ, `nombre`, `alias?`, `foto_url?`)
- [x] 3.4 Definir enum `MiembroGrupo` (`con_ficha`/`sin_ficha`/`entrenador`) y modelo `miembro_equipo` (`equipo_id` FK, `persona_id` FK, `grupo`, `rol_entrenador?`, `fecha_incorporacion` NOT NULL, `fecha_baja?`, `orden`, UQ `(equipo_id, persona_id)`)
- [x] 3.5 Definir modelo `usuario_equipo` (`usuario_id` FK, `equipo_id` FK, UQ `(usuario_id, equipo_id)`)

## 4. Schema: calendario y asistencia

- [x] 4.1 Definir enum `SesionTipo` (`entrenamiento`/`partido`) y enum `SesionOrigen` (`regla`/`manual`)
- [x] 4.2 Definir modelo `sesion` (`equipo_id` FK, `bloque_id` FK, `fecha`, `numero?`, `tipo`, `origen`, `eliminada` default `false`, UQ `(equipo_id, fecha, tipo)`)
- [x] 4.3 Definir modelo `registro_asistencia` (`sesion_id` FK, `miembro_equipo_id` FK, `estado` `String` con comentario documentando el CHECK de aplicación, `nota?`, UQ `(sesion_id, miembro_equipo_id)`)

## 5. Schema: minutaje

- [x] 5.1 Definir enum `Campo` (`local`/`visitante`) y enum `BajaTipo` (`LES`/`SAN`/`ENF`/`VAC`/`NJ`)
- [x] 5.2 Definir modelo `jornada` (`equipo_id` FK, `bloque_id` FK, `numero`, `rival?`, `fecha?`, `campo`, `goles_favor` default `0`, `goles_contra` default `0`, UQ `(equipo_id, bloque_id, numero)`)
- [x] 5.3 Definir modelo `participacion_jornada` (`jornada_id` FK, `miembro_equipo_id` FK, `convocado`/`jugado`/`titular` boolean, `baja?`, `minutos` default `0`, `goles` default `0`, UQ `(jornada_id, miembro_equipo_id)`)

## 6. Schema: notificaciones

- [x] 6.1 Definir enum `NotificacionTipo` (`asistencia_dia`/`minutaje_dia`/`recordatorio_semanal`) y modelo `notificacion_enviada` (`usuario_id` FK, `equipo_id` FK, `tipo`, `fecha_envio` timestamptz)

## 7. Migración

- [x] 7.1 Ejecutar `prisma migrate dev --name init` contra el `postgres` de `docker-compose.yml`
- [x] 7.2 Verificar `prisma migrate status` limpio (sin migraciones pendientes)
- [x] 7.3 Revisar el SQL generado en `apps/api/prisma/migrations/` para confirmar que no incluye ningún CHECK constraint no especificado en la fuente

## 8. Seed

- [x] 8.1 Crear `apps/api/prisma/seed.ts`: 1 `temporada` "2026-27" (`estado: abierta`)
- [x] 8.2 Seed: 1 `equipo` por cada valor de `Categoria` (3 equipos), vinculados a la temporada de seed
- [x] 8.3 Seed: 1 `usuario` por cada valor de `UsuarioRol` (4 usuarios), con `auth0_id` placeholder determinista (p.ej. `seed-admin`, `seed-director`, `seed-coordinador`, `seed-entrenador`)
- [x] 8.4 Configurar el comando de seed (`migrations.seed` en `apps/api/prisma.config.ts` — Prisma 7 no usa `package.json#prisma.seed`) para que `prisma db seed` lo ejecute
- [x] 8.5 Ejecutar el seed contra la BD local y confirmar 1 temporada + 3 equipos + 4 usuarios creados

## 9. Verificación

- [x] 9.1 Confirmar que `prisma generate` produce el cliente sin errores de tipos
- [x] 9.2 Confirmar manualmente (o con un script puntual) los constraints únicos clave: `usuario.email`, `usuario.auth0_id`, `miembro_equipo (equipo_id, persona_id)`, `registro_asistencia (sesion_id, miembro_equipo_id)`
- [x] 9.3 Confirmar que `miembro_equipo.fecha_incorporacion` rechaza NULL
- [x] 9.4 Confirmar que re-ejecutar el seed sobre una BD ya sembrada no dupla filas de forma silenciosa (falla con `P2002` en `temporada.nombre`, cubierto por la UQ existente; no hace falta upsert ni `--force-reset` para el alcance de este change)
