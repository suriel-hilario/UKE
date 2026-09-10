import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma, equipo } from '../generated/prisma/client'
import { Categoria, MiembroGrupo } from '../generated/prisma/enums'
import { ESTADOS_VALIDOS, ESTADOS_QUE_COMPUTAN } from './estados'
import { miembroActivoEnFecha } from './miembro-activo'

export interface CreateSesionInput {
  tipo: 'entrenamiento' | 'partido'
  fecha: string
  numero?: number
}

function parseMes(mes: string): { inicio: Date; fin: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(mes)
  if (!match) {
    throw new BadRequestException('mes debe tener el formato YYYY-MM')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const inicio = new Date(Date.UTC(year, month - 1, 1))
  const fin = new Date(Date.UTC(year, month, 0))
  return { inicio, fin }
}

function toDowLunes1(date: Date): number {
  const jsDay = date.getUTCDay()
  return jsDay === 0 ? 7 : jsDay
}

function formatDateISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

const MIEMBRO_ACTIVO_EN = (fecha: Date) => ({
  fecha_incorporacion: { lte: fecha },
  OR: [{ fecha_baja: null }, { fecha_baja: { gte: fecha } }],
})

@Injectable()
export class SesionesService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureSesionesRegla(equipo: equipo, bloqueId: string, mes: string): Promise<void> {
    const { inicio, fin } = parseMes(mes)

    const temporada = await this.prisma.temporada.findUniqueOrThrow({ where: { id: equipo.temporada_id } })
    const rangoInicio = inicio < temporada.fecha_inicio ? temporada.fecha_inicio : inicio
    const rangoFin = fin > temporada.fecha_fin ? temporada.fecha_fin : fin
    if (rangoInicio > rangoFin) return

    const festivos = await this.prisma.festivo.findMany({
      where: { temporada_id: equipo.temporada_id, fecha: { gte: rangoInicio, lte: rangoFin } },
    })
    const festivoSet = new Set(festivos.map((f) => formatDateISO(f.fecha)))

    const fechas: Date[] = []
    for (let d = new Date(rangoInicio); d <= rangoFin; d.setUTCDate(d.getUTCDate() + 1)) {
      const fecha = new Date(d)
      if (!equipo.dias_entrenamiento.includes(toDowLunes1(fecha))) continue
      if (festivoSet.has(formatDateISO(fecha))) continue
      fechas.push(fecha)
    }

    if (fechas.length === 0) return

    await this.prisma.sesion.createMany({
      data: fechas.map((fecha) => ({
        equipo_id: equipo.id,
        bloque_id: bloqueId,
        fecha,
        tipo: 'entrenamiento' as const,
        origen: 'regla' as const,
      })),
      skipDuplicates: true,
    })
  }

  async getAsistenciaMensual(equipo: equipo, bloqueId: string, mes: string, grupos: MiembroGrupo[]) {
    const { inicio, fin } = parseMes(mes)

    const sesiones = await this.prisma.sesion.findMany({
      where: { equipo_id: equipo.id, bloque_id: bloqueId, eliminada: false, fecha: { gte: inicio, lte: fin } },
      orderBy: { fecha: 'asc' },
    })

    const sesionesHastaFinMes = await this.prisma.sesion.findMany({
      where: { equipo_id: equipo.id, bloque_id: bloqueId, eliminada: false, fecha: { lte: fin } },
    })

    const miembros = await this.prisma.miembro_equipo.findMany({
      where: {
        equipo_id: equipo.id,
        grupo: { in: grupos },
        fecha_incorporacion: { lte: fin },
        OR: [{ fecha_baja: null }, { fecha_baja: { gt: new Date() } }],
      },
      orderBy: { orden: 'asc' },
      include: { persona: true },
    })

    const registros = await this.prisma.registro_asistencia.findMany({
      where: { sesion_id: { in: sesiones.map((s) => s.id) } },
    })
    const registroPorClave = new Map(registros.map((r) => [`${r.sesion_id}:${r.miembro_equipo_id}`, r]))

    const registrosHastaFinMes = await this.prisma.registro_asistencia.findMany({
      where: { sesion_id: { in: sesionesHastaFinMes.map((s) => s.id) } },
    })
    const computan = new Set(ESTADOS_QUE_COMPUTAN[equipo.categoria])

    const miembrosConRegistros = miembros.map((miembro) => {
      const registrosMiembroMes = registros.filter((r) => r.miembro_equipo_id === miembro.id)
      const activasMes = sesiones.filter((s) => miembroActivoEnFecha(miembro, s.fecha)).length
      const computanMes = registrosMiembroMes.filter((r) => computan.has(r.estado)).length

      const sesionesActivasHastaMes = sesionesHastaFinMes.filter((s) => miembroActivoEnFecha(miembro, s.fecha))
      const registrosMiembroHastaMes = registrosHastaFinMes.filter((r) => r.miembro_equipo_id === miembro.id)
      const computanHastaMes = registrosMiembroHastaMes.filter((r) => computan.has(r.estado)).length

      return {
        id: miembro.id,
        grupo: miembro.grupo,
        rol_entrenador: miembro.rol_entrenador,
        orden: miembro.orden,
        persona: {
          nombre: miembro.persona.nombre,
          alias: miembro.persona.alias,
          foto_url: miembro.persona.foto_url,
        },
        registros: sesiones
          .filter((sesion) => miembroActivoEnFecha(miembro, sesion.fecha))
          .map((sesion) => {
            const registro = registroPorClave.get(`${sesion.id}:${miembro.id}`)
            return {
              sesion_id: sesion.id,
              estado: registro?.estado ?? null,
              nota: registro?.nota ?? null,
            }
          }),
        contadores: this.contarPorEstado(registrosMiembroMes),
        porcentaje_mes: activasMes === 0 ? null : Math.round((computanMes / activasMes) * 1000) / 10,
        porcentaje_ano:
          sesionesActivasHastaMes.length === 0
            ? null
            : Math.round((computanHastaMes / sesionesActivasHastaMes.length) * 1000) / 10,
      }
    })

    return { sesiones, miembros: miembrosConRegistros }
  }

  async exportarCsv(equipo: equipo, bloqueId: string, mes: string): Promise<string> {
    const { sesiones, miembros } = await this.getAsistenciaMensual(equipo, bloqueId, mes, ['con_ficha', 'sin_ficha'])

    const header = ['Jugador', ...sesiones.map((s) => formatDateISO(s.fecha)), '%'].join(',')

    const rows = miembros.map((miembro) => {
      const celdas = sesiones.map((sesion) => {
        const registro = miembro.registros.find((r) => r.sesion_id === sesion.id)
        return registro?.estado ?? ''
      })
      const presentes = miembro.registros.filter((r) => r.estado === 'P').length
      const porcentaje = miembro.registros.length === 0 ? '' : ((presentes / miembro.registros.length) * 100).toFixed(1)
      const nombre = miembro.persona.nombre.includes(',') ? `"${miembro.persona.nombre}"` : miembro.persona.nombre
      return [nombre, ...celdas, porcentaje].join(',')
    })

    return [header, ...rows].join('\n')
  }

  async exportarCsvF11(equipo: equipo): Promise<string> {
    const temporada = await this.prisma.temporada.findUniqueOrThrow({ where: { id: equipo.temporada_id } })
    const computan = new Set(ESTADOS_QUE_COMPUTAN[equipo.categoria])

    const sesiones = await this.prisma.sesion.findMany({
      where: { equipo_id: equipo.id, eliminada: false },
      orderBy: { fecha: 'asc' },
    })

    const miembros = await this.prisma.miembro_equipo.findMany({
      where: {
        equipo_id: equipo.id,
        OR: [{ fecha_baja: null }, { fecha_baja: { gt: new Date() } }],
      },
      orderBy: { orden: 'asc' },
      include: { persona: true },
    })

    const registros = await this.prisma.registro_asistencia.findMany({
      where: { sesion_id: { in: sesiones.map((s) => s.id) } },
    })
    const registroPorClave = new Map(registros.map((r) => [`${r.sesion_id}:${r.miembro_equipo_id}`, r]))

    const seccionLabel: Record<string, string> = {
      con_ficha: 'Con Ficha',
      sin_ficha: 'Sin Ficha',
      entrenador: 'Entrenadores',
    }

    const CONTADOR_COLS = ['EM', 'RC', 'LS', 'EN', 'TR', 'EX', 'VA', 'OT', 'NJ']

    const sesionesPorMes = new Map<string, typeof sesiones>()
    for (const sesion of sesiones) {
      const mes = formatDateISO(sesion.fecha).slice(0, 7)
      const lista = sesionesPorMes.get(mes) ?? []
      lista.push(sesion)
      sesionesPorMes.set(mes, lista)
    }
    const meses = Array.from(sesionesPorMes.keys()).sort()

    const lineas: string[] = []
    for (const mes of meses) {
      const sesionesMes = sesionesPorMes.get(mes)!
      const sesionesHastaMes = sesiones.filter((s) => formatDateISO(s.fecha).slice(0, 7) <= mes)

      const header = [
        'SECCION',
        'JUGADOR',
        'ALIAS',
        '%ANO',
        '%MES',
        ...sesionesMes.map((s) => `S${s.numero ?? ''}d${new Date(s.fecha).getUTCDate()}`),
        'TOT',
        ...CONTADOR_COLS,
      ]
      lineas.push(header.join(';'))

      for (const miembro of miembros) {
        const activoDesde = (fecha: Date) =>
          miembro.fecha_incorporacion <= fecha && (!miembro.fecha_baja || miembro.fecha_baja >= fecha)

        const registrosHastaMes = sesionesHastaMes
          .filter((s) => activoDesde(s.fecha))
          .map((s) => registroPorClave.get(`${s.id}:${miembro.id}`))
          .filter((r): r is NonNullable<typeof r> => !!r)
        const registrosMes = sesionesMes
          .filter((s) => activoDesde(s.fecha))
          .map((s) => registroPorClave.get(`${s.id}:${miembro.id}`))
          .filter((r): r is NonNullable<typeof r> => !!r)

        const computanHastaMes = registrosHastaMes.filter((r) => computan.has(r.estado)).length
        const computanMes = registrosMes.filter((r) => computan.has(r.estado)).length
        const denomHastaMes = sesionesHastaMes.filter((s) => activoDesde(s.fecha)).length
        const denomMes = sesionesMes.filter((s) => activoDesde(s.fecha)).length

        const pctAno = denomHastaMes === 0 ? '' : ((computanHastaMes / denomHastaMes) * 100).toFixed(2)
        const pctMes = denomMes === 0 ? '' : ((computanMes / denomMes) * 100).toFixed(2)

        const celdas = sesionesMes.map((s) => {
          if (!activoDesde(s.fecha)) return ''
          return registroPorClave.get(`${s.id}:${miembro.id}`)?.estado ?? ''
        })

        const contadoresMes = this.contarPorEstado(registrosMes)
        const nombre = miembro.persona.nombre.toUpperCase()
        const alias = miembro.persona.alias ?? ''

        const fila = [
          seccionLabel[miembro.grupo] ?? miembro.grupo,
          nombre,
          alias,
          pctAno,
          pctMes,
          ...celdas,
          String(computanMes),
          ...CONTADOR_COLS.map((c) => String(contadoresMes[c] ?? 0)),
        ]
        lineas.push(fila.join(';'))
      }
    }

    const BOM = '﻿'
    return BOM + lineas.join('\n')
  }

  private contarPorEstado(registros: { estado: string }[]): Record<string, number> {
    const contadores: Record<string, number> = {}
    for (const registro of registros) {
      contadores[registro.estado] = (contadores[registro.estado] ?? 0) + 1
    }
    return contadores
  }

  async upsertRegistro(sesionId: string, miembroEquipoId: string, estado: string, categoria: Categoria, nota?: string) {
    if (!ESTADOS_VALIDOS[categoria].includes(estado)) {
      throw new BadRequestException(
        `estado debe ser uno de: ${ESTADOS_VALIDOS[categoria].join(', ')}`,
      )
    }

    return this.prisma.registro_asistencia.upsert({
      where: { sesion_id_miembro_equipo_id: { sesion_id: sesionId, miembro_equipo_id: miembroEquipoId } },
      create: { sesion_id: sesionId, miembro_equipo_id: miembroEquipoId, estado, nota },
      update: { estado, nota },
    })
  }

  setSesionEliminada(sesionId: string, eliminada: boolean) {
    return this.prisma.sesion.update({ where: { id: sesionId }, data: { eliminada } })
  }

  async createSesionManual(equipoId: string, input: CreateSesionInput, bloqueId: string) {
    if (!input.tipo || !input.fecha) {
      throw new BadRequestException('tipo y fecha son obligatorios')
    }

    try {
      return await this.prisma.sesion.create({
        data: {
          equipo_id: equipoId,
          bloque_id: bloqueId,
          fecha: new Date(input.fecha),
          tipo: input.tipo,
          numero: input.numero,
          origen: 'manual',
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Ya existe una sesión para ese equipo, fecha y tipo')
      }
      throw error
    }
  }
}
