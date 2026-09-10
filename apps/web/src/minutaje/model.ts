export interface Persona {
  nombre: string
  alias: string | null
  foto_url: string | null
}

export interface Participacion {
  miembro_equipo_id: string
  persona: Persona
  convocado: boolean
  jugado: boolean
  titular: boolean
  baja: string | null
  minutos: number
  goles: number
}

export interface JornadaDetalle {
  numero: number
  rival: string | null
  fecha: string | null
  campo: 'local' | 'visitante' | null
  goles_favor: number
  goles_contra: number
  participaciones: Participacion[]
}

export interface JornadaResumen {
  id: string
  numero: number
  rival: string | null
  fecha: string | null
  campo: 'local' | 'visitante'
  goles_favor: number
  goles_contra: number
  participaciones: {
    miembro_equipo_id: string
    convocado: boolean
    jugado: boolean
    titular: boolean
    baja: string | null
    minutos: number
    goles: number
  }[]
}

export interface DashboardMiembro {
  miembro_equipo_id: string
  persona: Persona
  jornadasDesdeDebut: number
  disponibles: number
  convocados: number
  jugados: number
  titulares: number
  decTec: number
  minutos: number
  goles: number
  bajas: Record<string, number>
  porcentaje_total: number | '--'
  porcentaje_conv: number | '--'
  porcentaje_disp: number | '--'
  alerta: 'intervenir' | 'vigilar' | null
}

export function duracionPartido(equipo: { minutos_por_periodo: number; num_periodos: number }): number {
  return equipo.minutos_por_periodo * equipo.num_periodos
}

export function aplicarReglasParticipacion<T extends Pick<Participacion, 'convocado' | 'jugado' | 'titular' | 'baja' | 'minutos'>>(
  input: T,
  duracion: number,
): T {
  let { convocado, jugado, titular, minutos } = input
  const { baja } = input

  if (titular) {
    convocado = true
    jugado = true
    if (minutos === 0) minutos = duracion
  } else if (jugado) {
    convocado = true
  }

  if (baja) {
    convocado = false
    jugado = false
    titular = false
  }

  return { ...input, convocado, jugado, titular, minutos }
}
