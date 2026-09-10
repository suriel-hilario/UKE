// G-C5: literales en euskera (default) y castellano.
export type Lang = 'eu' | 'es'

const DICT = {
  panel: { eu: 'Panela', es: 'Panel' },
  seleccionaTemporada: { eu: 'Aukeratu denboraldia', es: 'Selecciona una temporada' },
  cerrada: { eu: 'itxita', es: 'cerrada' },
  eskola: { eu: 'Eskola', es: 'Eskola' },
  f7: { eu: 'F7', es: 'F7' },
  f11: { eu: 'F11', es: 'F11' },
  alDia: { eu: 'Eguneratuta', es: 'Al día' },
  pendiente: { eu: 'Falta betetzeko', es: 'Pendiente' },
  asistencia: { eu: 'Asistentzia', es: 'Asistencia' },
  minutaje: { eu: 'Minutajea', es: 'Minutaje' },
  ultimaActualizacion: { eu: 'Azken eguneraketa', es: 'Última actualización' },
  sinDatos: { eu: 'Daturik ez', es: 'Sin datos' },
  sinEquipos: { eu: 'Ez dago talderik', es: 'No hay equipos' },
  todoAlDia: { eu: 'Dena eguneratuta', es: 'Todo al día' },
  sesionesPendientes: { eu: 'Asistentzia falta duten saioak', es: 'Sesiones con asistencia pendiente' },
  jornadasPendientes: { eu: 'Minutaje falta duten jardunaldiak', es: 'Jornadas con minutaje pendiente' },
  cerrar: { eu: 'Itxi', es: 'Cerrar' },
  errorGenerico: { eu: 'Errore bat gertatu da', es: 'Ha ocurrido un error' },
} as const

export type DictKey = keyof typeof DICT

const DEFAULT_LANG: Lang = 'eu'

export function t(key: DictKey, lang: Lang = DEFAULT_LANG): string {
  return DICT[key][lang]
}
