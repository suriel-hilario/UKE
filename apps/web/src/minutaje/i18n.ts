// G-C5: literales en euskera (default) y castellano.
export type Lang = 'eu' | 'es'

export const PILLS_ESTADO = ['CONV', 'JUG', 'TIT'] as const
export const PILLS_BAJA = ['LES', 'SAN', 'ENF', 'VAC', 'NJ'] as const
export type PillEstado = (typeof PILLS_ESTADO)[number]
export type PillBaja = (typeof PILLS_BAJA)[number]

const DICT = {
  minutaje: { eu: 'Minutajea', es: 'Minutaje' },
  jornadaTab: { eu: 'Jardunaldia', es: 'Jornada' },
  dashboardTab: { eu: 'Dashboarda', es: 'Dashboard' },
  jornadaNumero: { eu: 'Jardunaldia zk.', es: 'Jornada nº' },
  rival: { eu: 'Aurkaria', es: 'Rival' },
  fecha: { eu: 'Data', es: 'Fecha' },
  campo: { eu: 'Zelaia', es: 'Campo' },
  local: { eu: 'Etxean', es: 'Local' },
  visitante: { eu: 'Kanpoan', es: 'Visitante' },
  golesFavor: { eu: 'Gol alde', es: 'Goles favor' },
  golesContra: { eu: 'Gol kontra', es: 'Goles contra' },
  duracionPartido: { eu: 'partiduaren iraupena', es: 'duración del partido' },
  conv: { eu: 'DEI', es: 'CONV' },
  jug: { eu: 'JOK', es: 'JUG' },
  tit: { eu: 'TIT', es: 'TIT' },
  les: { eu: 'LES', es: 'LES' },
  san: { eu: 'ZIG', es: 'SAN' },
  enf: { eu: 'GAI', es: 'ENF' },
  vac: { eu: 'OPO', es: 'VAC' },
  nj: { eu: 'JG', es: 'NJ' },
  minutos: { eu: 'Minutuak', es: 'Minutos' },
  goles: { eu: 'Golak', es: 'Goles' },
  unPeriodo: { eu: '1 zatia', es: '1 periodo' },
  partidoCompleto: { eu: 'partidu osoa', es: 'partido completo' },
  tresPeriodos: { eu: '3 zati', es: '3 periodos' },
  convocadosContador: { eu: 'dei · jokatu', es: 'conv · jugados' },
  guardarJornada: { eu: '💾 JARDUNALDIA GORDE', es: '💾 GUARDAR JORNADA' },
  historial: { eu: 'JARDUNALDIEN HISTORIALA', es: 'HISTORIAL DE JORNADAS' },
  registradas: { eu: 'erregistratuta', es: 'registradas' },
  sinJornadas: { eu: 'Oraindik ez dago jardunaldirik erregistratuta', es: 'Sin jornadas registradas aún' },
  jornadas: { eu: 'Jardunaldiak', es: 'Jornadas' },
  jugador: { eu: 'Jokalaria', es: 'Jugador' },
  conv2: { eu: 'Deiak', es: 'Conv' },
  jugados: { eu: 'Jokatuak', es: 'Jugados' },
  titular: { eu: 'Titular', es: 'Titular' },
  porcTotal: { eu: '%GUZTIRA', es: '%TOTAL' },
  porcConv: { eu: '%DEI', es: '%CONV' },
  porcDisp: { eu: '%ERABILGARRI▲', es: '%DISP▲' },
  alertaIntervenir: { eu: '⚠️ Parte-hartze txikia', es: '⚠️ Participación baja' },
  alertaVigilar: { eu: '👁 Parte-hartze ertaina', es: '👁 Participación media' },
  kpiEquipo: { eu: 'Taldearen KPIak', es: 'KPIs del equipo' },
  controlParticipacion: { eu: 'PARTE-HARTZE KONTROLA', es: 'CONTROL DE PARTICIPACIÓN' },
  leyendaExplicacion: {
    eu: 'DISP▲ da metrika nagusia: <50% Esku hartu, 50-70% Zaindu, >=70% ondo',
    es: 'DISP▲ es la métrica principal: <50% Intervenir, 50-70% Vigilar, >=70% bien',
  },
  panelAlertas: { eu: 'Alerta jokalariak', es: 'Jugadores en alerta' },
  detallePorJornada: { eu: 'JARDUNALDIKA XEHETASUNA', es: 'DETALLE POR JORNADA' },
  tablaToggle: { eu: '☰ Taula', es: '☰ Tabla' },
  fichasToggle: { eu: '⊞ Fitxak', es: '⊞ Fichas' },
} as const

export type DictKey = keyof typeof DICT

const DEFAULT_LANG: Lang = 'eu'

export function t(key: DictKey, lang: Lang = DEFAULT_LANG): string {
  return DICT[key][lang]
}

export function umbralMinutaje(porcentaje: number | '--'): 'verde' | 'ambar' | 'rojo' | 'gris' {
  if (porcentaje === '--') return 'gris'
  if (porcentaje >= 70) return 'verde'
  if (porcentaje >= 50) return 'ambar'
  return 'rojo'
}

export const UMBRAL_COLOR: Record<ReturnType<typeof umbralMinutaje>, string> = {
  verde: 'var(--color-success)',
  ambar: 'var(--color-warning)',
  rojo: 'var(--color-danger)',
  gris: 'var(--color-neutral)',
}
