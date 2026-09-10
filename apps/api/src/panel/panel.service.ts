import { ForbiddenException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { AsistenciaAccessService } from '../asistencia/asistencia-access.service'
import { miembroActivoEnFecha } from '../asistencia/miembro-activo'
import { usuario, bloque, equipo } from '../generated/prisma/client'
import { UsuarioRol } from '../generated/prisma/enums'

type Semaforo = 'verde' | 'rojo' | 'sin_datos'

export interface EquipoEstado {
  id: string
  nombre: string
  categoria: string
  asistencia_pendiente: boolean | null
  minutaje_pendiente: boolean | null
  semaforo: Semaforo
  ultima_actualizacion_asistencia: Date | null
  ultima_actualizacion_minutaje: Date | null
}

export interface EquipoEstadoDetalle extends EquipoEstado {
  sesiones_pendientes: { fecha: Date; tipo: string }[]
  jornadas_pendientes: { numero: number; fecha: Date | null; rival: string | null }[]
}

const GRUPOS_ASISTENCIA = ['con_ficha', 'sin_ficha'] as const

@Injectable()
export class PanelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AsistenciaAccessService,
  ) {}

  assertRolPanel(usuario: usuario): void {
    if (usuario.rol !== UsuarioRol.director && usuario.rol !== UsuarioRol.coordinador) {
      throw new ForbiddenException()
    }
  }

  async getEstadoTemporada(usuario: usuario, temporadaId: string): Promise<EquipoEstado[]> {
    this.assertRolPanel(usuario)
    const where = this.access.getEquiposWhere(usuario, temporadaId)
    const equipos = await this.prisma.equipo.findMany({ where, orderBy: { nombre: 'asc' } })
    return Promise.all(equipos.map((equipo) => this.calcularEstado(equipo)))
  }

  async getEstadoEquipo(usuario: usuario, equipoId: string): Promise<EquipoEstadoDetalle> {
    this.assertRolPanel(usuario)
    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    const where = this.access.getEquiposWhere(usuario, equipo.temporada_id)
    const match = await this.prisma.equipo.findFirst({ where: { AND: [where, { id: equipoId }] } })
    if (!match) throw new ForbiddenException()
    return this.calcularEstadoDetalle(equipo)
  }

  /** Bloque con `fecha_activacion` más reciente `<= hoy`, o `null` si ninguno cumple (design.md § D9). */
  private async resolverBloqueActivo(temporadaId: string): Promise<bloque | null> {
    const hoy = new Date()
    const bloques = await this.prisma.bloque.findMany({
      where: { temporada_id: temporadaId, fecha_activacion: { lte: hoy } },
      orderBy: { fecha_activacion: 'desc' },
      take: 1,
    })
    return bloques[0] ?? null
  }

  private async calcularEstado(equipo: equipo): Promise<EquipoEstado> {
    const bloqueActivo = await this.resolverBloqueActivo(equipo.temporada_id)
    if (!bloqueActivo) {
      return {
        id: equipo.id,
        nombre: equipo.nombre,
        categoria: equipo.categoria,
        asistencia_pendiente: null,
        minutaje_pendiente: null,
        semaforo: 'sin_datos',
        ultima_actualizacion_asistencia: null,
        ultima_actualizacion_minutaje: null,
      }
    }

    const { pendiente: asistenciaPendiente, ultimaActualizacion: ultimaAsistencia } =
      await this.calcularAsistencia(equipo, bloqueActivo)
    const esEskola = equipo.categoria === 'eskola'
    const { pendiente: minutajePendiente, ultimaActualizacion: ultimaMinutaje } = esEskola
      ? { pendiente: null, ultimaActualizacion: null }
      : await this.calcularMinutaje(equipo, bloqueActivo)

    const semaforo: Semaforo = asistenciaPendiente === true || minutajePendiente === true ? 'rojo' : 'verde'

    return {
      id: equipo.id,
      nombre: equipo.nombre,
      categoria: equipo.categoria,
      asistencia_pendiente: asistenciaPendiente,
      minutaje_pendiente: minutajePendiente,
      semaforo,
      ultima_actualizacion_asistencia: ultimaAsistencia,
      ultima_actualizacion_minutaje: ultimaMinutaje,
    }
  }

  private async calcularEstadoDetalle(equipo: equipo): Promise<EquipoEstadoDetalle> {
    const base = await this.calcularEstado(equipo)
    const bloqueActivo = await this.resolverBloqueActivo(equipo.temporada_id)
    if (!bloqueActivo) {
      return { ...base, sesiones_pendientes: [], jornadas_pendientes: [] }
    }

    const { sesionesPendientes } = await this.calcularAsistencia(equipo, bloqueActivo, true)
    const esEskola = equipo.categoria === 'eskola'
    const { jornadasPendientes } = esEskola
      ? { jornadasPendientes: [] }
      : await this.calcularMinutaje(equipo, bloqueActivo, true)

    return { ...base, sesiones_pendientes: sesionesPendientes ?? [], jornadas_pendientes: jornadasPendientes ?? [] }
  }

  private async calcularAsistencia(
    equipo: equipo,
    bloqueActivo: bloque,
    incluirPendientes = false,
  ): Promise<{
    pendiente: boolean
    ultimaActualizacion: Date | null
    sesionesPendientes?: { fecha: Date; tipo: string }[]
  }> {
    const hoy = new Date()

    const sesiones = await this.prisma.sesion.findMany({
      where: { equipo_id: equipo.id, bloque_id: bloqueActivo.id, eliminada: false, fecha: { lte: hoy } },
      orderBy: { fecha: 'asc' },
    })

    const miembros = await this.prisma.miembro_equipo.findMany({
      where: { equipo_id: equipo.id, grupo: { in: [...GRUPOS_ASISTENCIA] } },
    })

    const registros = await this.prisma.registro_asistencia.findMany({
      where: { sesion_id: { in: sesiones.map((s) => s.id) } },
    })
    const registroSet = new Set(registros.map((r) => `${r.sesion_id}:${r.miembro_equipo_id}`))

    const sesionesPendientes = sesiones.filter((sesion) => {
      const activos = miembros.filter((m) => miembroActivoEnFecha(m, sesion.fecha))
      return activos.some((m) => !registroSet.has(`${sesion.id}:${m.id}`))
    })

    const ultimo = await this.prisma.registro_asistencia.findFirst({
      where: { sesion: { equipo_id: equipo.id, bloque_id: bloqueActivo.id } },
      orderBy: { updatedAt: 'desc' },
    })

    return {
      pendiente: sesionesPendientes.length > 0,
      ultimaActualizacion: ultimo?.updatedAt ?? null,
      ...(incluirPendientes
        ? { sesionesPendientes: sesionesPendientes.map((s) => ({ fecha: s.fecha, tipo: s.tipo })) }
        : {}),
    }
  }

  private async calcularMinutaje(
    equipo: equipo,
    bloqueActivo: bloque,
    incluirPendientes = false,
  ): Promise<{
    pendiente: boolean
    ultimaActualizacion: Date | null
    jornadasPendientes?: { numero: number; fecha: Date | null; rival: string | null }[]
  }> {
    const hoy = new Date()

    const jornadas = await this.prisma.jornada.findMany({
      where: {
        equipo_id: equipo.id,
        bloque_id: bloqueActivo.id,
        fecha: { not: null, lte: hoy, gte: bloqueActivo.fecha_activacion },
      },
      orderBy: { fecha: 'asc' },
    })

    const miembros = await this.prisma.miembro_equipo.findMany({ where: { equipo_id: equipo.id } })

    const participaciones = await this.prisma.participacion_jornada.findMany({
      where: { jornada_id: { in: jornadas.map((j) => j.id) } },
    })
    const participacionSet = new Set(participaciones.map((p) => `${p.jornada_id}:${p.miembro_equipo_id}`))

    const jornadasPendientes = jornadas.filter((jornada) => {
      const activos = miembros.filter((m) => miembroActivoEnFecha(m, jornada.fecha!))
      return activos.some((m) => !participacionSet.has(`${jornada.id}:${m.id}`))
    })

    const ultimo = await this.prisma.participacion_jornada.findFirst({
      where: { jornada: { equipo_id: equipo.id, bloque_id: bloqueActivo.id } },
      orderBy: { updatedAt: 'desc' },
    })

    return {
      pendiente: jornadasPendientes.length > 0,
      ultimaActualizacion: ultimo?.updatedAt ?? null,
      ...(incluirPendientes
        ? {
            jornadasPendientes: jornadasPendientes.map((j) => ({ numero: j.numero, fecha: j.fecha, rival: j.rival })),
          }
        : {}),
    }
  }
}
