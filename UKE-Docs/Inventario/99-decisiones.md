# Decisiones de producto — UKE App
**Sustituye a `99-gaps.md`. Todas las decisiones están CERRADAS.**
**Estado: VALIDADO por Suriel, 10/07/2026**

Regla de uso: este fichero es fuente de verdad al mismo nivel que `00-especificaciones-cliente.md`. Cuando una decisión de aquí contradice al docx o a un mockup, **manda este fichero**. Todo `opsx-propose` que toque un área con decisión debe citarla (`99-decisiones.md § G-XX`).

## A. Requisitos del docx sin mockup — todos se implementan

| # | Decisión |
|---|---|
| G-A1 | **DECIDIDO:** Existe rol `admin` separado de `director`. Admin = backoffice: gestión de usuarios, roles, equipos, temporadas, bloques, festivos e import de jugadores. No usa los módulos deportivos. |
| G-A2 | **DECIDIDO:** Import de jugadores desde Excel (`.xlsx` y `.xls`), solo rol admin, con vista previa y validación antes de confirmar la carga. |
| G-A3 | **DECIDIDO:** Bloques Pretemporada y Temporada independientes para F7 y F11; Eskola tiene bloque único. Fechas de activación de cada bloque configurables por admin. Todo registro (asistencia y minutaje) pertenece a un bloque; los % se calculan por bloque. |
| G-A4 | **DECIDIDO:** Campo explícito y obligatorio `fecha_incorporacion` por persona y equipo. Es la fecha de referencia del cómputo de %: las sesiones/jornadas anteriores a ella no entran en el denominador. La regla implícita de "debut" de los mockups desaparece. |
| G-A5 | **DECIDIDO:** Notificaciones por **email únicamente** (sin push en v1). Frecuencias según docx: aviso el día de entrenamiento (registrar asistencia), aviso el día de partido (registrar minutaje), recordatorio semanal general. Individualizadas por equipo; un entrenador con N equipos recibe avisos separados por equipo. |
| G-A6 | **DECIDIDO:** Panel de estado de actualización para director y coordinadores. "Actualizado" = existe registro para toda sesión/jornada con fecha ≤ hoy dentro del bloque activo. Semáforo por equipo y por tipo (asistencia / minutaje): verde = al día, rojo = entradas pendientes. |
| G-A7 | **DECIDIDO:** Al cerrar una temporada, todos sus datos pasan a solo lectura (histórico). Accesible para admin y director. Ninguna edición posible sobre temporadas cerradas. |
| G-A8 | **DECIDIDO:** Relación N:M usuario ↔ equipo. Un entrenador puede tener varios equipos. |
| G-A9 | **DECIDIDO:** Una única aplicación. Navegación: Categoría (Eskola / F7 / F11) → Equipo → Módulo (Asistencia jugadores / Minutaje / Asistencia entrenadores). El acceso visible se filtra por rol y vínculos del usuario. |

## B. Conflictos mockup ↔ docx

| # | Decisión |
|---|---|
| G-B1 | **DECIDIDO — manda el mockup, con ámbitos precisados:** matriz de permisos definitiva: |

### Matriz de permisos (G-B1)
| Rol | Ámbito | Módulos deportivos (asistencia, minutaje) | Catálogo (equipos, personas, calendarios) | Backoffice (usuarios, roles, temporadas, import) |
|---|---|---|---|---|
| `admin` | Global | — | Lectura/Escritura | Lectura/Escritura |
| `director` | Global (todas las categorías) | Lectura/**Escritura** | Lectura/**Escritura** | — |
| `coordinador` | Su categoría (Eskola, F7 o F11) | Lectura/**Escritura** solo en su categoría | Lectura/**Escritura** solo en su categoría | — |
| `entrenador` | Sus equipos (N:M) | Lectura/Escritura solo en sus equipos | Lectura; escritura limitada a la plantilla de sus equipos (altas/ediciones de jugadores) | — |

| # | Decisión |
|---|---|
| G-B2 | **DECIDIDO:** Autenticación exclusivamente vía Auth0 (login universal, MFA por política, reset de contraseña estándar de Auth0). El flujo del mockup (credenciales en claro, contraseñas editables) NO se especifica nunca. Alta de usuarios solo desde backoffice vía Auth0 Management API; autoregistro desactivado. |
| G-B3 | **DECIDIDO — manda el mockup:** los registros de asistencia y minutaje son editables en cualquier momento (incluye quitar días y sobrescribir jornadas) mientras la temporada esté abierta. El "registro el mismo día" del docx NO es una restricción técnica: es una expectativa operativa vigilada por el panel de estado (G-A6) y las notificaciones (G-A5). Las specs no deben inventar bloqueos temporales de edición. |

## C. Unificaciones entre mockups

| # | Decisión |
|---|---|
| G-C1 | **DECIDIDO:** Catálogo único de temporadas, equipos, personas y usuarios, gestionado en backoffice/catálogo según la matriz G-B1. Los módulos deportivos lo consumen; ningún módulo tiene su propia gestión paralela. |
| G-C2 | **DECIDIDO:** Cada módulo mantiene la taxonomía de su mockup: (a) Asistencia de jugadores Eskola/F7 y asistencia de entrenadores: P/A + sin marcar. (b) Asistencias F11: los 10 estados (1, EM, RC, VA, LS, EN, TR, EX, OT, NJ; computan como asistencia 1/EM/RC). (c) Minutaje: pills CONV/JUG/TIT + bajas LES/SAN/ENF/VAC/**NJ** (versión F7, "NJ" sustituye a "TRAB") + decisión técnica derivada. No se unifican entre módulos. |
| G-C3 | **DECIDIDO:** Umbrales de color por métrica, tal como están en cada mockup: asistencia Eskola/F7/entrenadores ≥80 verde, ≥60 ámbar, <60 rojo; asistencias F11 ≥85/≥60/>0; minutaje (%DISP) ≥70 verde, ≥50 ámbar, <50 rojo, y alerta con <50 = "Intervenir", 50–70 = "Vigilar" (mínimo 2 jornadas disponibles). |
| G-C4 | **DECIDIDO:** Entidad `Temporada` configurable (nombre, fechas, estado abierta/cerrada). Los años concretos de los mockups eran datos semilla. |
| G-C5 | **DECIDIDO:** Idioma = preferencia por usuario (persistida). Default de la instancia: **euskera**. Todos los literales existen en EU y ES. |
| G-C6 | **DECIDIDO:** Formato canónico de nombre de equipo: `<Categoría de edad> <Año> <Color/Nombre>` (p.ej. "Benjaminak 2018 Berdea"). Los nombres son editables en catálogo; el formato es convención de semilla, no restricción. |
| G-C7 | **DECIDIDO:** Días de entrenamiento configurables por equipo (regla semanal). La divergencia Ma/Ju vs Ma/Ju/Sá entre mockups F7 era un error; la semilla real la da el club por equipo. |
| G-C8 | **DECIDIDO:** Modelo de calendario combinado: regla generadora semanal por equipo + festivos por temporada + excepciones puntuales (añadir sesión fuera de regla / quitar sesión generada) + tipo por sesión (E entrenamiento / P partido). |
| G-C9 | **DECIDIDO:** Todos los porcentajes de la aplicación se calculan y muestran con **1 decimal**. |
| G-C10 | **DECIDIDO:** Eliminado `UKE_Asistencias_F11_FINAL-1.html` del repo (duplicado byte a byte). |
| G-C11 | **DECIDIDO:** Festivos = tabla configurable por temporada (gestión en backoffice). La lista hardcodeada de los mockups es semilla de la temporada inicial. |

## D. Decisiones técnicas (contexto)
- Auth0 + MFA, sin autoregistro; usuarios creados desde backoffice vía Management API (resuelve G-B2 por diseño).
- Roles (`admin`, `director`, `coordinador`, `entrenador`) como roles de Auth0 inyectados en el JWT vía Action; el ámbito (categoría del coordinador, equipos del entrenador) vive en la BD propia y se resuelve en el backend.
- Fotos de persona en almacenamiento de objetos propio (no dataURLs en BD).
- PWA responsive mobile-first; sin apps nativas.
