# Aplicación: Asistencias de jugadores (Eskola / F7)
**Fuente:** `UKE_Eskola_Asistentziak.html` y `UKE_F7_Asistentziak.html`
**Estado: VALIDADO por Suriel, 10/07/2026**

> **Hallazgo estructural:** los dos ficheros HTML son **la misma aplicación** (código idéntico salvo configuración). Difieren solo en: título (UKE ESKOLA / UKE F7), lista de equipos, días de entrenamiento, contraseña del director, un roster semilla y la clave de localStorage. Deben especificarse como **UNA capability "asistencia de jugadores" parametrizada por sección**, no como dos features distintas.

| Parámetro | Eskola | F7 |
|---|---|---|
| Equipos | 2019 Txinboak, 2019 Enarak, 2020 Txinboak, 2020 Enarak, 2021 Txinboak, 2021 Enarak | 2018 Berdea Benjaminak, 2018 Gorria Benjaminak, 2017 Berdea Benjaminak, 2017 Gorria Benjaminak, 2016 Berdea Kimuak, 2016 Gorria Kimuak, 2015 Kimuak |
| Días de entrenamiento | Lunes, Miércoles y Sábado (`dow 1,3,6`) | Martes y Jueves (`dow 2,4`) |
| Color de equipo | verde / rojo / azul (por equipo) | verde / rojo / azul (por equipo) |
| Usuarios por defecto | Director + 1 usuario por equipo | Director + 1 usuario por equipo |

## Constantes compartidas observadas
- **Temporada:** meses SEP-2026 a MAY-2027 (9 meses: Iraila/Septiembre … Maiatza/Mayo).
- **Festivos excluidos (hardcodeados):** 2026-09-14, 2026-10-12, 2026-11-01, 2026-12-06, 2026-12-08, 2026-12-25, 2027-01-01, 2027-01-06, 2027-04-03, 2027-04-06, 2027-05-01.
- **Estados de asistencia por jugador y sesión:** `""` (sin marcar, "·"), `"P"` (presente, "✓"), `"A"` (ausente, "✗"). Ciclo al hacer click: vacío → P → A → vacío.
- **Umbrales de color de porcentaje:** ≥80% verde (`ph`), ≥60% ámbar (`pm`), <60% rojo (`pl`).
- **Idiomas:** euskera (por defecto) y castellano, conmutables en login y dentro de la app. Todos los literales existen en ambos idiomas.
- **Persistencia del mockup:** localStorage (`uke_esc` / `ukef7_esc`). En producción será backend, usando la BD

## Roles observados
- `team` (entrenador de un equipo): ve solo su equipo.
- `director`: panel con todos los equipos + gestión de contraseñas.

---

## Pantalla 1: Login
**Ruta de llegada:** inicial.

### Elementos de datos
| Elemento | Tipo UI | Tipo dato | Obligatorio | Notas |
|---|---|---|---|---|
| Idioma | 2 botones pill (🇪🇺 Euskera / 🇪🇸 Castellano) | enum eu/es | — | Euskera activo por defecto |
| Usuario | select `#sel` | string | Sí | Opciones: "— Hautatu — / — Seleccionar —" + usuarios; el director lleva prefijo 🏆 |
| Pasahitza / Contraseña | input password | string | Sí | Enter dispara login |

### Acciones
| Acción | Qué hace | Navega a |
|---|---|---|
| SARTU / ENTRAR | Valida usuario+contraseña contra la lista de usuarios | Vista de equipo (rol team) o panel director (rol director) |
| 🔑 Pasahitza ahaztu? / ¿Olvidaste la contraseña? | Abre overlay con la **tabla de todos los usuarios y contraseñas en claro** | Overlay `ov-creds` |

### Validaciones visibles
- Sin usuario seleccionado: "❌ Hautatu erabiltzailea / Selecciona un usuario".
- Contraseña incorrecta: "❌ Pasahitza okerra / Contraseña incorrecta".

### Dudas / Open Questions
- El overlay "¿olvidaste la contraseña?" muestra TODAS las credenciales en claro a cualquier visitante. **Incompatible con Auth0 y con cualquier producto real.** ¿Cuál es el flujo de recuperación real deseado? (En producción: reset vía Auth0.)
- **[BUG del mockup F7]** La función `showCreds()` de F7 tiene un mapa de colores con los usuarios de Eskola (2019/2020/2021 Txinboak/Enarak) — resto de un copy/paste. Sin efecto funcional, pero confirma que ambos HTML derivan del mismo código.

---

## Pantalla 2: Vista de equipo (rol entrenador) — tabla de asistencias
**Ruta de llegada:** login con usuario de equipo, o (director) no aplica: el director tiene su propio panel.

### Estructura
- **Cabecera:** escudo, título (UKE ESKOLA / UKE F7), badge con nombre y color del equipo, botones EU/ES, botón CSV, botón "↩ Irten / Salir".
- **Sidebar:** lista de meses (Hilabeteak/Meses) con % mensual de asistencia junto a cada mes; lista de entrenadores del equipo (Entrenatzaileak/Entrenadores, solo lectura aquí).
- **Contenido:** título "MES AÑO", botones "+ Jokalaria / + Jugador", "✏ Editatu / Editar", "⬇ CSV"; tabla de asistencia.

### Tabla de asistencia (por mes seleccionado)
| Fila/Columna | Contenido |
|---|---|
| Cabecera | "Jokalaria/Jugador" + una columna por día de entrenamiento del mes (día de semana abreviado + número) + columna "%" |
| Fila "SAIOA % / SESIÓN %" | % de asistencia del equipo en cada sesión + % mensual total |
| Filas de jugador | Avatar (foto o iniciales sobre el color del equipo), nombre (click → ficha del jugador), un botón de asistencia por sesión, % mensual del jugador |
| Fila "TOTALA / TOTAL" | % mensual del equipo |

### Acciones
| Acción | Qué hace | Efecto en datos |
|---|---|---|
| Click en celda de asistencia | Cicla vacío → P → A → vacío | Actualiza asistencia, recalcula % de fila, sesión y mes |
| Click derecho (contextmenu) en celda | Abre overlay de **nota** para (jugador, sesión) | — |
| Click en nombre/avatar de jugador | Abre overlay **ficha del jugador** | — |
| + Jokalaria / + Jugador | Abre overlay alta de jugador (campo "Izena/Nombre", botones "✔ Gehitu/Añadir", "Utzi/Cancelar"; Enter confirma) | Añade jugador al final de la lista del equipo |
| ✏ Editatu / Editar (toggle) | Activa modo edición: aparece "✕" en cada cabecera de día (quitar día) y "✕" junto a cada jugador (eliminar). El botón pasa a "✔ Gorde/Guardar" | — |
| ✕ en cabecera de día (modo edición) | `confirm("Eguna kendu? / ¿Quitar este día?")` → marca el día como eliminado (removedDays); desaparece del calendario y de los cálculos | Toast "🗑 Eguna kenduta / Día eliminado" |
| ✕ junto a jugador (modo edición) | `confirm("Jokalaria ezabatu? / ¿Eliminar jugador?")` → elimina jugador y **reindexa** su asistencia en todos los meses | Toast "🗑 Ezabatuta / Eliminado" |
| ⬇ CSV | Descarga CSV del mes actual: columnas Jugador, una por fecha (ISO), % — fichero `UKE_<equipo>_<mes>.csv` | — |
| Selección de mes (sidebar) | Cambia mes activo y rerenderiza tabla | — |
| ↩ Irten / Salir | Cierra sesión, vuelve a login | — |

### Reglas de cálculo observadas
- % jugador/mes = presentes / sesiones del mes (excluidos festivos y días eliminados), redondeado.
- % sesión = presentes en esa sesión / nº jugadores del equipo.
- % mes de equipo = suma de presentes / (sesiones × jugadores).
- % total anual de jugador = suma sobre los 9 meses.
- Solo cuenta como asistencia el valor `P`; el valor vacío y `A` no suman.

### Overlay: Nota por jugador y sesión
- Título "📝 Oharra / Nota", subtítulo "<jugador> · <fecha ISO>", textarea 4 filas.
- Botones: "💾 Gorde / Guardar" y "🗑 Ezabatu / Eliminar" (borra la nota).
- Las celdas con nota muestran un punto ámbar en la esquina (clase `N`).

### Overlay: Ficha del jugador
- Avatar 64px (foto o iniciales) + botón 📷 para subir foto (input file `image/*`, se guarda como dataURL en el mockup).
- Nombre editable inline: input + botón "💾 Gorde / Guardar" (Enter confirma; feedback ✅ 1,5 s).
- Grid de 4 estadísticas de temporada: Total %, Presentziak/Presencias, Faltak/Faltas, Saioak/Sesiones.
- Tabla mensual: Hilabetea/Mes (con mini barra de progreso coloreada), Ses., Pres., %.
- Botón "🗑 Jokalaria ezabatu / Eliminar jugador" (con confirm).
- Si se abre desde el panel del director, añade botón "← Taldea / Volver al equipo".

---

## Pantalla 3: Panel de director
**Ruta de llegada:** login con usuario Director.

### Estructura
- Badge "🏆 Zuzendaria / Director".
- **📊 Panel de Control — Talde Guztiak / Todos los Equipos:** una tarjeta por equipo con: punto del color del equipo + nombre, nº de jugadores, Ø % medio anual (coloreado por umbral), lista de entrenadores. Click en tarjeta → overlay de detalle del equipo.
- **🔐 Erabiltzaileak eta Pasahitzak / Usuarios y Contraseñas:** tabla Usuario / Contraseña (input editable) / Rol + botón "💾 Aldaketak gorde / Guardar cambios".

### Overlay: Detalle de equipo (desde tarjeta)
- Sección Entrenatzaileak/Entrenadores: 2 inputs editables (persisten onchange).
- Sección Jokalariak/Jugadores (N): tabla #, Izena/Nombre (avatar + click → ficha del jugador con flag director), % Total anual, botón ✕ eliminar (con confirm).
- Alta rápida: input "Jokalari berria… / Nuevo jugador…" + botón "+ Gehitu / Añadir".

### Dudas / Open Questions
- **El director aquí EDITA (jugadores, entrenadores, contraseñas), pero el docx del cliente define Dirección Deportiva como SOLO LECTURA.** Contradicción registrada en `99-gaps.md` (G1) — decisión pendiente con el club. Decision G1 resuelta, el director puede EDITAR.
- La gestión de contraseñas en claro desaparece con Auth0; el equivalente será la gestión de usuarios del backoffice. La gestion de contraseñas las tiene que hacer Autho0, desde el backoffice se invocara a Auth0.
- Los "entrenadores" del equipo aquí son texto libre (2 strings), no usuarios del sistema. ¿Deben ser referencias a usuarios reales? Los entrenadores son usuarios del sistema tambien.
