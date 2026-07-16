# Modelo de datos — UKE App
**Derivado de:** inventarios 01–04 (VALIDADOS) + `99-decisiones.md`
**Estado: VALIDADO por Suriel, 14/07/2026. Este fichero es el input del change `add-data-model`.**

Notación: `PK` clave primaria (todas UUID salvo indicación), `FK` clave foránea, `UQ` único, `?` opcional. Trazabilidad entre paréntesis.

## Decisiones de diseño cerradas (D1–D3)
- **D1 — Asistencia en una sola tabla:** `registro_asistencia` es única para todos los módulos. El campo `estado` es text con CHECK dependiente de la categoría del equipo (Eskola/F7 y entrenadores: `P`/`A`; F11: los 10 estados de G-C2). No se crean tablas separadas por módulo.
- **D2 — Baja de miembro:** `miembro_equipo` incorpora `fecha_baja?`. Un miembro con `fecha_baja` no computa en denominadores ni en el panel de estado (G-A6) para sesiones/jornadas con `fecha > fecha_baja`, y deja de mostrarse en las plantillas activas. Su histórico se conserva.
- **D3 — Vínculo persona↔usuario:** `persona` incorpora `usuario_id?` (FK usuario, UQ). Se usa para los entrenadores que además son usuarios del sistema (comparte nombre/foto y permite futuros avisos personalizados). Opcional: los jugadores y los entrenadores sin acceso no lo tienen.

## 1. Catálogo y organización

### temporada (G-C4, G-A7)
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| nombre | text UQ | p.ej. "2026-27" |
| fecha_inicio / fecha_fin | date | |
| estado | enum `abierta` \| `cerrada` | cerrada ⇒ todos sus datos en solo lectura (G-A7) |

### bloque (G-A3)
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| temporada_id | FK temporada | |
| tipo | enum `pretemporada` \| `temporada` \| `unico` | `unico` para Eskola |
| fecha_activacion | date | configurable por admin |
| UQ (temporada_id, tipo) | | |

### categoria
Catálogo fijo: `eskola`, `f7`, `f11` (00-especificaciones § 1). Enum o tabla de referencia; define el ámbito de los coordinadores (G-B1) y qué módulos aplican (minutaje y bloques dobles: solo f7/f11 — G-A3; asistencia de entrenadores: según catálogo, hoy solo f7 — inventario 02).

### equipo (inv. 01/03/04; G-C1, G-C6, G-C7)
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| temporada_id | FK temporada | los equipos son por temporada (G-A7: el histórico congela su estructura) |
| categoria | FK/enum categoria | |
| nombre | text | formato canónico G-C6 |
| color | text? | verde/rojo/azul en mockups 01-02; libre |
| icono | text? | emoji (inv. 03) |
| minutos_por_periodo | int | `halfMinutes` (inv. 04) |
| num_periodos | int | 2 (F11/Senior) o 3 (F7) — inv. 04 |
| dias_entrenamiento | int[] | días de semana de la regla generadora (G-C7, G-C8) |

### festivo (G-C11)
temporada_id FK, fecha date, descripcion text?. UQ (temporada_id, fecha).

## 2. Personas y usuarios

### persona (inv. 01 §2, 03; G-A4)
Jugadores y entrenadores como personas del club.
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| usuario_id | FK usuario? UQ | D3: solo personas que además son usuarios (típicamente entrenadores) |
| nombre | text | F11 lo guarda en MAYÚSCULAS: decisión de UI, no de modelo |
| alias | text? | inv. 03 |
| foto_url | text? | objeto en storage propio (99-D) |

### miembro_equipo (inv. 03 grupos; G-A4)
Vincula persona↔equipo con su grupo y su fecha de incorporación.
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| equipo_id | FK equipo | |
| persona_id | FK persona | |
| grupo | enum `con_ficha` \| `sin_ficha` \| `entrenador` | inv. 03; en Eskola/F7 solo hay jugadores ⇒ `con_ficha` por defecto |
| rol_entrenador | text? | "Nagusia"/"Laguntzailea" (inv. 02) — solo si grupo=entrenador |
| fecha_incorporacion | date **NOT NULL** | **G-A4: obligatoria; referencia del cómputo de %** |
| fecha_baja | date? | D2: si existe, el miembro no computa tras esa fecha (denominadores, panel G-A6, plantillas activas). Histórico intacto |
| orden | int | orden manual de la plantilla (drag & drop, inv. 03) |
| UQ (equipo_id, persona_id) | | |

### usuario (G-B1, G-B2, G-A8)
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| auth0_id | text UQ | espejo de Auth0; sin contraseñas en BD propia (G-B2) |
| nombre_visible | text | |
| email | text UQ | destino de notificaciones (G-A5) |
| rol | enum `admin` \| `director` \| `coordinador` \| `entrenador` | también como claim en el JWT (99-D) |
| categoria_asignada | enum categoria? | solo coordinadores (G-B1) |
| idioma | enum `eu` \| `es` default `eu` | G-C5 |

### usuario_equipo (G-A8)
usuario_id FK, equipo_id FK — N:M, solo relevante para rol entrenador. UQ (usuario_id, equipo_id).

## 3. Calendario y asistencia

### sesion (G-C8; inv. 01/03)
Sesión materializada de un equipo (generada por regla o creada a mano).
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| equipo_id | FK equipo | |
| bloque_id | FK bloque | G-A3: todo registro cuelga de un bloque |
| fecha | date | |
| numero | int? | nº de sesión (inv. 03) |
| tipo | enum `entrenamiento` \| `partido` | E/P (inv. 03) |
| origen | enum `regla` \| `manual` | trazabilidad de G-C8 |
| eliminada | boolean default false | "quitar día" (inv. 01/02) = soft delete, editable en todo momento (G-B3) |
| UQ (equipo_id, fecha, tipo) | | inv. 03 valida día único por mes |

### registro_asistencia (inv. 01 §2, 02, 03; G-C2)
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| sesion_id | FK sesion | |
| miembro_equipo_id | FK miembro_equipo | cubre jugadores Y entrenadores (inv. 02 es el mismo mecanismo sobre grupo=entrenador) |
| estado | text + CHECK por categoría | D1, G-C2: Eskola/F7/entrenadores: `P`\|`A`. F11: `1`\|`EM`\|`RC`\|`VA`\|`LS`\|`EN`\|`TR`\|`EX`\|`OT`\|`NJ`. Ausencia de fila = sin marcar |
| nota | text? | nota por celda (inv. 01) |
| UQ (sesion_id, miembro_equipo_id) | | |

Regla de cómputo (G-A4, G-C9, D2): denominador de % de un miembro = sesiones no eliminadas del bloque con `fecha_incorporacion ≤ fecha` y, si existe `fecha_baja`, `fecha ≤ fecha_baja` (y `fecha ≤ hoy` para el panel G-A6); numerador = registros que computan (`P`; en F11: `1`/`EM`/`RC`). Resultado con 1 decimal.

## 4. Minutaje (inv. 04)

### jornada
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| equipo_id | FK equipo | |
| bloque_id | FK bloque | G-A3 |
| numero | int | 1–40; UQ (equipo_id, bloque_id, numero); re-guardar sobrescribe (G-B3) |
| rival | text? | |
| fecha | date? | |
| campo | enum `local` \| `visitante` | |
| goles_favor / goles_contra | int default 0 | |

### participacion_jornada
| Campo | Tipo | Notas |
|---|---|---|
| id | PK | |
| jornada_id | FK jornada | |
| miembro_equipo_id | FK miembro_equipo | |
| convocado / jugado / titular | boolean | reglas de implicación en UI (TIT⇒JUG⇒CONV, inv. 04) |
| baja | enum? `LES` \| `SAN` \| `ENF` \| `VAC` \| `NJ` | mutuamente excluyente con convocado (inv. 04, G-C2c); NULL = sin baja |
| minutos | int default 0 | máx. validado contra duración del partido del equipo |
| goles | int default 0 | |
| UQ (jornada_id, miembro_equipo_id) | | |

Métricas derivadas (inv. 04, G-A4, G-C9, D2), calculadas sobre jornadas del bloque con `fecha ≥ fecha_incorporacion` del miembro (y `≤ fecha_baja` si existe):
- jornada disponible = sin baja; disponible y no convocado ⇒ decisión técnica (derivado, no se almacena).
- `%TOTAL` = minutos / (jornadas × duración); `%CONV` = minutos / (convocado × duración); `%DISP` = minutos / (disponibles × duración) — indicador principal, umbrales 70/50 (G-C3), alertas con ≥2 jornadas disponibles.

## 5. Notificaciones y panel de estado

### notificacion_enviada (G-A5)
usuario_id FK, equipo_id FK, tipo enum `asistencia_dia` | `minutaje_dia` | `recordatorio_semanal`, fecha_envio timestamptz. Registro de idempotencia (no reenviar el mismo aviso el mismo día). Canal: email.

### Estado de actualización (G-A6) — derivado, no tabla
Por equipo y tipo: pendientes de asistencia = sesiones no eliminadas del bloque activo con fecha ≤ hoy sin registro completo de su plantilla activa (miembros con `fecha_incorporacion ≤ fecha` y sin `fecha_baja` anterior — D2); pendientes de minutaje = jornadas con fecha ≤ hoy sin participaciones. Semáforo verde (0 pendientes) / rojo (>0). Materializar solo si el rendimiento lo exige.