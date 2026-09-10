import { NotFoundException } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { bloque } from '../generated/prisma/client'

export async function getBloqueActivo(prisma: PrismaService, temporadaId: string): Promise<bloque> {
  const bloques = await prisma.bloque.findMany({
    where: { temporada_id: temporadaId },
    orderBy: { fecha_activacion: 'asc' },
  })
  if (bloques.length === 0) {
    throw new NotFoundException('La temporada no tiene bloques')
  }

  const hoy = new Date()
  const vigentes = bloques.filter((b) => b.fecha_activacion <= hoy)
  if (vigentes.length > 0) {
    return vigentes[vigentes.length - 1]
  }
  return bloques[0]
}
