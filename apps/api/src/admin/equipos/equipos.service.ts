import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '../../generated/prisma/client'
import { Categoria, MiembroGrupo } from '../../generated/prisma/enums'

export interface CreateEquipoInput {
  temporada_id: string
  categoria: Categoria
  nombre: string
  color?: string
  icono?: string
  minutos_por_periodo: number
  num_periodos: number
  dias_entrenamiento: number[]
}

export type UpdateEquipoInput = Partial<Omit<CreateEquipoInput, 'temporada_id' | 'categoria'>>

export interface CreateMiembroInput {
  persona_id: string
  grupo: MiembroGrupo
  rol_entrenador?: string
  fecha_incorporacion: string
  orden?: number
}

export interface UpdateMiembroInput {
  fecha_baja?: string
  orden?: number
  rol_entrenador?: string
}

@Injectable()
export class EquiposService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(temporadaId?: string) {
    return this.prisma.equipo.findMany({
      where: temporadaId ? { temporada_id: temporadaId } : undefined,
    })
  }

  create(input: CreateEquipoInput) {
    if (!input.temporada_id || !input.categoria || !input.nombre) {
      throw new BadRequestException('temporada_id, categoria y nombre son obligatorios')
    }
    return this.prisma.equipo.create({ data: input })
  }

  update(id: string, input: UpdateEquipoInput) {
    return this.prisma.equipo.update({ where: { id }, data: input })
  }

  async remove(id: string) {
    try {
      return await this.prisma.equipo.delete({ where: { id } })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictException('El equipo tiene datos asociados (sesiones, miembros o jornadas) y no puede borrarse')
      }
      throw error
    }
  }

  findMiembros(equipoId: string) {
    return this.prisma.miembro_equipo.findMany({
      where: { equipo_id: equipoId },
      orderBy: { orden: 'asc' },
      include: { persona: true },
    })
  }

  createMiembro(equipoId: string, input: CreateMiembroInput) {
    if (!input.persona_id || !input.grupo || !input.fecha_incorporacion) {
      throw new BadRequestException('persona_id, grupo y fecha_incorporacion son obligatorios')
    }
    return this.prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoId,
        persona_id: input.persona_id,
        grupo: input.grupo,
        rol_entrenador: input.rol_entrenador,
        fecha_incorporacion: new Date(input.fecha_incorporacion),
        orden: input.orden ?? 0,
      },
    })
  }

  updateMiembro(miembroId: string, input: UpdateMiembroInput) {
    return this.prisma.miembro_equipo.update({
      where: { id: miembroId },
      data: {
        fecha_baja: input.fecha_baja ? new Date(input.fecha_baja) : undefined,
        orden: input.orden,
        rol_entrenador: input.rol_entrenador,
      },
    })
  }

  removeMiembro(miembroId: string) {
    return this.prisma.miembro_equipo.delete({ where: { id: miembroId } })
  }
}
