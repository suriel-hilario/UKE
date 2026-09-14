// G-C5: literales en euskera (default) y castellano. No existe aún (fuera de alcance
// de add-auth/add-backoffice) un endpoint que exponga la preferencia de idioma persistida
// del usuario, así que el default de instancia (euskera) se aplica siempre; `t(key, 'es')`
// queda disponible para cuando ese mecanismo exista.
export type Lang = 'eu' | 'es'

const DICT = {
  usuarios: { eu: 'Erabiltzaileak', es: 'Usuarios' },
  temporadas: { eu: 'Denboraldiak', es: 'Temporadas' },
  equipos: { eu: 'Taldeak', es: 'Equipos' },
  historico: { eu: 'Historikoa', es: 'Histórico' },
  crear: { eu: 'Sortu', es: 'Crear' },
  editar: { eu: 'Editatu', es: 'Editar' },
  guardar: { eu: 'Gorde', es: 'Guardar' },
  cancelar: { eu: 'Utzi', es: 'Cancelar' },
  deshabilitar: { eu: 'Desgaitu', es: 'Deshabilitar' },
  resetPassword: { eu: 'Pasahitza berrezarri', es: 'Restablecer contraseña' },
  nombre: { eu: 'Izena', es: 'Nombre' },
  email: { eu: 'Emaila', es: 'Email' },
  rol: { eu: 'Rola', es: 'Rol' },
  estado: { eu: 'Egoera', es: 'Estado' },
  abierta: { eu: 'Irekita', es: 'Abierta' },
  cerrada: { eu: 'Itxita', es: 'Cerrada' },
  cerrarTemporada: { eu: 'Denboraldia itxi', es: 'Cerrar temporada' },
  cerrarTemporadaConfirm: {
    eu: 'Ekintza hau ezin da desegin. Temporadaren datu guztiak irakurtzeko soilik izango dira.',
    es: 'Esta acción no se puede deshacer. Todos los datos de la temporada quedarán en solo lectura.',
  },
  confirmar: { eu: 'Berretsi', es: 'Confirmar' },
  importarJugadoreak: { eu: 'Jokalariak inportatu', es: 'Importar jugadores' },
  fechaIncorporacion: { eu: 'Sarrera data', es: 'Fecha de incorporación' },
  fechaBaja: { eu: 'Baja data', es: 'Fecha de baja' },
  grupo: { eu: 'Taldea', es: 'Grupo' },
  orden: { eu: 'Ordena', es: 'Orden' },
  sinPermiso: { eu: 'Baimenik ez', es: 'Sin permiso' },
  salir: { eu: 'Irten', es: 'Salir' },
  bloques: { eu: 'Blokeak', es: 'Bloques' },
  festivos: { eu: 'Jaiegunak', es: 'Festivos' },
  descripcion: { eu: 'Deskribapena', es: 'Descripción' },
  categoria: { eu: 'Kategoria', es: 'Categoría' },
  color: { eu: 'Kolorea', es: 'Color' },
  icono: { eu: 'Ikonoa', es: 'Icono' },
  fila: { eu: 'Errenkada', es: 'Fila' },
  campo: { eu: 'Eremua', es: 'Campo' },
  error: { eu: 'Errorea', es: 'Error' },
  lunes: { eu: 'A', es: 'L' },
  martes: { eu: 'A', es: 'M' },
  miercoles: { eu: 'A', es: 'X' },
  jueves: { eu: 'O', es: 'J' },
  viernes: { eu: 'O', es: 'V' },
  sabado: { eu: 'L', es: 'S' },
  domingo: { eu: 'I', es: 'D' },
} as const

export type DictKey = keyof typeof DICT

const DEFAULT_LANG: Lang = 'eu'

export function t(key: DictKey, lang: Lang = DEFAULT_LANG): string {
  return DICT[key][lang]
}
