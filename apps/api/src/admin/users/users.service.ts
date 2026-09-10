import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { ManagementService } from '../management/management.service'
import { Categoria, UsuarioRol } from '../../generated/prisma/enums'

export interface CreateUserInput {
  email: string
  nombre_visible: string
  rol: UsuarioRol
  categoria_asignada?: Categoria
  equipo_ids?: string[]
}

export interface UpdateUserInput {
  nombre_visible?: string
  email?: string
  rol?: UsuarioRol
  categoria_asignada?: Categoria | null
  equipo_ids?: string[]
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly management: ManagementService,
  ) {}

  async findAll() {
    const usuarios = await this.prisma.usuario.findMany({
      orderBy: { nombre_visible: 'asc' },
      include: { equipos: { select: { equipo_id: true } } },
    })

    return usuarios.map(({ equipos, ...usuario }) => ({
      ...usuario,
      equipo_ids: equipos.map((e) => e.equipo_id),
    }))
  }

  async create(input: CreateUserInput) {
    if (!input.email || !input.nombre_visible || !input.rol) {
      throw new BadRequestException('email, nombre_visible y rol son obligatorios')
    }

    const auth0Id = await this.management.createUser(input.email, input.nombre_visible)

    try {
      return await this.prisma.usuario.create({
        data: {
          auth0_id: auth0Id,
          nombre_visible: input.nombre_visible,
          email: input.email,
          rol: input.rol,
          categoria_asignada: input.categoria_asignada,
          equipos: input.equipo_ids
            ? { create: input.equipo_ids.map((equipo_id) => ({ equipo: { connect: { id: equipo_id } } })) }
            : undefined,
        },
      })
    } catch (error) {
      try {
        await this.management.deleteUser(auth0Id)
      } catch (compensationError) {
        this.logger.error(
          `Fallo al compensar creación de usuario huérfano en Auth0 (auth0_id=${auth0Id}): ${String(compensationError)}`,
        )
      }
      throw error
    }
  }

  async update(id: string, input: UpdateUserInput) {
    const existing = await this.prisma.usuario.findUniqueOrThrow({ where: { id } })

    const emailChanged = input.email !== undefined && input.email !== existing.email
    const nombreChanged = input.nombre_visible !== undefined && input.nombre_visible !== existing.nombre_visible

    if (emailChanged || nombreChanged) {
      await this.management.updateUser(existing.auth0_id, {
        email: emailChanged ? input.email : undefined,
        name: nombreChanged ? input.nombre_visible : undefined,
      })
    }

    if (input.equipo_ids) {
      await this.prisma.$transaction([
        this.prisma.usuario_equipo.deleteMany({ where: { usuario_id: id } }),
        this.prisma.usuario_equipo.createMany({
          data: input.equipo_ids.map((equipo_id) => ({ usuario_id: id, equipo_id })),
        }),
      ])
    }

    return this.prisma.usuario.update({
      where: { id },
      data: {
        nombre_visible: input.nombre_visible,
        email: input.email,
        rol: input.rol,
        categoria_asignada: input.categoria_asignada,
      },
    })
  }

  async disable(id: string) {
    const existing = await this.prisma.usuario.findUniqueOrThrow({ where: { id } })
    await this.management.blockUser(existing.auth0_id)
    return existing
  }

  async resetPassword(id: string) {
    const existing = await this.prisma.usuario.findUniqueOrThrow({ where: { id } })
    await this.management.triggerPasswordReset(existing.email)
  }
}
