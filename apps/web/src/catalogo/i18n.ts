// G-C5: literales en euskera (default) y castellano.
export type Lang = 'eu' | 'es'

const DICT = {
  temporada: { eu: 'Denboraldia', es: 'Temporada' },
  cargando: { eu: 'Kargatzen...', es: 'Cargando...' },
  plantilla: { eu: 'Plantilla', es: 'Plantilla' },
  sinAcceso: { eu: 'Sarbiderik ez', es: 'Sin acceso' },
  sinAccesoMensaje: {
    eu: 'Ez duzu talde honetarako sarbiderik.',
    es: 'No tienes acceso a este equipo.',
  },
  salir: { eu: 'Irten', es: 'Salir' },
  conFicha: { eu: 'Fitxadunak', es: 'Con ficha' },
  sinFicha: { eu: 'Fitxarik gabekoak', es: 'Sin ficha' },
  entrenadores: { eu: 'Entrenatzaileak', es: 'Entrenadores' },
  miembrosActivos: { eu: 'kide aktibo', es: 'miembros activos' },
  fechaIncorporacion: { eu: 'Sarrera data', es: 'Fecha de incorporación' },
  sinEquipos: { eu: 'Ez dago talderik kategoria honetan', es: 'No hay equipos en esta categoría' },
  volver: { eu: 'Atzera', es: 'Volver' },
  seleccionaTemporada: { eu: 'Aukeratu denboraldia', es: 'Selecciona temporada' },
  cerrada: { eu: 'itxita', es: 'cerrada' },
  temporadaCerradaBanner: {
    eu: 'Denboraldia itxita — irakurketa soilik',
    es: 'Temporada cerrada — solo lectura',
  },
} as const

export type DictKey = keyof typeof DICT

const DEFAULT_LANG: Lang = 'eu'

export function t(key: DictKey, lang: Lang = DEFAULT_LANG): string {
  return DICT[key][lang]
}
