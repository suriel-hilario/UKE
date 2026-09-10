## Context

`98-modelo-datos.md` es un modelo lógico ya validado (VALIDADO por Suriel, 14/07/2026) derivado de los inventarios funcionales y de `99-decisiones.md`. Este change lo transcribe a un schema de Prisma ejecutable, sin reinterpretarlo: cada modelo, campo y enum del proposal cita su sección de origen. `add-infrastructure` ya dejó `postgres:16` corriendo en `docker-compose.yml` con `DATABASE_URL` inyectada al servicio `api`; este change añade Prisma como capa de acceso sobre esa misma base, tal como fija `project.md` § BD ("Migraciones y acceso con Prisma").

No hay lógica de negocio que decidir aquí: los cómputos derivados (% de asistencia, `%DISP` de minutaje, panel de estado G-A6) están descritos en `98-modelo-datos.md` §§ 3–5 como fórmulas sobre las tablas, pero su implementación (servicios, endpoints) es de changes posteriores. El único trabajo de diseño real es traducir la notación del documento (PK/FK/UQ/enum/tipos) a las primitivas de Prisma sin inventar comportamiento no especificado (cascadas de borrado, defaults, índices adicionales).

## Goals / Non-Goals

**Goals:**
- Un `schema.prisma` que contenga exactamente los 13 modelos y los campos de `98-modelo-datos.md`, con sus tipos, nullability, UQ compuestas y FKs tal como están descritos.
- Migración inicial aplicable limpiamente contra el `postgres` de `docker-compose.yml`.
- Seed mínimo y determinista que deje datos suficientes para un smoke test de `/auth/me` (de `add-auth`) en un change futuro, sin acoplar este change a Auth0.
- Todas las PK como UUID (`98-modelo-datos.md` § Notación).

**Non-Goals:**
- No se implementan las fórmulas de cómputo derivado (%, semáforos) — son de changes posteriores.
- No se crea ningún endpoint ni servicio que use Prisma Client más allá del seed script.
- No se añade el CHECK constraint de `registro_asistencia.estado` a nivel de BD (decisión ya cerrada en el proposal: aplicación, no constraint).
- No se decide aquí la relación `usuario` ↔ Auth0 más allá del campo `auth0_id` ya descrito en la fuente — ninguna llamada real a Auth0 (Management API es `add-backoffice`).

## Decisions

**D1. UUID generado por Prisma Client (`@default(uuid())`), no por función de Postgres.**
`98-modelo-datos.md` exige UUID en todas las PK pero no especifica el mecanismo de generación. Prisma soporta `@default(uuid())` (generado en el cliente, sin depender de extensiones de Postgres) o `@default(dbgenerated("gen_random_uuid()"))` (función nativa desde Postgres 13, sin extensión `pgcrypto`). Se elige `@default(uuid())` porque es portable entre entornos (no depende de la versión exacta de Postgres) y evita cualquier dependencia de función de BD, coherente con `project.md` § Infraestructura ("vendor-agnostic"). Columnas tipadas `@db.Uuid` para que Postgres almacene un UUID nativo, no texto.

**D2. `categoria` como enum de Prisma compartido, no tabla de referencia.**
`98-modelo-datos.md` § categoria deja la elección abierta ("Enum o tabla de referencia"). Se elige enum porque el catálogo es fijo y cerrado (`eskola`/`f7`/`f11`, sin gestión de alta/baja de categorías descrita en ningún inventario) — una tabla de referencia añadiría una FK e indirección sin beneficio, ya que ningún requirement permite crear categorías nuevas.

**D3. Sin `onDelete` explícito (comportamiento por defecto de Prisma/Postgres: `RESTRICT`).**
Ninguna fuente especifica qué ocurre al intentar borrar una fila referenciada (p.ej. un `equipo` con `sesion`es). Ante esa ausencia, se usa el default de Prisma (`RESTRICT` para relaciones requeridas), que es la opción más segura y no inventa comportamiento (una cascada de borrado sería una decisión de producto no tomada en `99-decisiones.md`). Si un change futuro necesita borrado en cascada para algún caso concreto, se decide explícitamente ahí.

**D4. Relaciones opcionales (`persona.usuario_id`, `miembro_equipo.fecha_baja`, etc.) como campos nulables (`?`), no como tablas separadas.**
Refleja literalmente la notación `?` de la fuente (D2/D3 de `98-modelo-datos.md`); no se introduce herencia de tablas ni tipos union para modelar la opcionalidad.

**D5. `registro_asistencia.estado` como `String` sin `@default` ni `CHECK`.**
Ya decidido en el proposal (D1 del documento fuente): el CHECK por categoría se aplica en la capa de aplicación. Ausencia de fila = "sin marcar", por lo que no hace falta ningún valor por defecto — se documenta con un comentario en el schema, no con lógica.

**D6. Seed con `auth0_id` placeholder determinista (`seed-admin`, `seed-director`, etc.), no valores aleatorios.**
El seed debe ser reproducible entre entornos de desarrollo. Se usan strings fijos y reconocibles como placeholder de `auth0_id`, dejando explícito en el propio script que no son IDs reales de Auth0 — evita que alguien los confunda con datos de producción.

## Risks / Trade-offs

- **[Riesgo] `@default(uuid())` genera el UUID en el cliente Prisma, no en la BD** → si en el futuro se inserta directamente vía SQL (fuera de Prisma), no habrá default automático. Mitigación: documentado en el schema; todo el acceso a BD de este proyecto pasa por Prisma (`project.md` § BD).
- **[Riesgo] `RESTRICT` por defecto puede bloquear operaciones legítimas no previstas aún** (p.ej. borrar un `equipo` de una temporada mal creada) → Mitigación: ningún inventario describe un flujo de borrado de catálogo; si aparece en `add-backoffice`, se decide explícitamente ahí en vez de asumir cascada ahora.
- **[Trade-off] Sin CHECK de BD para `registro_asistencia.estado`** → datos inválidos solo se evitan si la capa de aplicación los valida siempre; aceptado porque es la decisión ya cerrada en la fuente (D1), no una decisión nueva de este change.

## Migration Plan

1. Añadir `prisma` y `@prisma/client` a `apps/api/package.json`.
2. Crear `apps/api/prisma/schema.prisma` con `datasource db { provider = "postgresql" }`. La versión de Prisma instalada (7.x) resuelve la connection string vía `prisma.config.ts` (`url: process.env["DATABASE_URL"]`) en vez del clásico `url = env("DATABASE_URL")` inline — mismo resultado (reutiliza la `DATABASE_URL` ya inyectada por `docker-compose.yml`), mecanismo distinto por ser la convención de la versión instalada.
3. Todos los comandos de Prisma (`migrate dev`, `db seed`, `generate`) se ejecutan **dentro del contenedor `api`** (`docker compose exec api ...`), no en el host: así heredan la `DATABASE_URL` real del contenedor (`postgres:5432`, resoluble solo dentro de la red de Docker) sin necesitar un `.env` local duplicado en `apps/api/`.
4. Generar la migración inicial: `prisma migrate dev --name init` contra el `postgres` del compose.
5. Ejecutar `prisma/seed.ts` (vía `prisma db seed` o script `pnpm --filter @workspace/api` dedicado).
6. Verificación: `prisma migrate status` limpio, `prisma studio` o una query directa confirmando las filas de seed.

**Nota de compatibilidad descubierta durante la implementación:** `@prisma/client` 7.x exige TypeScript ≥5.4; `apps/api` estaba en `4.9.5` (heredado de `add-infrastructure`). Se sube a `^5.4.5` y se elimina `noStrictGenericChecks` de `tsconfig.json` (opción removida en TS 5.5+). No afecta a ningún requirement de `add-auth`: sus tests e2e y de compilación se re-verificaron en verde tras el bump.

**Segunda nota de compatibilidad:** `@prisma/client` 7.x elimina la conexión implícita vía `DATABASE_URL` en el cliente generado — requiere un *driver adapter* explícito (`@prisma/adapter-pg` + `pg`) al instanciar `PrismaClient` en código de aplicación (el CLI de migraciones sigue usando `prisma.config.ts` sin adapter). Se añaden `@prisma/adapter-pg`, `pg` y `@types/pg` como dependencias; `prisma/seed.ts` instancia `PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })`. Cualquier `PrismaService` de un change futuro deberá seguir el mismo patrón.

**Tercera nota:** `pnpm` bloquea por defecto los scripts `postinstall` de dependencias (incluido el de `prisma`/`@prisma/engines`, que descarga los binarios del motor). Se añade `pnpm.onlyBuiltDependencies` en el `package.json` raíz para permitir explícitamente `prisma`, `@prisma/client` y `@prisma/engines`.

**Cuarta nota:** los comandos de Prisma CLI (`migrate status`, `db seed`, `studio`) también se ejecutan directamente en el host (fuera de Docker) durante el desarrollo local (`DOCKER_SETUP.md` § "Local Development (Recomendado)"). El host no tiene `DATABASE_URL` en su entorno (esa variable solo la inyecta `docker-compose.yml` dentro del contenedor `api`, con hostname `postgres`). Se añade `apps/api/.env` (gitignorado, no committeado) con `DATABASE_URL` apuntando a `localhost:5432` — el mismo Postgres, expuesto al host por el mapeo de puertos de `docker-compose.yml`. `prisma.config.ts` ya carga `.env` vía `dotenv/config`, así que ambos entornos de ejecución (host y contenedor) quedan cubiertos sin duplicar lógica.

No hay datos previos que migrar (BD nueva desde `add-infrastructure`). Rollback: `prisma migrate reset` en desarrollo; no aplica a producción porque este change no se ha desplegado aún fuera de local.

## Open Questions

Ninguna pendiente: las dos abiertas en el proposal (ubicación de `prisma/`, comportamiento de `estado` sin CHECK) se resolvieron ahí.
