import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

const DEFAULT_LIMIT = 20

@Injectable()
export class HistoricoService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = DEFAULT_LIMIT) {
    const temporadas = await this.prisma.temporada.findMany({
      where: { estado: 'cerrada' },
      select: { id: true, nombre: true, fecha_inicio: true, fecha_fin: true, estado: true },
      orderBy: { fecha_fin: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    return Promise.all(
      temporadas.map(async (temporada) => {
        const [total_equipos, total_sesiones, total_jornadas] = await Promise.all([
          this.prisma.equipo.count({ where: { temporada_id: temporada.id } }),
          this.prisma.sesion.count({ where: { equipo: { temporada_id: temporada.id } } }),
          this.prisma.jornada.count({ where: { equipo: { temporada_id: temporada.id } } }),
        ])

        return { ...temporada, total_equipos, total_sesiones, total_jornadas }
      }),
    )
  }
}
