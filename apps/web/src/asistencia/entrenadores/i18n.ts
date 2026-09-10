// G-C5: literales en euskera (default) y castellano.
export type Lang = 'eu' | 'es'

const DICT = {
  entrenadores: { eu: 'Entrenatzaileak', es: 'Entrenadores' },
  entrenador: { eu: 'Entrenatzailea', es: 'Entrenador' },
  sesionPorc: { eu: 'SAIOA %', es: 'SESIÓN %' },
  total: { eu: 'TOTALA', es: 'TOTAL' },
  editar: { eu: 'Editatu', es: 'Editar' },
  guardar: { eu: 'Gorde', es: 'Guardar' },
  quitarDiaConfirm: { eu: 'Eguna kendu?', es: '¿Quitar este día?' },
  sinDatos: { eu: 'Ez dago daturik', es: 'Sin datos' },
  sinAcceso: { eu: 'Sarbiderik ez', es: 'Sin acceso' },
  sinAccesoAsistenciaMensaje: {
    eu: 'Ez duzu talde honen entrenatzaileen asistentziara sarbiderik.',
    es: 'No tienes acceso a la asistencia de entrenadores de este equipo.',
  },
  errorGenerico: { eu: 'Errore bat gertatu da', es: 'Ha ocurrido un error' },
  temporadaCerrada: {
    eu: 'Denboraldia itxita dago; datuak irakurtzeko soilik dira.',
    es: 'La temporada está cerrada; los datos son de solo lectura.',
  },
} as const

export type DictKey = keyof typeof DICT

const DEFAULT_LANG: Lang = 'eu'

export function t(key: DictKey, lang: Lang = DEFAULT_LANG): string {
  return DICT[key][lang]
}

export function umbralEskolaF7(porcentaje: number | null): 'verde' | 'ambar' | 'rojo' | 'gris' {
  if (porcentaje == null) return 'gris'
  if (porcentaje >= 80) return 'verde'
  if (porcentaje >= 60) return 'ambar'
  return 'rojo'
}

export const UMBRAL_COLOR: Record<ReturnType<typeof umbralEskolaF7>, string> = {
  verde: 'var(--color-success)',
  ambar: 'var(--color-warning)',
  rojo: 'var(--color-danger)',
  gris: 'var(--color-neutral)',
}
