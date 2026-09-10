import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BloqueTipo } from '../../generated/prisma/enums'

export interface CreateTemporadaInput {
  nombre: string
  fecha_inicio: string
  fecha_fin: string
}

export interface UpdateTemporadaInput {
  nombre?: string
  fecha_inicio?: string
  fecha_fin?: string
}

export interface CreateBloqueInput {
  tipo: BloqueTipo
  fecha_activacion: string
}

export interface UpdateBloqueInput {
  fecha_activacion?: string
}

export interface CreateFestivoInput {
  fecha: string
  descripcion?: string
}

@Injectable()
export class TemporadasService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.temporada.findMany({ orderBy: { fecha_inicio: 'desc' } })
  }

  create(input: CreateTemporadaInput) {
    if (!input.nombre || !input.fecha_inicio || !input.fecha_fin) {
      throw new BadRequestException('nombre, fecha_inicio y fecha_fin son obligatorios')
    }

    return this.prisma.temporada.create({
      data: {
        nombre: input.nombre,
        fecha_inicio: new Date(input.fecha_inicio),
        fecha_fin: new Date(input.fecha_fin),
        estado: 'abierta',
      },
    })
  }

  update(id: string, input: UpdateTemporadaInput) {
    return this.prisma.temporada.update({
      where: { id },
      data: {
        nombre: input.nombre,
        fecha_inicio: input.fecha_inicio ? new Date(input.fecha_inicio) : undefined,
        fecha_fin: input.fecha_fin ? new Date(input.fecha_fin) : undefined,
      },
    })
  }

  async close(id: string) {
    const temporada = await this.prisma.temporada.findUniqueOrThrow({ where: { id } })
    if (temporada.estado === 'cerrada') {
      throw new BadRequestException('La temporada ya está cerrada')
    }
    return this.prisma.temporada.update({ where: { id }, data: { estado: 'cerrada' } })
  }

  findBloques(temporadaId: string) {
    return this.prisma.bloque.findMany({ where: { temporada_id: temporadaId } })
  }

  createBloque(temporadaId: string, input: CreateBloqueInput) {
    if (!input.tipo || !input.fecha_activacion) {
      throw new BadRequestException('tipo y fecha_activacion son obligatorios')
    }
    return this.prisma.bloque.create({
      data: {
        temporada_id: temporadaId,
        tipo: input.tipo,
        fecha_activacion: new Date(input.fecha_activacion),
      },
    })
  }

  updateBloque(bloqueId: string, input: UpdateBloqueInput) {
    return this.prisma.bloque.update({
      where: { id: bloqueId },
      data: {
        fecha_activacion: input.fecha_activacion ? new Date(input.fecha_activacion) : undefined,
      },
    })
  }

  findFestivos(temporadaId: string) {
    return this.prisma.festivo.findMany({ where: { temporada_id: temporadaId } })
  }

  createFestivo(temporadaId: string, input: CreateFestivoInput) {
    if (!input.fecha) {
      throw new BadRequestException('fecha es obligatoria')
    }
    return this.prisma.festivo.create({
      data: {
        temporada_id: temporadaId,
        fecha: new Date(input.fecha),
        descripcion: input.descripcion,
      },
    })
  }

  deleteFestivo(festivoId: string) {
    return this.prisma.festivo.delete({ where: { id: festivoId } })
  }
}
