# Aplicación: Asistencias F11 (con tipos de ausencia y configuración)
**Fuente:** `UKE_Asistencias_F11_FINAL.html` (⚠️ `UKE_Asistencias_F11_FINAL-1.html` es una copia byte a byte idéntica — usar solo una)
**Estado: VALIDADO por Suriel, 10/07/2026**

## Propósito
Registro de asistencia a sesiones (entrenamientos y partidos) para los equipos F11, con **estados de ausencia justificada tipificados**, tres grupos de personas por equipo (con ficha / sin ficha / entrenadores), ficha de jugador con evolución anual, y una **pantalla de configuración para el director** (usuarios, equipos, calendario de sesiones).

Es el mockup funcionalmente más rico de los seis: su modelo de estados y su pantalla de configuración deberían ser la referencia para la app final.

## Constantes observadas
- **Temporada:** "2026-27", meses Septiembre a Mayo. ⚠️ Las otras apps dicen 2025-26 — ver `99-gaps.md` (G8).
- **Equipos (TEAMS_META):** Gaztetxoak A (patrón L M X V), Gaztetxoak B (M J), Kadeteak A/B (L X V), Gazteak A/B (L X V), UKE Senior (L X V, icono 🏆). El "patrón" es solo informativo; las sesiones son una lista explícita por mes con `num`, `dia` y `tipo` (E=Entrenamiento 🏃 / P=Partido ⚽).
- **Grupos de personas por equipo:** `con_ficha`, `sin_ficha`, `entrenadores`. Cada persona: nombre (se guarda en MAYÚSCULAS), alias, foto opcional, array de presencia por sesión.
- **Estados de celda (10 + vacío):**

| Código | ES | EU | ¿Cuenta como asistencia? |
|---|---|---|---|
| 1 | Asiste | Bertaratua | ✅ Sí |
| EM | Al margen | Bazterrean | ✅ Sí |
| RC | Recupera | Berreskuratzen | ✅ Sí |
| VA | Vacaciones | Oporrak | No |
| LS | Lesión | Lesioa | No |
| EN | Enfermo | Gaixo | No |
| TR | Trabajo | Lana | No |
| EX | Estudio | Ikasketa | No |
| OT | Otros | Beste | No |
| NJ | No justif | Justif. gabe | No |
| (vacío) | Sin marcar | Markatu gabe | No entra en denominador antes del debut |

- **Umbrales de color:** ≥85% verde, ≥60% ámbar, >0% rojo, 0/sin datos gris ("--").
- **Regla de "debut" (clave):** el % de un jugador se calcula desde su **primera sesión con marca** hasta la última con marca; las sesiones anteriores al debut no penalizan. Además cada mes tiene `huecos` (índices de sesión excluidos del cómputo). Esta regla es la aproximación del mockup al requisito del docx "fecha de incorporación individual" (punto 3).
- **% con 2 decimales** (`Math.round(x*10000)/100`), a diferencia del resto de apps (enteros).
- **Idiomas:** ES por defecto (⚠️ las otras apps arrancan en EU), EU conmutable.
- **Persistencia mockup:** los datos viven en memoria (TEAMS_DATA en el propio HTML); solo la sesión de login (`uke_asist_v7`) y las fotos (`uke_fotos_v3`) usan localStorage. Reloj en topbar (hh:mm:ss).

## Roles y usuarios semilla
- `director` (director / uke2526): ve pestañas de todos los equipos + botón ⚙️ configuración.
- `coach` (uno por equipo, p.ej. gaztetxoak_a / gaz_a25): ve solo su equipo, sin pestañas ni configuración.
- La sesión persiste (localStorage) y se restaura al recargar.

---

## Pantalla 1: Login
- Campos: Usuario (texto, lowercased al validar), Contraseña. Enter en usuario → foco a contraseña; Enter en contraseña → login.
- Botón "Entrar". Error: "Usuario o contraseña incorrectos / Erabiltzailea edo pasahitza okerrak" (limpia la contraseña).
- "¿No recuerdas el acceso?" despliega la lista completa de credenciales en claro (mismo problema de seguridad que las otras apps).
- Subtítulo "Temporada 2026-27 · Acceso restringido".

---

## Pantalla 2: Tabla de asistencia (modo ⚽ Entrenador)
**Ruta de llegada:** tras login. Es la pantalla principal para ambos roles.

### Estructura
- Topbar: logo, título, reloj, switch ES/EU, mode-strip (⚽ Entrenador siempre; ⚙️ solo director), badge de sesión (nombre + "Salir", click → logout).
- (Solo director) barra de pestañas "📋 Selecciona equipo" con un tab por equipo.
- Barra de mes: botones Sep…May + acciones "+ Sesión", "+ Jugador", "Exportar CSV".
- Barra de estadísticas del mes: Equipo, Mes, Sesiones, Total temp. (sesiones acumuladas del año), nº Con Ficha, nº Sin Ficha, Asistencias (total de marcas que computan), Media general %, Media ficha %.
- Leyenda de los 11 estados + textos "Clic celda →" y "Clic nombre = ficha".
- Tabla.

### Tabla
| Columna | Contenido |
|---|---|
| % AÑO | % acumulado del jugador desde su debut (pill coloreada) |
| % MES | % del mes (pill) |
| JUGADOR | Miniatura foto/inicial + nombre (botón → panel de ficha) |
| ALIAS | (columna presente pero vacía en el render actual) ⚠️ Open Question |
| Una columna por sesión | Cabecera: nº de sesión (o ⚽ si es partido, con fondo azul) + día del mes + botón "✓" (marcar todos); celda: botón con el código de estado |
| TOT | Total de asistencias del jugador |
| 1, EM, RC, LS, EN, TR, EX, VA, OT, NJ | Contadores por tipo de estado |

Secciones de filas: "Con Ficha (N)" → jugadores → fila Total → fila Media mensual; ídem "Sin Ficha (N)" y "Entrenadores (N)"; al final "Total General" con Total y Media.

### Acciones
| Acción | Qué hace |
|---|---|
| Click en celda | Abre **menú contextual "MARCAR SESIÓN"** con los 11 estados (el actual marcado ✓); elegir uno asigna el valor y rerenderiza |
| ✓ en cabecera de sesión | Marca "1" a todos los no-asistentes de esa sesión en los 3 grupos ("Todos marcados / Guztiak markatuta") |
| Click en nombre | Abre panel lateral de ficha del jugador |
| + Sesión | Modal: Mes (select), Día (number 1-31), Num sesión (opcional, autoincrementa), Tipo (🏃 Entrenamiento / ⚽ Partido). Valida día 1-31 y que no exista ya ese día en el mes. Inserta ordenada por día y añade celda vacía a todas las personas |
| + Jugador | Modal: Nombre (obligatorio, se guarda en MAYÚSCULAS), Alias, Categoría (Con Ficha / Sin Ficha / Entrenador). Añade la persona a **todos los meses** con presencia vacía |
| Exportar CSV | CSV de TODA la temporada del equipo (separador `;`, BOM UTF-8): por mes, cabeceras SECCION;JUGADOR;ALIAS;%ANO;%MES;S<num>d<dia>…;TOT;EM;RC;LS;EN;TR;EX;VA;OT;NJ. Fichero `Asistencias_<equipo>_26-27.csv` |
| Arrastrar fila (drag & drop; en móvil, pulsación larga 600 ms + arrastre) | Reordena al jugador dentro de su grupo, en todos los meses. Toast en móvil: "Arrastra a la posición deseada" |
| (Director) click en pestaña de equipo | Cambia de equipo y resetea al primer mes |

### Panel lateral: Ficha del jugador
- Cabecera: avatar clicable (label → input file; la imagen se reescala a máx. 200px, JPEG 0.85) con overlay 📷, nombre, grupo · equipo, botón ✕ cerrar.
- 3 tarjetas: % Temporada, % del mes actual, sesiones jugadas/total (a/d).
- Barra de acciones: "✏ Editar Jugador", "🗑 Quitar foto" (si tiene), "🗑 Eliminar".
- "Resumen temporada": tarjetas con contadores por estado (solo los >0).
- "Evolución mensual": por mes, barra de % coloreada + fila de puntos con el estado de cada sesión.

### Modal: Editar Jugador
- Nombre (obligatorio, MAYÚSCULAS), Alias, Categoría (select con los 3 grupos; cambiar de categoría mueve a la persona de grupo **en todos los meses**).
- Botones: Cancelar / Eliminar (confirm "¿Eliminar este jugador de todos los meses?") / Guardar. Renombrar migra también la foto.

---

## Pantalla 3: Configuración (solo director, botón ⚙️)
### Tarjeta 👤 Usuarios y accesos
- Lista: icono 👑 (director) / 🎽 (coach), nombre visible, "usuario / contraseña · teamId", botón "✏ Editar".
- Modal Editar Acceso: Usuario, Contraseña, Nombre visible, Equipo asignado (select, oculto si director).
- "+ Nuevo usuario" → modal: Usuario, Contraseña, Nombre visible, Rol (Entrenador/Director), Equipo asignado (solo coach). Valida unicidad del usuario.

### Tarjeta ⚽ Equipos
- Lista: icono, nombre, "categoría · id", "✏ Editar" (modal: Nombre obligatorio, Categoría, Icono emoji).
- "+ Nuevo equipo" → modal: Nombre, Categoría, Icono, **ID único** (obligatorio, se sanea a `[a-z0-9_]`, valida no duplicado). Crea el equipo con los 9 meses vacíos.

### Tarjeta 📅 Calendario de sesiones
- Select de equipo + select de mes → chips de sesiones del mes (S<num> o ⚽ + día, con botón × eliminar). Eliminar una sesión borra también la columna de presencia de todas las personas.
- "+ Añadir sesión / partido" reutiliza el modal de Nueva Sesión.

## Dudas / Open Questions
- La columna ALIAS existe en cabecera y en el alta/edición, pero **el render de fila la deja vacía**. ¿Se muestra el alias en algún sitio o es vestigial? Es vestigial
- No hay botón para **eliminar** usuarios ni equipos desde configuración (solo crear/editar); existe el literal `confirmDelT` ("¿Eliminar este equipo…?") sin botón asociado. ¿Se requiere borrado?. Si, pero sera borrado logico.
- La regla de debut, ¿satisface el punto 3 del docx o el club quiere una **fecha de incorporación explícita** por jugador (campo obligatorio, como pide el docx)? Recomendación: campo explícito. Si, campo explicitio.
- ¿Los "entrenadores" de este grupo son los mismos entrenadores-usuarios del sistema? En el mockup son personas sin vínculo con los usuarios. Son usuarios del sistema.
- ¿Qué significa exactamente "huecos" a nivel de negocio? (sesiones excluidas del cómputo para todo el equipo; en la semilla siempre está vacío). Si, tomemos como sesiones excluidas.
- Los partidos aquí solo marcan asistencia; el minutaje vive en la app FieldBook. Confirmar que F11 necesita ambas cosas y cómo se integran (¿una sesión tipo P enlaza con una jornada de FieldBook?). Si, enlazamos sesion con jornada.
