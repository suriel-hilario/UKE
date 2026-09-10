import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { Prisma, usuario } from '../generated/prisma/client'
import { UsuarioRol } from '../generated/prisma/enums'

@Injectable()
export class CatalogoAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveUsuario(auth0Id: string): Promise<usuario> {
    const found = await this.prisma.usuario.findUnique({ where: { auth0_id: auth0Id } })
    if (!found) {
      throw new NotFoundException('El usuario no existe en la base de datos local')
    }
    return found
  }

  getEquiposWhere(usuario: usuario, temporadaId: string): Prisma.equipoWhereInput {
    if (usuario.rol === UsuarioRol.admin || usuario.rol === UsuarioRol.director) {
      return { temporada_id: temporadaId }
    }

    if (usuario.rol === UsuarioRol.coordinador) {
      if (!usuario.categoria_asignada) {
        return { id: { in: [] } }
      }
      return { temporada_id: temporadaId, categoria: usuario.categoria_asignada }
    }

    return { temporada_id: temporadaId, usuarios: { some: { usuario_id: usuario.id } } }
  }

  async assertEquipoAccess(usuario: usuario, equipoId: string): Promise<void> {
    const equipo = await this.prisma.equipo.findUnique({ where: { id: equipoId } })
    if (!equipo) {
      throw new NotFoundException('El equipo no existe')
    }

    const where = this.getEquiposWhere(usuario, equipo.temporada_id)
    const match = await this.prisma.equipo.findFirst({ where: { AND: [where, { id: equipoId }] } })
    if (!match) {
      throw new ForbiddenException()
    }
  }
}
