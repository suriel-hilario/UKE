# data-model Specification

## Purpose
TBD - created by archiving change add-data-model. Update Purpose after archive.
## Requirements
### Requirement: Todas las claves primarias son UUID
Todo modelo del schema SHALL usar una clave primaria `id` de tipo UUID, generada por el cliente Prisma (`98-modelo-datos.md` § Notación: "todas UUID salvo indicación").

#### Scenario: PK de cualquier modelo es UUID
- **WHEN** se inspecciona el campo `id` de cualquier modelo del schema
- **THEN** su tipo de columna es `Uuid` y tiene un valor por defecto generado automáticamente al crear una fila sin especificar `id`

### Requirement: Modelo temporada
El schema SHALL definir un modelo `temporada` con `nombre` único, `fecha_inicio`, `fecha_fin` y `estado` (enum `abierta`/`cerrada`) (98-modelo-datos.md § temporada; G-C4, G-A7).

#### Scenario: Nombre de temporada es único
- **WHEN** se intenta crear dos `temporada` con el mismo `nombre`
- **THEN** la segunda inserción falla por violación de constraint único

### Requirement: Modelo bloque
El schema SHALL definir un modelo `bloque` con `temporada_id` (FK a `temporada`), `tipo` (enum `pretemporada`/`temporada`/`unico`) y `fecha_activacion`, con unicidad compuesta `(temporada_id, tipo)` (98-modelo-datos.md § bloque; G-A3).

#### Scenario: No se puede duplicar un tipo de bloque en la misma temporada
- **WHEN** se intenta crear dos `bloque` con el mismo `temporada_id` y `tipo`
- **THEN** la segunda inserción falla por violación de constraint único

### Requirement: Enum categoria
El schema SHALL definir un enum `Categoria` con los valores `eskola`, `f7`, `f11`, usado por `equipo.categoria` y `usuario.categoria_asignada` (98-modelo-datos.md § categoria; G-B1).

#### Scenario: Valor de categoria fuera del catálogo es rechazado
- **WHEN** se intenta crear un `equipo` con un valor de `categoria` que no sea `eskola`, `f7` ni `f11`
- **THEN** la inserción falla por tipo inválido

### Requirement: Modelo equipo
El schema SHALL definir un modelo `equipo` con `temporada_id` (FK), `categoria` (enum), `nombre`, `color?`, `icono?`, `minutos_por_periodo`, `num_periodos`, `dias_entrenamiento` (array de enteros) (98-modelo-datos.md § equipo; G-C1, G-C6, G-C7).

#### Scenario: Equipo pertenece a una temporada y categoría
- **WHEN** se crea un `equipo` con `temporada_id` y `categoria` válidos
- **THEN** la fila se crea y ambas relaciones son consultables

### Requirement: Modelo festivo
El schema SHALL definir un modelo `festivo` con `temporada_id` (FK), `fecha` y `descripcion?`, con unicidad compuesta `(temporada_id, fecha)` (98-modelo-datos.md § festivo; G-C11).

#### Scenario: No se puede duplicar un festivo en la misma fecha y temporada
- **WHEN** se intenta crear dos `festivo` con el mismo `temporada_id` y `fecha`
- **THEN** la segunda inserción falla por violación de constraint único

### Requirement: Modelo persona
El schema SHALL definir un modelo `persona` con `usuario_id?` (FK única opcional a `usuario`), `nombre`, `alias?`, `foto_url?` (98-modelo-datos.md § persona; inv. 01 §2, 03; G-A4).

#### Scenario: Persona sin usuario vinculado
- **WHEN** se crea una `persona` sin `usuario_id`
- **THEN** la fila se crea correctamente (el vínculo es opcional)

#### Scenario: Un usuario no puede vincularse a más de una persona
- **WHEN** se intenta vincular el mismo `usuario_id` a dos `persona` distintas
- **THEN** la segunda inserción falla por violación de constraint único

### Requirement: Modelo miembro_equipo
El schema SHALL definir un modelo `miembro_equipo` con `equipo_id` (FK), `persona_id` (FK), `grupo` (enum `con_ficha`/`sin_ficha`/`entrenador`), `rol_entrenador?`, `fecha_incorporacion` obligatoria, `fecha_baja?` y `orden`, con unicidad compuesta `(equipo_id, persona_id)` (98-modelo-datos.md § miembro_equipo; G-A4, D2).

#### Scenario: fecha_incorporacion es obligatoria
- **WHEN** se intenta crear un `miembro_equipo` sin `fecha_incorporacion`
- **THEN** la inserción falla por violación de NOT NULL

#### Scenario: Una persona no puede repetirse en el mismo equipo
- **WHEN** se intenta crear dos `miembro_equipo` con el mismo `equipo_id` y `persona_id`
- **THEN** la segunda inserción falla por violación de constraint único

#### Scenario: fecha_baja es opcional
- **WHEN** se crea un `miembro_equipo` sin `fecha_baja`
- **THEN** la fila se crea correctamente y el miembro se considera activo

### Requirement: Modelo usuario
El schema SHALL definir un modelo `usuario` con `auth0_id` único, `nombre_visible`, `email` único, `rol` (enum `admin`/`director`/`coordinador`/`entrenador`), `categoria_asignada?` (enum) e `idioma` (enum `eu`/`es`, default `eu`) (98-modelo-datos.md § usuario; G-B1, G-B2, G-A8, G-C5).

#### Scenario: auth0_id y email son únicos
- **WHEN** se intenta crear dos `usuario` con el mismo `auth0_id` o el mismo `email`
- **THEN** la segunda inserción falla por violación de constraint único

#### Scenario: idioma por defecto es euskera
- **WHEN** se crea un `usuario` sin especificar `idioma`
- **THEN** el valor almacenado es `eu`

### Requirement: Modelo usuario_equipo
El schema SHALL definir un modelo `usuario_equipo` (N:M) con `usuario_id` (FK) y `equipo_id` (FK), con unicidad compuesta `(usuario_id, equipo_id)` (98-modelo-datos.md § usuario_equipo; G-A8).

#### Scenario: Un usuario puede vincularse a varios equipos
- **WHEN** se crean dos `usuario_equipo` con el mismo `usuario_id` y distinto `equipo_id`
- **THEN** ambas filas se crean correctamente

#### Scenario: No se puede duplicar el vínculo usuario-equipo
- **WHEN** se intenta crear dos `usuario_equipo` con el mismo `usuario_id` y `equipo_id`
- **THEN** la segunda inserción falla por violación de constraint único

### Requirement: Modelo sesion
El schema SHALL definir un modelo `sesion` con `equipo_id` (FK), `bloque_id` (FK), `fecha`, `numero?`, `tipo` (enum `entrenamiento`/`partido`), `origen` (enum `regla`/`manual`) y `eliminada` (boolean, default `false`), con unicidad compuesta `(equipo_id, fecha, tipo)` (98-modelo-datos.md § sesion; G-C8, G-A3, G-B3).

#### Scenario: eliminada es false por defecto
- **WHEN** se crea una `sesion` sin especificar `eliminada`
- **THEN** el valor almacenado es `false`

#### Scenario: No se puede duplicar sesión del mismo tipo en la misma fecha
- **WHEN** se intenta crear dos `sesion` con el mismo `equipo_id`, `fecha` y `tipo`
- **THEN** la segunda inserción falla por violación de constraint único

### Requirement: Modelo registro_asistencia
El schema SHALL definir un modelo `registro_asistencia` con `sesion_id` (FK), `miembro_equipo_id` (FK), `estado` (texto, sin CHECK de BD) y `nota?`, con unicidad compuesta `(sesion_id, miembro_equipo_id)`. El CHECK del valor de `estado` según la categoría del equipo (P/A en Eskola/F7/entrenadores; 10 estados en F11) se aplica en la capa de aplicación, no en la BD (98-modelo-datos.md § registro_asistencia; § D1; G-C2).

#### Scenario: Un miembro no puede tener dos registros en la misma sesión
- **WHEN** se intenta crear dos `registro_asistencia` con el mismo `sesion_id` y `miembro_equipo_id`
- **THEN** la segunda inserción falla por violación de constraint único

#### Scenario: estado acepta cualquier valor de texto a nivel de BD
- **WHEN** se crea un `registro_asistencia` con cualquier valor de texto en `estado`
- **THEN** la BD acepta la inserción (la validación del valor permitido es responsabilidad de la aplicación, no de esta capa)

### Requirement: Modelo jornada
El schema SHALL definir un modelo `jornada` con `equipo_id` (FK), `bloque_id` (FK), `numero`, `rival?`, `fecha?`, `campo` (enum `local`/`visitante`), `goles_favor` y `goles_contra` (default `0`), con unicidad compuesta `(equipo_id, bloque_id, numero)` (98-modelo-datos.md § jornada; inv. 04; G-B3).

#### Scenario: goles_favor y goles_contra son 0 por defecto
- **WHEN** se crea una `jornada` sin especificar `goles_favor` ni `goles_contra`
- **THEN** ambos valores almacenados son `0`

#### Scenario: Re-guardar el mismo número de jornada sobrescribe (no duplica)
- **WHEN** se intenta crear dos `jornada` con el mismo `equipo_id`, `bloque_id` y `numero`
- **THEN** la segunda inserción falla por violación de constraint único (la sobrescritura se implementa como update, no como insert duplicado)

### Requirement: Modelo participacion_jornada
El schema SHALL definir un modelo `participacion_jornada` con `jornada_id` (FK), `miembro_equipo_id` (FK), `convocado`/`jugado`/`titular` (boolean), `baja?` (enum `LES`/`SAN`/`ENF`/`VAC`/`NJ`), `minutos` (default `0`) y `goles` (default `0`), con unicidad compuesta `(jornada_id, miembro_equipo_id)` (98-modelo-datos.md § participacion_jornada; inv. 04; G-C2c).

#### Scenario: minutos y goles son 0 por defecto
- **WHEN** se crea una `participacion_jornada` sin especificar `minutos` ni `goles`
- **THEN** ambos valores almacenados son `0`

#### Scenario: baja es opcional
- **WHEN** se crea una `participacion_jornada` sin `baja`
- **THEN** la fila se crea correctamente con `baja` nulo

#### Scenario: Un miembro no puede tener dos participaciones en la misma jornada
- **WHEN** se intenta crear dos `participacion_jornada` con el mismo `jornada_id` y `miembro_equipo_id`
- **THEN** la segunda inserción falla por violación de constraint único

### Requirement: Modelo notificacion_enviada
El schema SHALL definir un modelo `notificacion_enviada` con `usuario_id` (FK), `equipo_id` (FK), `tipo` (enum `asistencia_dia`/`minutaje_dia`/`recordatorio_semanal`) y `fecha_envio` (timestamptz) (98-modelo-datos.md § notificacion_enviada; G-A5).

#### Scenario: Se registra el envío de una notificación
- **WHEN** se crea una `notificacion_enviada` con `usuario_id`, `equipo_id`, `tipo` y `fecha_envio`
- **THEN** la fila se crea correctamente y es consultable por `usuario_id`, `equipo_id`, `tipo` y fecha (para verificar idempotencia en la capa de aplicación)

### Requirement: Migración inicial aplicable
El proyecto SHALL incluir una migración inicial de Prisma que crea todas las tablas, enums y constraints del schema contra una base PostgreSQL 16 vacía, sin errores (project.md § BD; 98-modelo-datos.md completo).

#### Scenario: La migración se aplica limpiamente
- **WHEN** se ejecuta `prisma migrate deploy` (o `migrate dev`) contra una base de datos `postgres` recién creada
- **THEN** todas las tablas y enums del schema quedan creados sin errores

### Requirement: Seed mínimo para smoke tests
El proyecto SHALL incluir un script de seed que crea una `temporada` "2026-27", un `equipo` por cada valor de `categoria`, y un `usuario` por cada `rol` (`admin`/`director`/`coordinador`/`entrenador`) con `auth0_id` placeholder determinista (proposal de este change).

#### Scenario: El seed se ejecuta de forma idempotente sobre una BD vacía
- **WHEN** se ejecuta el script de seed contra una BD recién migrada
- **THEN** se crean 1 `temporada`, 3 `equipo` (uno por categoría) y 4 `usuario` (uno por rol), todos consultables después

#### Scenario: Los usuarios de seed no tienen auth0_id reales
- **WHEN** se inspeccionan los `usuario` creados por el seed
- **THEN** sus valores de `auth0_id` son placeholders reconocibles (no IDs válidos de un tenant Auth0 real)

