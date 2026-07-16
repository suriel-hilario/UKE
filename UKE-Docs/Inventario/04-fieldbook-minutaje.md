# Aplicación: FieldBook — Seguimiento de minutos en partidos (F11 / F7)
**Fuente:** `UKE_SEGUIMIENTO_Minutos_Final.html` (versión F11/general) y `UKE_SEGUIMIENTO_F7-1.html` (versión F7)
**Estado: VALIDADO por Suriel, 10/07/2026**

> **Hallazgo estructural:** ambos HTML son **la misma aplicación** con configuración distinta y algunas mejoras solo presentes en la versión F7 (que parece la más reciente). Especificar como UNA capability "seguimiento de minutaje" parametrizada, incorporando las mejoras de F7 como comportamiento general.

## Diferencias entre las dos versiones
| Aspecto | Minutos_Final (F11/general) | SEGUIMIENTO_F7-1 |
|---|---|---|
| Equipos semilla | Gaztetxoak A/B (2×35'), Kadeteak A/B (2×40'), Gazteak A/B (2×45'), UKE Senior (2×45', roster real de 22 jugadores) | Benjaminak 2018 Berdea/Gorria (3×17'), Benjaminak 2017 B/G (3×17'), Alevines 2016 B/G (3×20'), Alevines 2015 (3×20'), 14 jugadores por equipo |
| Duración de partido | `halfMinutes × 2` (2 tiempos) | `halfMinutes × 3` (3 tiempos) — F7 juega a 3 períodos |
| Roles | director, coach | director, **coordinator** (acceso total, como director), coach |
| Login | Usuario (texto) + contraseña | **Pills de selección de usuario** (nombre + rol + equipo) + contraseña |
| Estado "TRAB" | 💼 Trabajo | Renombrado a **💼 No Just. (NJ)** |
| Edición de plantilla | Solo en pantalla Config | Además botón "✏ EDITAR PLANTILLA" en la vista de entrenador (solo director/coordinador) y edición de nombre inline vía modal |
| Logout | Con confirm | Directo (botón "↩ SALIR" explícito) |
| Layout fila jugador | Nombre y pills en una línea | Grid 2 filas (nombre arriba, pills debajo) + botón 📊 junto al nombre |

## Conceptos y reglas comunes
- **Entidad central: Jornada** (partido). Campos: nº jornada (1-40), rival, fecha, campo (Local/Visitante · Etxean/Kanpoan), goles nuestros, goles rival, y por jugador: convocado, jugado, titular, lesionado, sancionado, enfermo, vacaciones, trabajo/NJ, minutos, goles.
- **Pills de estado por jugador** (en el registro de jornada): CONV, JUG, TIT, LES, SAN, ENF, VAC, TRAB/NJ. Reglas de exclusividad observadas:
  - LES/SAN/ENF/VAC/TRAB son mutuamente excluyentes entre sí; al marcar una se desmarcan las demás y también CONV/JUG/TIT.
  - Marcar JUG activa CONV automáticamente.
  - Marcar TIT activa CONV y JUG y, si el campo minutos está vacío, lo rellena con la duración completa del partido.
- **Duración del partido:** configurable por equipo (`halfMinutes`); minutos máx. por jugador = duración total + margen (+30 en v2 tiempos, +10 en v3 tiempos). Presets de minutos: 1 tiempo / partido completo (y en F7 también 3 tiempos).
- **Métricas acumuladas por jugador** (getPlayerAccum), calculadas **desde el debut** (primera jornada con cualquier registro):
  - `jornadasDesdeDebut`; jornadas con baja (les/san/enf/vac/trab) no cuentan como disponibles; disponible y no convocado = **decisión técnica (decTec)**.
  - **% TOTAL** = minutos / (jornadasDesdeDebut × duración) — incluye bajas y no convocados.
  - **% CONV** = minutos / (jornadas convocado × duración).
  - **% DISP ▲** = minutos / (jornadas disponible × duración) — **indicador principal**.
- **Alertas de participación:** con ≥2 jornadas disponibles: % DISP <50% → rojo "⚠️ Participación baja — revisar / Parte-hartze txikia — berrikusi"; 50–70% → ámbar "👁 Participación media — vigilar / Parte-hartze ertaina — zaindu"; ≥70% verde.
- **Colores de %:** ≥70 verde, ≥50 ámbar, <50 rojo.
- **Idiomas:** ES por defecto, EU conmutable.
- **Persistencia mockup:** localStorage con versionado y **migración desde claves anteriores** (v1…v5); fotos de jugador en claves independientes. Reset total desde el panel de credenciales del login ("🔄 RESETEAR Y VOLVER AL INICIO", borra jornadas, equipos y usuarios).

## Roles y control de acceso observado
- `coach`: solo pantalla Entrenador y solo su equipo (selector de equipo bloqueado).
- `director` (y `coordinator` en F7): las tres pantallas, todos los equipos; punto de sesión de color por rol (verde/azul/rojo).
- Guard explícito en `showScreen`: un coach no puede acceder a dash/config.

---

## Pantalla 1: Login
- Tarjeta con escudo SVG del club + "Urretxindorra / Kirol Elkartea · FieldBook", título "Acceso al sistema".
- v. general: inputs Usuario + Contraseña. v. F7: **pills de usuario** ("Selecciona tu usuario": nombre, rol y equipo abreviado; click selecciona y pasa el foco a contraseña) + contraseña.
- Error: "Usuario o contraseña incorrectos" (se autooculta a los 3 s, limpia y enfoca contraseña).
- "¿No recuerdas el acceso?" → panel con lista de usuarios en claro + botón de **reset total** con advertencia "⚠️ Borra TODOS los datos: jornadas, equipos y usuarios".
- Sesión persistida (solo username) y restaurada al recargar.

---

## Pantalla 2: ⚽ Entrenador — Registro de Jornada
**Ruta de llegada:** tras login (pantalla por defecto para todos los roles).

### Cabecera de la app (topbar)
Logo + "Urretxindorra KE / FieldBook 25/26" (F7: "F7 FieldBook 25/26"), selector global de equipo (solo director/coord), toggle de modo (⚽ Entrenador / 📊 Director / ⚙️; los dos últimos solo director/coord), badge de sesión + salir, toggle ES/EU.

### Formulario de jornada
| Campo | Tipo | Valores/validación |
|---|---|---|
| Jornada nº | number | min 1, max 40, default 1 |
| Rival | text | placeholder "Nombre rival / Aurkariaren izena" |
| Fecha | date | — |
| Campo | select | Local / Visitante (Etxean / Kanpoan) |
| Goles nuestros | number | min 0 |
| Goles rival | number | min 0 |

Badge informativo de duración: "2×45 min · duración del partido" (F7: "3×17 min (51 min)").

### Lista de jugadores
- Fila por jugador: nº, nombre (click → ficha con estadísticas; subrayado punteado), pills CONV/JUG/TIT/LES/SAN/ENF/VAC/TRAB(NJ).
- Panel expandible por jugador con sus estadísticas acumuladas: contadores (Jornadas, Conv, Jugados, Titular, Minutos, ⚽ Goles + bajas si >0) y las 3 barras TOTAL / CONV / DISP ▲ con tooltip explicando la fórmula; alerta de participación si procede. Si no hay jornadas: "Sin jornadas registradas aún".
- Fila de minutos: input Minutos + presets (1 tiempo / total; F7 también 3 tiempos), input ⚽ Goles.
- Contador de cabecera: "N conv · M jugados".
- Botones "+ AÑADIR JUGADOR" y "— ELIMINAR JUGADOR" (alta/baja rápida en la plantilla del equipo).
- (F7, solo director/coord) botón "✏ EDITAR PLANTILLA" → modal de plantilla; edición del nombre vía modal "EDITAR JUGADOR" (input obligatorio, "Guardar nombre"/"Cancelar").
- Botón "💾 GUARDAR JORNADA": persiste la jornada (indexada por nº de jornada; guardar el mismo nº sobreescribe).

### Historial de jornadas
- "HISTORIAL DE JORNADAS · N registradas", tarjetas por jornada (más reciente primero) con resultado V/E/D coloreado, rival, fecha, y expandible al detalle. Vacío: "Sin jornadas registradas aún / Aún no hay jornadas guardadas".

---

## Pantalla 3: 📊 Director — Dashboard de participación
**Ruta de llegada:** botón "📊 Director" (solo director/coord).

- Pestañas de equipo ("📋 Selecciona equipo").
- Tira de KPIs del equipo.
- "CONTROL DE PARTICIPACIÓN" + info de duración ("Partidos de 2×45' · 90' totales" / "3×17' · 51' totales").
- Leyenda: TOTAL (min/partidos desde debut, incluye LES·SAN·NC), CONV, DISP ▲ (indicador principal), <50% DISP → Intervenir, 50–70% → Vigilar.
- Panel de alertas (jugadores en rojo/ámbar).
- Tabla de participación por jugador (las 3 métricas).
- "DETALLE POR JORNADA": navegación ‹ Jornada N › con rival, toggle de vista ☰ Tabla / ⊞ Fichas, pills resumen de la jornada.

---

## Pantalla 4: ⚙️ Configuración (solo director/coord)
- **👤 Usuarios y perfiles de acceso:** lista con avatar coloreado por rol, nombre, "@username · equipo/acceso total", pill de rol (Director/Koordinatzailea/Entrenador), edición vía modal (usuario, contraseña, nombre, rol, equipo asignado — oculto para director/coordinator); "+ Nuevo usuario".
- **⚙️ Gestión de equipos:** lista con "2×35' · N jugadores · M jornadas", edición (nombre, duración del tiempo con opciones por categoría: 25/30/35/40/45 min en v2 tiempos; 17/20/25/30 en v3), botón "Plantilla"; "+ Nuevo equipo".
- **👥 Plantilla:** editor de jugadores del equipo seleccionado ("Pulsa 'Plantilla' en el equipo de arriba…").

## Dudas / Open Questions
- **Convivencia con el mockup 03 (Asistencias F11):** ambos gestionan equipos/usuarios/jugadores por separado y con nomenclaturas distintas. En la app real debe existir UNA gestión central (backoffice) de la que ambos módulos leen. Ver `99-gaps.md` (G3). Si, una gestion central.
- El rol `coordinator` de F7 tiene acceso total de escritura; el docx lo define como solo lectura por categoría. Ver `99-gaps.md` (G1). Acceso total de escritura.
- ¿La versión de 3 tiempos aplica a todo F7/Eskola y la de 2 tiempos a F11? Confirmar la parametrización (nº de períodos por categoría/equipo). Si, f7/eskola 3 tiempos y F11 2.
- "TRAB" vs "NJ": la versión F7 renombra Trabajo→No Justificado. ¿Cuál es la taxonomía final de ausencias en minutaje, y debe alinearse con la de asistencias F11 (VA/LS/EN/TR/EX/OT/NJ)? Hoy no coinciden. Alinear ambas.
- ¿Editar una jornada ya guardada debe ser libre (hoy: guardar el mismo nº sobreescribe sin aviso) o requiere confirmación/permiso? Requiere permisos.
- ¿El resultado (goles) alimenta alguna clasificación o es solo informativo? Solo informativo.
