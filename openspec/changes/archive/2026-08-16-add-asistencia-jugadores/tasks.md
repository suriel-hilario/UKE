## 1. Backend: setup

- [x] 1.1 Añadir dependencias a `apps/api/package.json`: `@aws-sdk/client-s3` (storage de fotos), `jimp` (redimensionado, sin bindings nativos — `design.md` § D7)
- [x] 1.2 Añadir `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_REGION` a `.env.example` y a `docker-compose.yml` (servicio `api`)
- [x] 1.3 Añadir servicio `minio` a `docker-compose.yml` para desarrollo local (puerto S3 + consola), con las credenciales que consume `apps/api`
- [x] 1.4 Extender la config tipada (`loadStorageConfig`) para validar las 5 variables al arrancar, fail-fast si falta alguna (mismo patrón que `loadManagementConfig` de `add-backoffice`)

## 2. Backend: scope de módulos deportivos

- [x] 2.1 Crear módulo `asistencia` (`apps/api/src/asistencia/asistencia.module.ts`), registrarlo en `AppModule`
- [x] 2.2 `AsistenciaAccessService.getEquiposWhere(usuario, temporadaId)` — mismo filtro por rol que `CatalogoAccessService` (director/coordinador/entrenador) pero `admin` siempre deniega (`{ id: { in: [] } }`)
- [x] 2.3 `AsistenciaAccessService.assertEquipoAccess(usuario, equipoId)` — 403 si fuera de scope o si `usuario.rol === 'admin'`
- [x] 2.4 `AsistenciaAccessService.assertTemporadaAbierta(equipoId)` — 409 si la temporada del equipo está `cerrada`; usado solo en endpoints de escritura

## 3. Backend: generación de sesiones y lectura de asistencia

- [x] 3.1 `SesionesService.ensureSesionesRegla(equipo, bloqueId, mes)` — calcula fechas del mes en `equipo.dias_entrenamiento`, excluye `festivo` de la temporada y fechas fuera de `[temporada.fecha_inicio, temporada.fecha_fin]`, inserta `sesion` (`tipo: entrenamiento`, `origen: regla`) con `createMany({ skipDuplicates: true })`
- [x] 3.2 `GET /equipos/:id/asistencia?bloque_id=&mes=` — llama a `ensureSesionesRegla`, luego devuelve las `sesion` (`eliminada=false`) del mes con los `registro_asistencia` de los miembros activos en la fecha de cada sesión (filtro `fecha_incorporacion`/`fecha_baja`); miembro sin registro → estado `"sin marcar"`

## 4. Backend: registro de asistencia y gestión de sesiones

- [x] 4.1 `PATCH /equipos/:id/asistencia` — upsert de `registro_asistencia` por `(sesion_id, miembro_equipo_id)`; valida `estado` en `['P', 'A']`; acepta `nota` opcional; 409 si temporada cerrada
- [x] 4.2 `PATCH /equipos/:id/sesiones/:sesionId` — actualiza `eliminada`; 409 si temporada cerrada
- [x] 4.3 `POST /equipos/:id/sesiones` — crea sesión manual (`origen: manual`); valida `(equipo_id, fecha, tipo)` único (captura violación de constraint, responde 409); 409 si temporada cerrada
- [x] 4.4 `POST /equipos/:id/miembros` — `PlantillaService.createJugador`, crea `persona` + `miembro_equipo` (`design.md` § D10); 409 si temporada cerrada
- [x] 4.5 `PATCH /equipos/:id/miembros/:miembroId` — `PlantillaService.updateJugador`, actualiza `nombre` de `persona` y/o `fecha_baja`; 409 si temporada cerrada

## 5. Backend: ficha del jugador

- [x] 5.1 `FichaService.getBloqueActivo(temporadaId)` — bloque con `fecha_activacion` más reciente `<= hoy`, o el más temprano si ninguno cumple (`design.md` § D5)
- [x] 5.2 `FichaService.calcularPorcentaje(miembroId, sesiones)` — `presentes / sesiones-que-computan * 100`, 1 decimal, `"--"` si denominador es 0
- [x] 5.3 `GET /miembros/:miembroId/ficha?equipo_id=` — `persona`, `grupo`, `fecha_incorporacion`; estadísticas de temporada (todos los bloques); desglose mensual del bloque activo

## 6. Backend: foto de jugador

- [x] 6.1 `StorageService.upload(buffer, key)` / `.delete(key)` — cliente `@aws-sdk/client-s3` contra `S3_ENDPOINT` configurado
- [x] 6.2 `PATCH /miembros/:miembroId/foto` — `FileInterceptor` (multer en memoria), redimensiona con `jimp` a máx. 200px, sube a storage, actualiza `persona.foto_url`; 409 si temporada cerrada
- [x] 6.3 `DELETE /miembros/:miembroId/foto` — borra del storage y limpia `persona.foto_url`; 409 si temporada cerrada

## 7. Backend: exportación CSV

- [x] 7.1 `GET /equipos/:id/asistencia/exportar?bloque_id=&mes=` — genera CSV en memoria (columnas Jugador + una por sesión ISO + `%`), `Content-Disposition` con `UKE_<equipo.nombre>_<mes>.csv`

## 8. Backend: tests e2e

- [x] 8.1 Test: `admin` recibe 403 en `/equipos/:id/asistencia`, `/equipos/:id/sesiones`, `/miembros/:miembroId/ficha`
- [x] 8.2 Test: `director`/`coordinador`/`entrenador` con scope correcto reciben 200; fuera de scope reciben 403
- [x] 8.3 Test: escritura sobre equipo de temporada cerrada → 409 (asistencia, sesiones, foto)
- [x] 8.4 Test: primera consulta del mes genera sesiones `regla` según `dias_entrenamiento`, excluyendo festivos
- [x] 8.5 Test: consultas repetidas no duplican sesiones `regla`
- [x] 8.6 Test: `PATCH asistencia` upsert — crea y luego actualiza el mismo `(sesion_id, miembro_equipo_id)`
- [x] 8.7 Test: `PATCH asistencia` con `estado` inválido → 400
- [x] 8.8 Test: miembro sin registro aparece como "sin marcar"; miembro con `fecha_baja`/`fecha_incorporacion` fuera de rango no aparece
- [x] 8.9 Test: `PATCH sesiones/:id` con `eliminada: true` la excluye de `GET asistencia` y de los cálculos
- [x] 8.10 Test: `POST sesiones` duplicado `(equipo_id, fecha, tipo)` → error, no crea segunda fila
- [x] 8.11 Test: `GET ficha` — porcentaje calculado correctamente; `"--"` si denominador es 0
- [x] 8.12 Test: `PATCH/DELETE foto` — actualiza y limpia `persona.foto_url` (mock del `StorageService`)
- [x] 8.13 Test: `GET asistencia/exportar` devuelve CSV con las columnas esperadas

## 9. Frontend: pestaña Asistencia

- [x] 9.1 Crear `apps/web/src/asistencia/` con `i18n.ts` (literales EU/ES, euskera por defecto)
- [x] 9.2 Añadir pestaña "Asistencia" a `EquipoDetailPage` (`apps/web/src/catalogo/`) para equipos `eskola`/`f7`, sin tocar la pestaña "Plantilla" existente
- [x] 9.3 Sidebar de meses con % mensual por mes
- [x] 9.4 Tabla de asistencia del mes seleccionado: cabecera, fila "SESIÓN %", filas de jugador, fila "TOTAL"

## 10. Frontend: interacción de celda y notas

- [x] 10.1 Click en celda cicla vacío → P → A → vacío, llama a `PATCH /equipos/:id/asistencia` en cada cambio
- [x] 10.2 Click derecho / pulsación larga abre overlay de nota (textarea, guardar, eliminar); indicador visual en celdas con nota

## 11. Frontend: modo edición

- [x] 11.1 Toggle de modo edición
- [x] 11.2 En modo edición: botón ✕ por cabecera de sesión (confirmación, `PATCH sesion eliminada=true`)
- [x] 11.3 En modo edición: botón ✕ por jugador (confirmación, `PATCH miembro fecha_baja=hoy`)

## 12. Frontend: alta de jugador y exportación

- [x] 12.1 Botón "+ Jugador" → modal de alta (campo nombre, Enter confirma), llama a `POST /equipos/:id/miembros`
- [x] 12.2 Botón de exportar CSV → llama a `GET /equipos/:id/asistencia/exportar`, dispara descarga

## 13. Frontend: ficha del jugador

- [x] 13.1 Overlay de ficha: avatar + botón de subida de foto (`PATCH /miembros/:miembroId/foto`)
- [x] 13.2 Nombre editable inline (`PATCH /equipos/:id/miembros/:miembroId`)
- [x] 13.3 Grid de 4 estadísticas (Total %, Presencias, Faltas, Sesiones) + tabla mensual con mini barra de progreso coloreada
- [x] 13.4 Botón eliminar jugador (confirmación → `fecha_baja=hoy`)

## 14. Frontend: tests

- [x] 14.1 Test: click en celda cicla vacío → P → A → vacío y llama a `PATCH /equipos/:id/asistencia` en cada paso
- [x] 14.2 Test: overlay de nota guarda y elimina correctamente
- [x] 14.3 Test: modo edición — quitar sesión llama a `PATCH sesiones/:id` con `eliminada: true`
- [x] 14.4 Test: modo edición — eliminar jugador llama a `PATCH miembros/:id` con `fecha_baja` de hoy
- [x] 14.5 Test: exportar CSV dispara la descarga con el nombre de fichero esperado
- [x] 14.6 Test: overlay de ficha muestra estadísticas y desglose mensual correctamente

## 15. Literales EU/ES

- [x] 15.1 Todos los literales nuevos del módulo de asistencia en euskera y castellano (G-C5), euskera por defecto

## 16. Verificación manual end-to-end

- [x] 16.1 Abrir la pestaña Asistencia de un equipo Eskola/F7 y confirmar que se generan las sesiones del mes según `dias_entrenamiento`, sin incluir festivos
- [x] 16.2 Marcar P/A en varias celdas y confirmar que los porcentajes de fila/sesión/mes/total se actualizan
- [x] 16.3 Añadir una nota a una celda y confirmar el indicador visual
- [x] 16.4 En modo edición, quitar un día y confirmar que desaparece de la tabla y de los cálculos
- [x] 16.5 En modo edición, eliminar un jugador y confirmar que desaparece de la tabla activa pero sigue en BD con `fecha_baja`
- [x] 16.6 Añadir un jugador nuevo desde "+ Jugador" y confirmar que aparece en la tabla
- [x] 16.7 Exportar el CSV del mes y confirmar el contenido y nombre de fichero
- [x] 16.8 Abrir la ficha de un jugador, subir una foto, y confirmar que se ve en la tabla y en el overlay
- [x] 16.9 Confirmar que `admin` no puede acceder a la pestaña Asistencia (403 en las llamadas)
- [x] 16.10 Confirmar que una temporada cerrada bloquea la escritura (409) pero permite lectura
