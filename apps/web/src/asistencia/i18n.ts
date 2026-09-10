// G-C5: literales en euskera (default) y castellano.
export type Lang = 'eu' | 'es'

const DICT = {
  asistencia: { eu: 'Asistentzia', es: 'Asistencia' },
  jugador: { eu: 'Jokalaria', es: 'Jugador' },
  sesionPorc: { eu: 'SAIOA %', es: 'SESIÓN %' },
  total: { eu: 'TOTALA', es: 'TOTAL' },
  editar: { eu: 'Editatu', es: 'Editar' },
  guardar: { eu: 'Gorde', es: 'Guardar' },
  anadirJugador: { eu: '+ Jokalaria', es: '+ Jugador' },
  exportarCsv: { eu: '⬇ CSV', es: '⬇ CSV' },
  nombre: { eu: 'Izena', es: 'Nombre' },
  anadir: { eu: '✔ Gehitu', es: '✔ Añadir' },
  cancelar: { eu: 'Utzi', es: 'Cancelar' },
  nota: { eu: '📝 Oharra', es: '📝 Nota' },
  eliminarNota: { eu: '🗑 Ezabatu', es: '🗑 Eliminar' },
  quitarDiaConfirm: { eu: 'Eguna kendu?', es: '¿Quitar este día?' },
  eliminarJugadorConfirm: { eu: 'Jokalaria ezabatu?', es: '¿Eliminar jugador?' },
  fichaJugador: { eu: 'Jokalariaren fitxa', es: 'Ficha del jugador' },
  rolEntrenador: { eu: 'Rola', es: 'Rol' },
  totalPorc: { eu: 'Guztira %', es: 'Total %' },
  presencias: { eu: 'Presentziak', es: 'Presencias' },
  faltas: { eu: 'Faltak', es: 'Faltas' },
  sesiones: { eu: 'Saioak', es: 'Sesiones' },
  eliminarJugador: { eu: '🗑 Jokalaria ezabatu', es: '🗑 Eliminar jugador' },
  subirFoto: { eu: '📷 Argazkia igo', es: '📷 Subir foto' },
  cerrar: { eu: 'Itxi', es: 'Cerrar' },
  sinDatos: { eu: 'Ez dago daturik', es: 'Sin datos' },
  sinAcceso: { eu: 'Sarbiderik ez', es: 'Sin acceso' },
  sinAccesoAsistenciaMensaje: {
    eu: 'Ez duzu talde honen asistentziara sarbiderik.',
    es: 'No tienes acceso a la asistencia de este equipo.',
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

const MESES: Record<string, { eu: string; es: string }> = {
  '01': { eu: 'Urtarrila', es: 'Enero' },
  '02': { eu: 'Otsaila', es: 'Febrero' },
  '03': { eu: 'Martxoa', es: 'Marzo' },
  '04': { eu: 'Apirila', es: 'Abril' },
  '05': { eu: 'Maiatza', es: 'Mayo' },
  '06': { eu: 'Ekaina', es: 'Junio' },
  '07': { eu: 'Uztaila', es: 'Julio' },
  '08': { eu: 'Abuztua', es: 'Agosto' },
  '09': { eu: 'Iraila', es: 'Septiembre' },
  '10': { eu: 'Urria', es: 'Octubre' },
  '11': { eu: 'Azaroa', es: 'Noviembre' },
  '12': { eu: 'Abendua', es: 'Diciembre' },
}

export function mesLabel(mes: string, lang: Lang = DEFAULT_LANG): string {
  const [, mm] = mes.split('-')
  return MESES[mm]?.[lang] ?? mes
}

const DIAS_SEMANA: Record<number, { eu: string; es: string }> = {
  1: { eu: 'Al', es: 'Lu' },
  2: { eu: 'Ar', es: 'Ma' },
  3: { eu: 'Az', es: 'Mi' },
  4: { eu: 'Og', es: 'Ju' },
  5: { eu: 'Or', es: 'Vi' },
  6: { eu: 'Lr', es: 'Sá' },
  7: { eu: 'Ig', es: 'Do' },
}

export function diaSemanaLabel(fechaISO: string, lang: Lang = DEFAULT_LANG): string {
  const date = new Date(`${fechaISO}T00:00:00Z`)
  const dow = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
  return DIAS_SEMANA[dow]?.[lang] ?? ''
}
