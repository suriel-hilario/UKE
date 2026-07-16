# Especificaciones Funcionales — Aplicación de Gestión Deportiva
**Fuente:** `Especificaciones_App_Deportivav1 (1).docx` (documento del cliente, FRESHFOR INNOVATION)
**Club:** Urretxindorra Kirol Elkartea
**Ámbito:** Sistema de asistencia y minutaje
**Estado: VALIDADO por Suriel, 10/07/2026**

> Transcripción fiel del documento del cliente. No se ha alterado el contenido funcional; solo se ha limpiado el formato.

## 1. Capa de Gestión y Permisos

### Panel de Administración
El sistema contará con un rol de **administrador** con acceso completo. Sus funciones específicas serán:

- Importar el listado de jugadores desde archivo Excel (soporte para `.xlsx` y `.xls`).
- Gestionar y asignar roles de usuario con los siguientes niveles de acceso:

### Dirección Deportiva
Acceso de **lectura/escritura** a todos los equipos, agrupados por categoría (**Eskola, F7 y F11**). Dispondrá además de un panel de control con indicadores de estado de actualización por equipo (ver punto 4).

### Coordinadores
Acceso de **lectura/escritura**. Cada coordinador visualizará exclusivamente el bloque correspondiente a su categoría asignada:

- **Coordinador de Eskola:** acceso al bloque Eskola.
- **Coordinador de F7:** acceso al bloque F7.
- **Coordinador de F11:** acceso al bloque F11.

Cada coordinador dispondrá igualmente del panel de indicadores de actualización de los equipos de su categoría (ver punto 4).

### Entrenadores
**Lectura y edición** de los datos de sus equipos asignados. El sistema debe contemplar que **un mismo entrenador pueda estar vinculado a más de un equipo simultáneamente**.

### Archivo Histórico
Desde administración se tendrá acceso a los registros de pretemporada y temporada de años anteriores. Estos registros estarán archivados en **modo solo lectura**, sin posibilidad de modificación.

## 2. Bloques de Trabajo: Asistencia y Minutaje (F7 y F11)

Para las categorías F7 y F11 se crearán **dos bloques de trabajo independientes**:

- **Bloque de Pretemporada:** se activa desde la fecha en que el equipo comienza a entrenar, antes del inicio oficial de la liga.
- **Bloque de Temporada:** se activa en la semana de inicio de la competición de liga.

Cada bloque registrará de forma separada:

- **Asistencia a entrenamientos:** el entrenador deberá registrar la asistencia el mismo día en que se celebre el entrenamiento.
- **Seguimiento de minutaje en partidos:** el entrenador deberá registrar los minutos jugados por cada jugador el mismo día en que se dispute el partido.

## 3. Incorporación de Jugadores a lo Largo del Proceso

El sistema debe gestionar correctamente las altas de jugadores que se incorporen una vez iniciada la pretemporada o la temporada. La lógica de cálculo será la siguiente:

- La fecha de referencia para el cómputo de porcentajes de asistencia y minutaje de cada jugador será **su propia fecha de incorporación**, no la fecha de inicio del bloque (pretemporada o temporada).
- Esto garantiza que los porcentajes reflejen fielmente la participación real del jugador desde que forma parte del equipo, evitando penalizaciones por ausencias anteriores a su alta.
- El sistema deberá **registrar y almacenar la fecha de incorporación individual de cada jugador como campo obligatorio**.

## 4. Sistema de Avisos y Panel de Control de Actualización

### Avisos Automáticos a Entrenadores
El sistema enviará **notificaciones automáticas diarias** a cada entrenador recordándole las tareas pendientes de registro:

- En días de entrenamiento: aviso para registrar la asistencia de la sesión.
- En días de partido: aviso para registrar el minutaje de los jugadores.
- Con carácter general: aviso semanal recordando la obligación de mantener los datos actualizados.

Los avisos se generarán de forma **individualizada por equipo**, contemplando el caso de entrenadores con más de un equipo asignado.

### Panel de Control para Dirección Deportiva y Coordinadores
Tanto el Director Deportivo como cada Coordinador dispondrán de un **panel de estado** con indicadores visuales que mostrarán, equipo por equipo dentro de su ámbito de acceso:

- Si el registro de asistencia está actualizado o presenta entradas pendientes.
- Si el registro de minutaje está actualizado o presenta entradas pendientes.

El panel permitirá identificar de un vistazo qué entrenadores o equipos no han completado el registro en el período correspondiente, facilitando el seguimiento y la supervisión sin necesidad de acceder a los datos individuales de cada equipo.
