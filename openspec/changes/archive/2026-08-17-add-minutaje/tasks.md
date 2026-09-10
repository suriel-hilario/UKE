## 1. Backend: helper compartido de elegibilidad

- [x] 1.1 Extraer `miembroActivoEnFecha` de `SesionesService` a `apps/api/src/asistencia/miembro-activo.ts` (función pura, mismo predicado: `fecha_incorporacion <= fecha` y `fecha_baja IS NULL OR fecha <= fecha_baja`) (`design.md` § D3)
- [x] 1.2 Actualizar `SesionesService` para usar el helper compartido en vez de su método privado
- [x] 1.3 Confirmar que la suite existente `asistencia.e2e-spec.ts`/`asistencia-f11.e2e-spec.ts` sigue pasando sin cambios (regresión del refactor)

## 2. Backend: reglas de negocio de participación

- [x] 2.1 Crear `aplicarReglasParticipacion(input, duracion)` en `apps/api/src/asistencia/jornadas.service.ts` (o módulo propio): jugado⇒convocado; titular⇒convocado+jugado+minutos=duración si minutos era 0; baja⇒limpia convocado/jugado/titular; LES/SAN/ENF/VAC/NJ mutuamente excluyentes (`design.md` § D2)
- [x] 2.2 Validación de minutos: `minutos <= equipo.minutos_por_periodo * equipo.num_periodos + margen` (margen +30 para 2 periodos, +10 para 3 periodos), 400 si excede (`design.md` § D5)

## 3. Backend: JornadasService — lectura y escritura

- [x] 3.1 `listarJornadas(equipo, bloqueId)` — todas las jornadas del bloque, orden `numero desc`, con resumen de participación por miembro
- [x] 3.2 `getJornadaPorNumero(equipo, bloqueId, numero)` — jornada + participaciones de miembros activos en la fecha (usando el helper de la sección 1); miembro sin fila → valores en blanco/0/false
- [x] 3.3 `guardarJornada(equipo, bloqueId, input)` — upsert por `(equipo_id, bloque_id, numero)`; aplica validación de minutos (2.2) y reglas de negocio (2.1) a cada participación antes de persistir
- [x] 3.4 `actualizarParticipacion(equipo, numero, miembroId, input)` — actualiza una sola `participacion_jornada`, mismas validaciones/reglas que 3.3

## 4. Backend: dashboard de participación

- [x] 4.1 `getDashboard(equipo, bloqueId)` — para cada miembro activo del bloque: `jornadasDesdeDebut`, `disponibles`, `decTec`, `minutos`, `goles`, `%TOTAL`, `%CONV`, `%DISP` (fórmulas de `design.md` § D8, 1 decimal, `"--"` si denominador 0) y `alerta` (`intervenir`/`vigilar`/`null`, `null` si `disponibles < 2`)
- [x] 4.2 Agregación en memoria sobre una única query con `include: { participaciones: true }` (`design.md` § D4)

## 5. Backend: controller y wiring

- [x] 5.1 `GET /equipos/:id/jornadas?bloque_id=` — resuelve `equipo`, scope (`AsistenciaAccessService`), `bloque_id` (o bloque activo vía `getBloqueActivo`), llama a 3.1
- [x] 5.2 `GET /equipos/:id/jornadas/:numero?bloque_id=` — mismo patrón, llama a 3.2
- [x] 5.3 `POST /equipos/:id/jornadas` — scope de escritura + `assertTemporadaAbierta`, llama a 3.3
- [x] 5.4 `PATCH /equipos/:id/jornadas/:numero/miembro/:miembroId` — scope de escritura + `assertTemporadaAbierta`, llama a 3.4
- [x] 5.5 `GET /equipos/:id/dashboard?bloque_id=` — scope de lectura, llama a 4.1
- [x] 5.6 Registrar `JornadasService` y el controller en `AsistenciaModule` (`design.md` § D1)

## 6. Backend: tests e2e

- [x] 6.1 Test: `GET /equipos/:id/jornadas` devuelve jornadas ordenadas `numero desc`
- [x] 6.2 Test: `GET /equipos/:id/jornadas/:numero` de una jornada inexistente para un miembro activo devuelve participación en blanco (no error)
- [x] 6.3 Test: `POST /equipos/:id/jornadas` crea una jornada nueva y responde con las participaciones guardadas
- [x] 6.4 Test: `POST /equipos/:id/jornadas` con el mismo `numero` sobrescribe la jornada existente
- [x] 6.5 Test: `POST /equipos/:id/jornadas` con minutos fuera de rango (equipo F11, 40×2, margen +30) responde 400
- [x] 6.6 Test: `POST /equipos/:id/jornadas` sobre temporada cerrada responde 409
- [x] 6.7 Test: `jugado: true` sin `convocado` se persiste como `convocado: true`
- [x] 6.8 Test: `titular: true` con `minutos: 0` se persiste como `convocado/jugado/titular: true` y `minutos` = duración del partido
- [x] 6.9 Test: `baja: "LES"` limpia `convocado`/`jugado`/`titular`
- [x] 6.10 Test: `PATCH .../miembro/:miembroId` actualiza una sola participación aplicando las mismas reglas
- [x] 6.11 Test: `GET /equipos/:id/dashboard` calcula `%TOTAL`/`%CONV`/`%DISP` y `alerta` correctamente para un caso con datos
- [x] 6.12 Test: `GET /equipos/:id/dashboard` con `disponibles < 2` no genera alerta aunque `%DISP` sea bajo
- [x] 6.13 Test: `GET /equipos/:id/dashboard` con un miembro sin jornadas devuelve `"--"` en los tres porcentajes
- [x] 6.14 Test: `admin` recibe 403 en `/equipos/:id/jornadas`, `/equipos/:id/jornadas/:numero` y `/equipos/:id/dashboard`

## 7. Frontend: pestaña Minutaje base

- [x] 7.1 `EquipoDetailPage`: añadir pestaña "Minutaje" para `categoria !== 'eskola'` (junto a Plantilla/Asistencia)
- [x] 7.2 Crear `apps/web/src/minutaje/` con `i18n.ts` (literales del formulario, pills, contadores, historial, dashboard, alertas — EU/ES, euskera por defecto)
- [x] 7.3 `MinutajeTab.tsx`: fetch de `GET /equipos/:id/jornadas?bloque_id=`, estado de "vista activa" (jornada | dashboard) (`design.md` § D6)

## 8. Frontend: formulario de jornada

- [x] 8.1 Campos: Jornada nº, Rival, Fecha, Campo, Goles favor, Goles contra
- [x] 8.2 Insignia de duración: "2×<min> min · duración del partido" (F11) / "3×<min> min (<total> min)" (F7), según `equipo.num_periodos`/`minutos_por_periodo`
- [x] 8.3 Introducir un número de jornada existente llama a `GET /equipos/:id/jornadas/:numero` y rellena formulario + participaciones

## 9. Frontend: lista de jugadores y pills

- [x] 9.1 Fila por miembro activo: número, nombre (clicable), pills `CONV`/`JUG`/`TIT`/`LES`/`SAN`/`ENF`/`VAC`/`NJ` (`design.md` § D7)
- [x] 9.2 Reglas de exclusividad/dependencia aplicadas client-side antes de enviar (mismo comportamiento que backend, sección 2.1)
- [x] 9.3 Input de minutos + botones de preajuste (1 periodo, partido completo, y 3 periodos solo F7) e input de goles
- [x] 9.4 Contador de cabecera "N conv · M jugados"

## 10. Frontend: guardar e historial

- [x] 10.1 Botón "💾 GUARDAR JORNADA" → `POST /equipos/:id/jornadas`, refresca historial al completarse
- [x] 10.2 "HISTORIAL DE JORNADAS · N registradas": tarjetas por jornada (más reciente primero), insignia V/E/D coloreada, rival, fecha, expandible a detalle
- [x] 10.3 Estado vacío "Sin jornadas registradas aún"

## 11. Frontend: panel de estadísticas por jugador

- [x] 11.1 Expandir panel (click en nombre o botón "📊"): contadores (Jornadas, Conv, Jugados, Titular, Minutos, Goles, bajas si >0)
- [x] 11.2 Tres barras de métrica `%TOTAL`/`%CONV`/`%DISP▲` con tooltip de fórmula, coloreadas por umbral (`>=70` verde, `>=50` ámbar, `<50` rojo)
- [x] 11.3 Insignia de alerta ("⚠️ Participación baja / Parte-hartze txikia" / "👁 Participación media / Parte-hartze ertaina") según `alerta` del dashboard
- [x] 11.4 "Sin jornadas registradas aún" si el jugador no tiene datos

## 12. Frontend: vista Dashboard

- [x] 12.1 Franja de KPIs del equipo + insignia de duración de partido
- [x] 12.2 Leyenda `TOTAL`/`CONV`/`DISP▲` con explicación de umbrales y alertas
- [x] 12.3 Panel de alertas (jugadores en rojo/ámbar)
- [x] 12.4 Tabla de participación por jugador con las tres métricas
- [x] 12.5 "DETALLE POR JORNADA": navegación `‹ Jornada N ›`, rival, resultado, toggle `☰ Tabla` / `⊞ Fichas`, resumen de pills de la jornada

## 13. Frontend: tests

- [x] 13.1 Test: marcar pill `JUG` marca también `CONV` en la UI antes de enviar
- [x] 13.2 Test: marcar pill `TIT` con minutos en 0 rellena minutos con la duración del partido
- [x] 13.3 Test: marcar `LES` desactiva `SAN` si estaba activa
- [x] 13.4 Test: guardar jornada llama a `POST /equipos/:id/jornadas` y refresca el historial
- [x] 13.5 Test: cargar un número de jornada existente rellena el formulario y las participaciones
- [x] 13.6 Test: panel de estadísticas muestra la insignia de alerta correcta según `alerta`
- [x] 13.7 Test: vista Dashboard renderiza la tabla de participación y el panel de alertas

## 14. Literales EU/ES

- [x] 14.1 Todos los literales nuevos del módulo Minutaje (formulario, pills, contadores, historial, dashboard, alertas) en euskera y castellano, euskera por defecto

## 15. Verificación manual end-to-end

- [x] 15.1 Abrir la pestaña Minutaje de un equipo F7 y de un equipo F11, confirmar que Eskola no la muestra
- [x] 15.2 Registrar una jornada nueva con varios jugadores (distintas pills, minutos, goles) y guardar
- [x] 15.3 Recargar el número de esa jornada y confirmar que los datos persistieron correctamente
- [x] 15.4 Confirmar las reglas de pills en vivo (jugado⇒convocado, titular⇒convocado+jugado+minutos, baja limpia el resto, exclusividad de bajas)
- [x] 15.5 Abrir el panel de estadísticas de un jugador y confirmar contadores, barras de métrica y alerta
- [x] 15.6 Abrir la vista Dashboard y confirmar KPIs, panel de alertas, tabla de participación y navegación por jornada
- [x] 15.7 Confirmar los umbrales de color (`>=70` verde, `>=50` ámbar, `<50` rojo) en el dashboard
- [x] 15.8 Intentar guardar una jornada con minutos fuera de rango y confirmar el rechazo (400)
