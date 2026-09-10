import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { equipo } from '../generated/prisma/client'
import { Campo, BajaTipo } from '../generated/prisma/enums'
import { miembroActivoEnFecha } from './miembro-activo'

export interface ParticipacionInput {
  miembro_equipo_id: string
  convocado: boolean
  jugado: boolean
  titular: boolean
  baja?: BajaTipo | null
  minutos: number
  goles: number
}

export interface JornadaInput {
  numero: number
  rival?: string
  fecha?: string
  campo: Campo
  goles_favor: number
  goles_contra: number
  participaciones: ParticipacionInput[]
}

const MARGEN_POR_PERIODOS: Record<number, number> = { 2: 30, 3: 10 }

export function duracionPartido(equipo: { minutos_por_periodo: number; num_periodos: number }): number {
  return equipo.minutos_por_periodo * equipo.num_periodos
}

export function validarMinutos(minutos: number, equipo: { minutos_por_periodo: number; num_periodos: number }): void {
  const duracion = duracionPartido(equipo)
  const margen = MARGEN_POR_PERIODOS[equipo.num_periodos] ?? 0
  if (minutos > duracion + margen) {
    throw new BadRequestException(`minutos no puede superar ${duracion + margen} para este equipo`)
  }
}

export function aplicarReglasParticipacion(input: ParticipacionInput, duracion: number): ParticipacionInput {
  let { convocado, jugado, titular, minutos } = input
  const { baja, goles, miembro_equipo_id } = input

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

  return { miembro_equipo_id, convocado, jugado, titular, baja: baja ?? null, minutos, goles }
}

@Injectable()
export class JornadasService {
  constructor(private readonly prisma: PrismaService) {}

  private async miembrosActivos(equipoId: string) {
    return this.prisma.miembro_equipo.findMany({
      where: { equipo_id: equipoId, OR: [{ fecha_baja: null }, { fecha_baja: { gt: new Date() } }] },
      orderBy: { orden: 'asc' },
      include: { persona: true },
    })
  }

  async listarJornadas(equipo: equipo, bloqueId: string) {
    const jornadas = await this.prisma.jornada.findMany({
      where: { equipo_id: equipo.id, bloque_id: bloqueId },
      orderBy: { numero: 'desc' },
      include: { participaciones: true },
    })

    return jornadas.map((jornada) => ({
      id: jornada.id,
      numero: jornada.numero,
      rival: jornada.rival,
      fecha: jornada.fecha,
      campo: jornada.campo,
      goles_favor: jornada.goles_favor,
      goles_contra: jornada.goles_contra,
      participaciones: jornada.participaciones.map((p) => ({
        miembro_equipo_id: p.miembro_equipo_id,
        convocado: p.convocado,
        jugado: p.jugado,
        titular: p.titular,
        baja: p.baja,
        minutos: p.minutos,
        goles: p.goles,
      })),
    }))
  }

  async getJornadaPorNumero(equipo: equipo, bloqueId: string, numero: number) {
    const jornada = await this.prisma.jornada.findUnique({
      where: { equipo_id_bloque_id_numero: { equipo_id: equipo.id, bloque_id: bloqueId, numero } },
      include: { participaciones: true },
    })

    const fechaReferencia = jornada?.fecha ?? new Date()
    const miembros = (await this.miembrosActivos(equipo.id)).filter((m) => miembroActivoEnFecha(m, fechaReferencia))

    const participacionPorMiembro = new Map((jornada?.participaciones ?? []).map((p) => [p.miembro_equipo_id, p]))

    return {
      numero,
      rival: jornada?.rival ?? null,
      fecha: jornada?.fecha ?? null,
      campo: jornada?.campo ?? null,
      goles_favor: jornada?.goles_favor ?? 0,
      goles_contra: jornada?.goles_contra ?? 0,
      participaciones: miembros.map((miembro) => {
        const p = participacionPorMiembro.get(miembro.id)
        return {
          miembro_equipo_id: miembro.id,
          persona: {
            nombre: miembro.persona.nombre,
            alias: miembro.persona.alias,
            foto_url: miembro.persona.foto_url,
          },
          convocado: p?.convocado ?? false,
          jugado: p?.jugado ?? false,
          titular: p?.titular ?? false,
          baja: p?.baja ?? null,
          minutos: p?.minutos ?? 0,
          goles: p?.goles ?? 0,
        }
      }),
    }
  }

  async guardarJornada(equipo: equipo, bloqueId: string, input: JornadaInput) {
    const duracion = duracionPartido(equipo)
    for (const p of input.participaciones) {
      validarMinutos(p.minutos, equipo)
    }
    const participaciones = input.participaciones.map((p) => aplicarReglasParticipacion(p, duracion))

    const jornada = await this.prisma.jornada.upsert({
      where: { equipo_id_bloque_id_numero: { equipo_id: equipo.id, bloque_id: bloqueId, numero: input.numero } },
      create: {
        equipo_id: equipo.id,
        bloque_id: bloqueId,
        numero: input.numero,
        rival: input.rival,
        fecha: input.fecha ? new Date(input.fecha) : undefined,
        campo: input.campo,
        goles_favor: input.goles_favor,
        goles_contra: input.goles_contra,
      },
      update: {
        rival: input.rival,
        fecha: input.fecha ? new Date(input.fecha) : undefined,
        campo: input.campo,
        goles_favor: input.goles_favor,
        goles_contra: input.goles_contra,
      },
    })

    await this.prisma.participacion_jornada.deleteMany({ where: { jornada_id: jornada.id } })
    if (participaciones.length > 0) {
      await this.prisma.participacion_jornada.createMany({
        data: participaciones.map((p) => ({ ...p, jornada_id: jornada.id })),
      })
    }

    return this.getJornadaPorNumero(equipo, bloqueId, input.numero)
  }

  async actualizarParticipacion(
    equipo: equipo,
    bloqueId: string,
    numero: number,
    miembroEquipoId: string,
    input: Omit<ParticipacionInput, 'miembro_equipo_id'>,
  ) {
    const duracion = duracionPartido(equipo)
    validarMinutos(input.minutos, equipo)
    const participacion = aplicarReglasParticipacion({ ...input, miembro_equipo_id: miembroEquipoId }, duracion)

    const jornada = await this.prisma.jornada.upsert({
      where: { equipo_id_bloque_id_numero: { equipo_id: equipo.id, bloque_id: bloqueId, numero } },
      create: { equipo_id: equipo.id, bloque_id: bloqueId, numero, campo: Campo.local, goles_favor: 0, goles_contra: 0 },
      update: {},
    })

    return this.prisma.participacion_jornada.upsert({
      where: { jornada_id_miembro_equipo_id: { jornada_id: jornada.id, miembro_equipo_id: miembroEquipoId } },
      create: { jornada_id: jornada.id, ...participacion },
      update: participacion,
    })
  }

  async getDashboard(equipo: equipo, bloqueId: string) {
    const duracion = duracionPartido(equipo)
    const miembros = await this.miembrosActivos(equipo.id)
    const jornadas = await this.prisma.jornada.findMany({
      where: { equipo_id: equipo.id, bloque_id: bloqueId },
      include: { participaciones: true },
    })

    return miembros.map((miembro) => {
      const jornadasDesdeDebut = jornadas.filter(
        (j) => j.fecha === null || miembroActivoEnFecha(miembro, j.fecha),
      )
      const participaciones = jornadasDesdeDebut
        .map((j) => j.participaciones.find((p) => p.miembro_equipo_id === miembro.id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)

      const disponibles = participaciones.filter((p) => p.baja === null)
      const convocados = participaciones.filter((p) => p.convocado)
      const jugados = participaciones.filter((p) => p.jugado)
      const titulares = participaciones.filter((p) => p.titular)
      const decTec = disponibles.filter((p) => !p.convocado).length
      const minutos = participaciones.reduce((acc, p) => acc + p.minutos, 0)
      const goles = participaciones.reduce((acc, p) => acc + p.goles, 0)
      const bajas = participaciones.reduce<Record<string, number>>((acc, p) => {
        if (p.baja) acc[p.baja] = (acc[p.baja] ?? 0) + 1
        return acc
      }, {})

      const pct = (denominador: number): number | '--' =>
        denominador === 0 ? '--' : Math.round((minutos / (denominador * duracion)) * 1000) / 10

      const porcentajeTotal = pct(jornadasDesdeDebut.length)
      const porcentajeConv = pct(convocados.length)
      const porcentajeDisp = pct(disponibles.length)

      let alerta: 'intervenir' | 'vigilar' | null = null
      if (disponibles.length >= 2 && typeof porcentajeDisp === 'number') {
        if (porcentajeDisp < 50) alerta = 'intervenir'
        else if (porcentajeDisp < 70) alerta = 'vigilar'
      }

      return {
        miembro_equipo_id: miembro.id,
        persona: {
          nombre: miembro.persona.nombre,
          alias: miembro.persona.alias,
          foto_url: miembro.persona.foto_url,
        },
        jornadasDesdeDebut: jornadasDesdeDebut.length,
        disponibles: disponibles.length,
        convocados: convocados.length,
        jugados: jugados.length,
        titulares: titulares.length,
        decTec,
        minutos,
        goles,
        bajas,
        porcentaje_total: porcentajeTotal,
        porcentaje_conv: porcentajeConv,
        porcentaje_disp: porcentajeDisp,
        alerta,
      }
    })
  }
}
