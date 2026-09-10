import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { CatalogoAccessService } from './catalogo-access.service'
import { usuario } from '../generated/prisma/client'

const MIEMBRO_ACTIVO_WHERE = {
  OR: [{ fecha_baja: null }, { fecha_baja: { gt: new Date() } }],
}

@Injectable()
export class CatalogoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: CatalogoAccessService,
  ) {}

  findTemporadas() {
    return this.prisma.temporada.findMany({
      select: { id: true, nombre: true, estado: true },
    })
  }

  async findEquiposByTemporada(usuario: usuario, temporadaId: string) {
    const where = this.access.getEquiposWhere(usuario, temporadaId)

    const equipos = await this.prisma.equipo.findMany({
      where,
      select: {
        id: true,
        nombre: true,
        categoria: true,
        color: true,
        icono: true,
        _count: { select: { miembros: { where: MIEMBRO_ACTIVO_WHERE } } },
      },
    })

    return equipos.map(({ _count, ...equipo }) => ({
      ...equipo,
      num_miembros_activos: _count.miembros,
    }))
  }

  async findEquipoDetail(usuario: usuario, equipoId: string) {
    await this.access.assertEquipoAccess(usuario, equipoId)

    return this.prisma.equipo.findUniqueOrThrow({
      where: { id: equipoId },
      include: {
        temporada: { select: { estado: true } },
        miembros: {
          where: MIEMBRO_ACTIVO_WHERE,
          orderBy: { orden: 'asc' },
          include: { persona: true },
        },
      },
    })
  }

  async findSesiones(usuario: usuario, equipoId: string, bloqueId?: string) {
    if (!bloqueId) {
      throw new BadRequestException('bloque_id es obligatorio')
    }

    await this.access.assertEquipoAccess(usuario, equipoId)

    return this.prisma.sesion.findMany({
      where: { equipo_id: equipoId, bloque_id: bloqueId, eliminada: false },
      select: { id: true, fecha: true, numero: true, tipo: true, origen: true },
    })
  }
}
