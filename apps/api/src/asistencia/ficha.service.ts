import { Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { getBloqueActivo } from './bloque-activo'
import { ESTADOS_QUE_COMPUTAN } from './estados'

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

@Injectable()
export class FichaService {
  constructor(private readonly prisma: PrismaService) {}

  async getFicha(miembroId: string, equipoId: string) {
    const miembro = await this.prisma.miembro_equipo.findUniqueOrThrow({
      where: { id: miembroId },
      include: { persona: true },
    })
    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })

    const sesionesTemporada = await this.prisma.sesion.findMany({
      where: { equipo_id: equipoId, eliminada: false },
      orderBy: { fecha: 'asc' },
    })
    const sesionesQueComputan = sesionesTemporada.filter((s) => this.computaParaMiembro(miembro, s.fecha))

    const registros = await this.prisma.registro_asistencia.findMany({
      where: {
        miembro_equipo_id: miembroId,
        sesion_id: { in: sesionesQueComputan.map((s) => s.id) },
      },
    })
    const computan = new Set(ESTADOS_QUE_COMPUTAN[equipo.categoria])
    const presentes = registros.filter((r) => computan.has(r.estado)).length

    const bloqueActivo = await getBloqueActivo(this.prisma, equipo.temporada_id)
    const sesionesBloqueActivo = sesionesQueComputan.filter((s) => s.bloque_id === bloqueActivo.id)

    const porMes = new Map<string, { sesiones: number; presencias: number }>()
    for (const sesion of sesionesBloqueActivo) {
      const mes = sesion.fecha.toISOString().slice(0, 7)
      const actual = porMes.get(mes) ?? { sesiones: 0, presencias: 0 }
      actual.sesiones += 1
      if (registros.some((r) => r.sesion_id === sesion.id && computan.has(r.estado))) {
        actual.presencias += 1
      }
      porMes.set(mes, actual)
    }

    const sesionesPorMes = new Map<string, typeof sesionesBloqueActivo>()
    for (const sesion of sesionesBloqueActivo) {
      const mes = sesion.fecha.toISOString().slice(0, 7)
      const lista = sesionesPorMes.get(mes) ?? []
      lista.push(sesion)
      sesionesPorMes.set(mes, lista)
    }

    const desgloseMensual = Array.from(porMes.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, { sesiones, presencias }]) => ({
        mes,
        sesiones,
        presencias,
        porcentaje: sesiones === 0 ? '--' : round1((presencias / sesiones) * 100),
        detalle_sesiones: (sesionesPorMes.get(mes) ?? []).map((sesion) => ({
          fecha: sesion.fecha,
          estado: registros.find((r) => r.sesion_id === sesion.id)?.estado ?? null,
        })),
      }))

    const contadores: Record<string, number> = {}
    for (const registro of registros) {
      contadores[registro.estado] = (contadores[registro.estado] ?? 0) + 1
    }

    return {
      persona: {
        nombre: miembro.persona.nombre,
        alias: miembro.persona.alias,
        foto_url: miembro.persona.foto_url,
      },
      grupo: miembro.grupo,
      fecha_incorporacion: miembro.fecha_incorporacion,
      estadisticas: {
        porcentaje_total:
          sesionesQueComputan.length === 0 ? '--' : round1((presentes / sesionesQueComputan.length) * 100),
        presencias: presentes,
        faltas: sesionesQueComputan.length - presentes,
        sesiones: sesionesQueComputan.length,
      },
      contadores,
      desglose_mensual: desgloseMensual,
    }
  }

  private computaParaMiembro(miembro: { fecha_incorporacion: Date; fecha_baja: Date | null }, fecha: Date): boolean {
    if (miembro.fecha_incorporacion > fecha) return false
    if (miembro.fecha_baja && miembro.fecha_baja < fecha) return false
    return true
  }
}
