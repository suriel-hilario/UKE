## Why

`add-catalogo-equipos` deja la navegación de solo lectura (temporada → equipo → plantilla), pero ningún módulo deportivo puede registrar nada todavía — la pestaña "Plantilla" es la única, y `sesion`/`registro_asistencia` no tienen ningún consumidor real. Este es el sexto change de la secuencia (`project.md` § Secuencia de changes prevista, punto 6) y el primero que registra datos deportivos, empezando por asistencia de jugadores en Eskola/F7 (modelo P/A de dos estados; F11 con 10 estados es `add-asistencias-f11`, fuera de alcance aquí).

## What Changes

Backend (`apps/api`):
- **Generación automática de sesiones (`origen: regla`)**: ningún change anterior implementa el modelo de calendario combinado descrito en `99-decisiones.md` § G-C8 (regla semanal del equipo + festivos de la temporada + excepciones puntuales). Este change lo añade: al consultar la asistencia de un equipo/bloque/mes, el sistema asegura que existan las `sesion` de tipo `entrenamiento` para cada `dia_entrenamiento` del equipo dentro de ese rango, excluyendo `festivo` de la temporada, creándolas con `origen: regla` si no existen todavía (idempotente — no duplica si ya existen, respeta la unicidad `(equipo_id, fecha, tipo)` del schema). Fuente: `99-decisiones.md` § G-C8; `98-modelo-datos.md` § sesion, § festivo.
- `GET /equipos/:id/asistencia?bloque_id=&mes=` — devuelve las `sesion` del equipo para el bloque y mes dados (`eliminada = false`, tras asegurar la generación anterior), con los `registro_asistencia` de cada `miembro_equipo` activo del equipo (`fecha_incorporacion <= fecha` y, si existe, `fecha_baja` no anterior a la fecha de la sesión — regla D2). Sin fila `registro_asistencia` = estado "sin marcar". Scope: mismas reglas que `add-catalogo-equipos` (G-B1).
- `PATCH /equipos/:id/asistencia` — upsert de una fila `registro_asistencia` (`sesion_id` + `miembro_equipo_id` + `estado`); valores válidos en Eskola/F7: `P` (presente) y `A` (ausente) únicamente (`99-decisiones.md` § G-C2a); admite también `nota` (campo ya existente en el modelo). Devuelve el registro actualizado. Scope de escritura: `entrenador` (solo sus equipos), `coordinador` (solo su categoría), `director` (todos) — misma jerarquía que la lectura de catálogo (G-B1). `409` si la temporada del equipo está cerrada (G-A7, solo lectura).
- `PATCH /equipos/:id/sesiones/:sesionId` — marca `eliminada: true/false` (quitar/restaurar día). Mismo scope de escritura; `409` si temporada cerrada.
- `POST /equipos/:id/sesiones` — crea una `sesion` manual (`origen: manual`, `tipo` E o P, `fecha`, `numero?`); valida que no exista ya `(equipo_id, fecha, tipo)` (constraint único del schema). Mismo scope; `409` si temporada cerrada.
- `GET /equipos/:id/asistencia/exportar?bloque_id=&mes=` — CSV del mes: columnas Jugador + una por fecha de sesión (ISO) + `%`; fichero `UKE_<equipo.nombre>_<mes>.csv`. Fuente: inventario 01 § Acciones (⬇ CSV).
- `GET /miembros/:miembroId/ficha?equipo_id=` — ficha del jugador: `persona` (`nombre`, `alias`, `foto_url`), `grupo`, `fecha_incorporacion`; estadísticas de temporada (% total, presencias, faltas, sesiones) y desglose mensual (mes, sesiones, presencias, %) para todos los meses del bloque activo. Fórmula de porcentaje: ver más abajo. Umbrales de color: ≥80 verde, ≥60 ámbar, <60 rojo (`99-decisiones.md` § G-C3, fila Eskola/F7/entrenadores). Mismo scope de lectura.
- `PATCH /miembros/:miembroId/foto` — `multipart/form-data` (`image/*`), redimensiona a máx. 200px, almacena en almacenamiento de objetos propio (`99-decisiones.md` § D: "fotos de persona en almacenamiento de objetos propio, no dataURLs en BD"), actualiza `persona.foto_url`. Mismo scope de escritura.
- `DELETE /miembros/:miembroId/foto` — limpia `persona.foto_url`. Mismo scope de escritura.
- `GET /catalogo/equipos/:id/sesiones` (de `add-catalogo-equipos`) no cambia — sigue siendo el listado de solo lectura por bloque; los endpoints nuevos de este change son de escritura y viven bajo `/equipos/*` y `/miembros/*`, prefijos nuevos y distintos de `/catalogo` (que es explícitamente solo lectura, `design.md` de `add-catalogo-equipos`) y de `/admin` (backoffice).

Frontend (`apps/web`):
- Pestaña "Asistencia" añadida a la barra de pestañas del detalle de equipo (`add-catalogo-equipos` la dejó preparada para esto). Fuente: inventario 01 § Pantalla 2.
- Sidebar de selección de mes: lista de meses (Iraila/Septiembre … Maiatza/Mayo) con el % mensual junto a cada uno. Fuente: inventario 01 § Pantalla 2 § Sidebar.
- Tabla de asistencia del mes seleccionado: cabecera "Jokalaria/Jugador" + una columna por sesión (día de semana abreviado + número) + columna "%"; fila "SAIOA % / SESIÓN %" (% por sesión + total mensual); una fila por miembro activo (avatar, nombre clicable → ficha, una celda de asistencia por sesión, % mensual coloreado); fila "TOTALA / TOTAL" (% mensual del equipo). Fuente: inventario 01 § Pantalla 2 § Tabla de asistencia.
- Celda de asistencia: click cicla vacío → P → A → vacío, llama a `PATCH /equipos/:id/asistencia` en cada cambio. Fuente: inventario 01 § Pantalla 2 § Acciones.
- Click derecho / pulsación larga en celda → overlay de nota (📝 Oharra/Nota): textarea, botones guardar y eliminar. Fuente: inventario 01 § Overlay Nota.
- Modo edición (✏ Editatu/Editar → ✔ Gorde/Guardar): en modo edición aparece "✕" en cada cabecera de sesión (quitar día, confirmación, `PATCH sesion eliminada=true`, toast "🗑 Eguna kenduta/Día eliminado") y "✕" junto a cada jugador (eliminar, confirmación — en este módulo se resuelve como `PATCH miembro fecha_baja=hoy`, no borrado físico, coherente con `99-decisiones.md` § G-A7 preservación de histórico). Fuente: inventario 01 § Pantalla 2 § Acciones.
- Botón "+ Jokalaria / + Jugador" → modal de alta (campo nombre, Enter confirma), llama a `POST /admin/equipos/:id/miembros` (endpoint de `add-backoffice`, ya existente). Fuente: inventario 01 § Overlay alta de jugador.
- Botón de exportar CSV → llama a `GET /equipos/:id/asistencia/exportar`, dispara la descarga. Fuente: inventario 01 § Acciones (⬇ CSV).
- Overlay de ficha del jugador (click en nombre/avatar): avatar con botón 📷 de subida (`PATCH /miembros/:miembroId/foto`); nombre editable inline (`PATCH /admin/equipos/:id/miembros/:miembroId`); grid de 4 estadísticas (Total %, Presencias, Faltas, Sesiones); tabla mensual con mini barra de progreso coloreada; botón "🗑 Eliminar jugador" (confirmación → `fecha_baja=hoy`). Fuente: inventario 01 § Overlay Ficha del jugador.
- Todos los literales en euskera y castellano, euskera por defecto (G-C5). Mobile-first (`project.md` § Frontend).

## Cálculo de porcentaje (backend y frontend)

- numerador = filas `registro_asistencia` con `estado = "P"` del miembro.
- denominador = `sesion` con `eliminada = false`, `fecha >= miembro.fecha_incorporacion`, y (`miembro.fecha_baja IS NULL` o `fecha <= miembro.fecha_baja`).
- resultado = `round(numerador / denominador * 100, 1 decimal)` (G-C9).
- si denominador = 0 → mostrar `"--"`.
- Fuente: `98-modelo-datos.md` línea 116 (regla de cómputo G-A4/G-C9/D2); inventario 01 § Reglas de cálculo (coincide, salvo que el mockup no aplicaba `fecha_incorporacion`/`fecha_baja` — regla superada por G-A4, "la regla implícita de debut de los mockups desaparece").

## Capabilities

### New Capabilities
- `asistencia-jugadores`: registro y consulta de asistencia P/A para jugadores de Eskola/F7 (sesiones, registros, fichas de jugador, fotos, generación automática de calendario), backend + frontend, scope por rol heredado de `catalogo-equipos`.

### Modified Capabilities
- `catalogo-equipos`: el requirement "Página de detalle de equipo con pestaña Plantilla" restringía explícitamente la barra de pestañas a solo "Plantilla" ("las pestañas de Asistencia y Minutaje NO SHALL añadirse en este change"). Este change añade la pestaña "Asistencia" — se actualiza ese requirement para permitirla.

## Impact

- **apps/api**: nuevo módulo de asistencia (`sesiones`, `registros`, `fichas`, `fotos`, generación de calendario); nueva dependencia de almacenamiento de objetos (S3-compatible, autoalojado — vendor-agnostic por `project.md` § Infraestructura) y de una librería de redimensionado de imágenes; nuevas variables de entorno para la configuración del storage (a definir en `design.md`).
- **apps/web**: nueva pestaña "Asistencia" en el detalle de equipo; nuevos componentes de tabla de asistencia, overlay de nota, overlay de ficha del jugador, modal de alta de jugador, exportación CSV.
- **BD**: ningún cambio de schema — usa `sesion`, `registro_asistencia`, `miembro_equipo`, `persona` ya migrados en `add-data-model`.
- **docker-compose**: nuevo servicio de almacenamiento de objetos para desarrollo local (a definir en `design.md`).
- **Fuera de alcance** (explícito): asistencia F11 (10 estados, `add-asistencias-f11`), minutaje (`add-minutaje`), asistencia de entrenadores (`add-asistencia-entrenadores`), panel de estado (`add-panel-estado`), notificaciones (`add-notificaciones`).

## Open Questions

Ninguna pendiente: la única duda real detectada (generación automática de sesiones desde la regla semanal, sin change previo que la cubriera) se resuelve incluyéndola en este change, según lo confirmado antes de redactar este proposal.
