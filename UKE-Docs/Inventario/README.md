# Inventario funcional UKE — Fuente de verdad para OpenSpec
**Generado:** 2026-07-07 · a partir de los 6 mockups HTML únicos y el docx del cliente
**Estado global: PENDIENTE DE VALIDACIÓN por Suriel**

## Índice
| Fichero | Contenido | Fuente |
|---|---|---|
| `00-especificaciones-cliente.md` | Requisitos del cliente (transcripción limpia del docx) | Especificaciones_App_Deportivav1 (1).docx |
| `01-asistencias-jugadores-eskola-f7.md` | App de asistencia de jugadores (Eskola y F7 = misma app parametrizada) | UKE_Eskola_Asistentziak.html + UKE_F7_Asistentziak.html |
| `02-asistencia-entrenadores-f7.md` | App de asistencia de entrenadores F7 (roles director/coordinador) | UKE_F7_Entrenatzaileak.html |
| `03-asistencias-f11.md` | App de asistencias F11 (estados tipificados + configuración) | UKE_Asistencias_F11_FINAL.html |
| `04-fieldbook-minutaje.md` | App FieldBook de minutaje en partidos (versiones general y F7 = misma app) | UKE_SEGUIMIENTO_Minutos_Final.html + UKE_SEGUIMIENTO_F7-1.html |
| `99-gaps.md` | Contradicciones docx↔mockups y entre mockups. **Nada de aquí se especifica hasta decidirse** | Cruce de todo lo anterior |
| `_plantilla.md` | Plantilla para inventariar futuras pantallas | — |

## Hallazgos estructurales clave
1. Los 7 HTML son **6 pantallas únicas** (los dos F11 son idénticos byte a byte) que a su vez son **4 aplicaciones** (Eskola y F7-jugadores comparten código; los dos FieldBook también).
2. Los mockups cubren bien el registro diario (asistencia y minutaje) pero **no cubren** media docena de requisitos del docx: administrador, import Excel, bloques pretemporada/temporada, fecha de incorporación explícita, notificaciones, panel de estado de actualización, histórico. Detallado en `99-gaps.md` sección A.
3. La contradicción más importante: el docx define Dirección y Coordinadores como **solo lectura** y los mockups les dan escritura total (`99-gaps.md` G-B1). Hay que resolverla ANTES de especificar permisos.

## Cómo validar (checklist por fichero 01–04)
1. Abre el HTML correspondiente en el navegador junto al inventario.
2. Recorre cada pantalla: ¿está cada campo, botón y navegación? Marca lo que falte o sobre.
3. Prueba los flujos con datos (login con las credenciales semilla, marca asistencias, guarda una jornada) y comprueba que las reglas de cálculo descritas coinciden.
4. Revisa la sección "Dudas / Open Questions" y responde lo que puedas; lo que dependa del club, muévelo a la reunión de `99-gaps.md`.
5. Cambia la cabecera a `**Estado: VALIDADO por Suriel, <fecha>**`.

Solo los ficheros con sello VALIDADO pueden usarse como input de un `opsx-propose`.

## Regla de trazabilidad
Todo requisito que entre en una spec de OpenSpec debe citar su origen: `(inventario/NN-x.md § sección)` o `(00-especificaciones-cliente.md § punto N)`. Requisito sin origen = alucinación = fuera.
