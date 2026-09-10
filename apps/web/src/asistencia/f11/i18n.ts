// G-C5: literales en euskera (default) y castellano.
export type Lang = 'eu' | 'es'

export const ESTADOS_F11 = ['1', 'EM', 'RC', 'VA', 'LS', 'EN', 'TR', 'EX', 'OT', 'NJ'] as const
export type EstadoF11 = (typeof ESTADOS_F11)[number]

export const ESTADO_LABEL: Record<EstadoF11, { eu: string; es: string }> = {
  '1': { eu: 'Bertaratua', es: 'Asiste' },
  EM: { eu: 'Bazterrean', es: 'Al margen' },
  RC: { eu: 'Berreskuratzen', es: 'Recupera' },
  VA: { eu: 'Oporrak', es: 'Vacaciones' },
  LS: { eu: 'Lesioa', es: 'Lesión' },
  EN: { eu: 'Gaixo', es: 'Enfermo' },
  TR: { eu: 'Lana', es: 'Trabajo' },
  EX: { eu: 'Ikasketa', es: 'Estudio' },
  OT: { eu: 'Beste', es: 'Otros' },
  NJ: { eu: 'Justif. gabe', es: 'No justif.' },
}

const DICT = {
  markarSaioa: { eu: 'SAIOA MARKATU', es: 'MARCAR SESIÓN' },
  sinMarcar: { eu: 'Markatu gabe', es: 'Sin marcar' },
  porcAno: { eu: '% URTEA', es: '% AÑO' },
  porcMes: { eu: '% HILA', es: '% MES' },
  jugador: { eu: 'Jokalaria', es: 'Jugador' },
  total: { eu: 'GUZTIRA', es: 'TOTAL' },
  totalGeneral: { eu: 'GUZTIZKO GUZTIRA', es: 'TOTAL GENERAL' },
  media: { eu: 'Batez besteko', es: 'Media' },
  conFicha: { eu: 'Fitxadunak', es: 'Con Ficha' },
  sinFicha: { eu: 'Fitxarik gabekoak', es: 'Sin Ficha' },
  entrenadores: { eu: 'Entrenatzaileak', es: 'Entrenadores' },
  equipo: { eu: 'Taldea', es: 'Equipo' },
  mes: { eu: 'Hila', es: 'Mes' },
  sesiones: { eu: 'Saioak', es: 'Sesiones' },
  totalTemporada: { eu: 'Denboraldiko guztira', es: 'Total temp.' },
  asistencias: { eu: 'Asistentziak', es: 'Asistencias' },
  mediaGeneral: { eu: 'Batez bestekoa (%)', es: 'Media general %' },
  mediaFicha: { eu: 'Fitxa batez bestekoa (%)', es: 'Media ficha %' },
  leyenda: { eu: 'Legenda', es: 'Leyenda' },
  resumenTemporada: { eu: 'Denboraldiko laburpena', es: 'Resumen temporada' },
  evolucionMensual: { eu: 'Hileroko bilakaera', es: 'Evolución mensual' },
  exportarCsv: { eu: '⬇ CSV', es: '⬇ CSV' },
  marcarTodos: { eu: 'Guztiak markatuta', es: 'Todos marcados' },
} as const

export type DictKey = keyof typeof DICT

const DEFAULT_LANG: Lang = 'eu'

export function t(key: DictKey, lang: Lang = DEFAULT_LANG): string {
  return DICT[key][lang]
}

export function estadoLabel(estado: EstadoF11, lang: Lang = DEFAULT_LANG): string {
  return ESTADO_LABEL[estado]?.[lang] ?? estado
}

export function umbralF11(porcentaje: number | '--'): 'verde' | 'ambar' | 'rojo' | 'gris' {
  if (porcentaje === '--') return 'gris'
  if (porcentaje >= 85) return 'verde'
  if (porcentaje >= 60) return 'ambar'
  if (porcentaje > 0) return 'rojo'
  return 'gris'
}

export const UMBRAL_COLOR: Record<ReturnType<typeof umbralF11>, string> = {
  verde: 'var(--color-success)',
  ambar: 'var(--color-warning)',
  rojo: 'var(--color-danger)',
  gris: 'var(--color-neutral)',
}
