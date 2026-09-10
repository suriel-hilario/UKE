import { BadRequestException, Injectable } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class PlantillaService {
  constructor(private readonly prisma: PrismaService) {}

  async createJugador(equipoId: string, nombre: string) {
    if (!nombre?.trim()) {
      throw new BadRequestException('nombre es obligatorio')
    }

    const persona = await this.prisma.persona.create({ data: { nombre: nombre.trim() } })

    return this.prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoId,
        persona_id: persona.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date(),
        orden: 0,
      },
      include: { persona: true },
    })
  }

  async updateJugador(
    miembroId: string,
    input: { nombre?: string; fecha_baja?: string; orden?: number; rol_entrenador?: string },
  ) {
    if (input.nombre !== undefined) {
      const miembro = await this.prisma.miembro_equipo.findUniqueOrThrow({ where: { id: miembroId } })
      await this.prisma.persona.update({ where: { id: miembro.persona_id }, data: { nombre: input.nombre } })
    }

    return this.prisma.miembro_equipo.update({
      where: { id: miembroId },
      data: {
        fecha_baja: input.fecha_baja ? new Date(input.fecha_baja) : undefined,
        orden: input.orden,
        rol_entrenador: input.rol_entrenador,
      },
      include: { persona: true },
    })
  }
}
