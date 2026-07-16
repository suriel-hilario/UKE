# Aplicación: Asistencia de entrenadores (F7)
**Fuente:** `UKE_F7_Entrenatzaileak.html`
**Estado: VALIDADO por Suriel, 10/07/2026**

## Propósito
Registrar la asistencia de los **entrenadores** (no jugadores) de todos los equipos F7 a los entrenamientos, con un rol coordinador que marca la asistencia y un director que gestiona la plantilla de entrenadores y los accesos.

## Constantes observadas
- **Temporada:** SEP-2025 a MAY-2026 (mismos 9 meses que las apps de jugadores).
- **Festivos:** misma lista hardcodeada que en `01-…`.
- **Días de entrenamiento:** Martes, Jueves y **Sábado** (`dow 2,4,6`). ⚠️ Difiere de la app de asistencia de jugadores F7 (Martes y Jueves) — ver `99-gaps.md` (G7).
- **Equipos F7:** los mismos 7 de la app de jugadores F7 (2018/2017/2016 Berdea/Gorria + 2015 Kimuak).
- **Estados de asistencia:** vacío → P → A → vacío (mismo ciclo).
- **Umbrales de color:** ≥80% verde, ≥60% ámbar, <60% rojo.
- **Cada entrenador tiene:** nombre, rol textual (semilla: "Nagusia" / "Laguntzailea"; al añadir: "Laguntzailea/Ayudante"), foto opcional. Por defecto 2 entrenadores por equipo.
- **Persistencia mockup:** localStorage `uke_f7_ent_v3`.

## Roles observados
| Rol | Usuario semilla | Acceso |
|---|---|---|
| `director` | Director / UKEDIR2627 | Gestión de entrenadores (CRUD) + usuarios y contraseñas |
| `coord` (Koordinatzailea) | Koordinatzailea / Koordinatzailea2627 | Calendario de asistencia de entrenadores (marca P/A), modo edición de días |

⚠️ No hay rol "entrenador" en esta app: la asistencia de los entrenadores la registra el coordinador, no cada entrenador. Confirmar si es el flujo deseado (Open Question).

---

## Pantalla 1: Login
Idéntica en estructura a la de `01-…` (pills de idioma, select de usuario con prefijos 🏆/📋, contraseña, SARTU/ENTRAR, "¿olvidaste la contraseña?" que muestra credenciales en claro). Mismas validaciones y mismas dudas de seguridad.

---

## Pantalla 2: Vista coordinador — calendario de asistencia de entrenadores
**Ruta de llegada:** login con rol coord.

### Estructura
- Badge "📋 Koordinatzailea".
- Sidebar: "Hilabeteak / Meses" con % mensual global junto a cada mes.
- Contenido: título del mes, botón "✏ Editatu / Editar" (toggle, igual que en `01-…`: habilita ✕ para quitar días), tabla.

### Tabla
| Columna | Contenido |
|---|---|
| Entrenatzailea / Entrenador-a | Avatar (foto/iniciales, color del equipo) + nombre + rol textual. Click → ficha del entrenador |
| Taldea / Equipo | Nombre del equipo coloreado |
| Una columna por día de entrenamiento | Botón de asistencia (ciclo vacío→P→A) |
| % | % mensual del entrenador |

Filas adicionales: "SAIOA % / SESIÓN %" (primera fila: % de entrenadores presentes por sesión sobre el total de entrenadores de todos los equipos) y % total del mes.

### Reglas de cálculo observadas
- % entrenador/mes = sesiones con P / sesiones del mes.
- % sesión = entrenadores con P en esa fecha / total de entrenadores de todos los equipos.
- % mes global = presencias / (sesiones × entrenadores).

### Overlay: Ficha del entrenador
- Avatar 70px con botón 📷 (subida de foto).
- Edición inline de **nombre** (input + "💾 Gorde/Guardar") y de **rol** (input + "💾 Rola/Rol").
- Grid: Total %, Presentziak/Presencias, Faltak/Faltas, Saioak/Sesiones (temporada completa).
- Tabla mensual: Mes (con barra), Ses., Pres., %.
- Botón "🗑 Entrenatzailea ezabatu / Eliminar entrenador" (confirm).

---

## Pantalla 3: Panel de director
**Ruta de llegada:** login con rol director.

### Estructura
- Badge "🏆 Director".
- **👥 Entrenatzaileak:** tabla única con todos los entrenadores de todos los equipos: #, Nombre (input editable inline, persiste onchange), Equipo (etiqueta coloreada), Rol (input editable), botón ✕ eliminar (confirm). Bajo cada equipo, botón "+ Entrenatzaile berria / Nuevo entrenador · <equipo>" que añade un entrenador con nombre vacío y rol "Laguntzailea/Ayudante".
- **🔐 Erabiltzaileak / Usuarios:** tabla Usuario / Contraseña (input) + botón "💾 Gorde / Guardar" (solo existen los 2 usuarios: Director y Koordinatzailea).

## Dudas / Open Questions
- ¿Quién debe registrar la asistencia de entrenadores en producción: el coordinador (como en el mockup), el director, o cada entrenador la suya? El coordinador
- El docx del cliente define coordinadores como **solo lectura**; aquí el coordinador escribe asistencia. Ver `99-gaps.md` (G1). El coordinador debe poder escribir.
- El "rol" del entrenador (Nagusia/Laguntzailea) es texto libre. ¿Debe ser un enum?. Si, debe ser enum.
- Esta app solo existe para F7. ¿Se necesita el equivalente para Eskola y F11? Si, para los 3.
- Los entrenadores de esta app y los "coaches" (2 strings) de la app de asistencia de jugadores F7 son datos distintos sin vínculo. En el modelo real deben ser la misma entidad.
