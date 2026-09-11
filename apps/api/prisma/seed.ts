import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Categoria, UsuarioRol } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const CATEGORIAS: Categoria[] = [Categoria.eskola, Categoria.f7, Categoria.f11]

const ROLES: { rol: UsuarioRol; auth0Id: string; email: string; nombre: string }[] = [
  { rol: UsuarioRol.admin, auth0Id: 'seed-admin', email: 'seed-admin@uke.local', nombre: 'Seed Admin' },
  { rol: UsuarioRol.director, auth0Id: 'seed-director', email: 'seed-director@uke.local', nombre: 'Seed Director' },
  { rol: UsuarioRol.coordinador, auth0Id: 'seed-coordinador', email: 'seed-coordinador@uke.local', nombre: 'Seed Coordinador' },
  { rol: UsuarioRol.entrenador, auth0Id: 'seed-entrenador', email: 'seed-entrenador@uke.local', nombre: 'Seed Entrenador' },
]

async function main() {
  let temporada = await prisma.temporada.findFirst({ where: { nombre: '2026-27' } })
  if (!temporada) {
    temporada = await prisma.temporada.create({
      data: {
        nombre: '2026-27',
        fecha_inicio: new Date('2026-09-01'),
        fecha_fin: new Date('2027-06-30'),
        estado: 'abierta',
      },
    })
  }

  for (const categoria of CATEGORIAS) {
    const existe = await prisma.equipo.findFirst({ where: { temporada_id: temporada.id, categoria } })
    if (!existe) {
      await prisma.equipo.create({
        data: {
          temporada_id: temporada.id,
          categoria,
          nombre: `Equipo seed ${categoria}`,
          minutos_por_periodo: categoria === 'f7' ? 25 : 40,
          num_periodos: categoria === 'f7' ? 3 : 2,
          dias_entrenamiento: [2, 4],
        },
      })
    }
  }

  for (const { rol, auth0Id, email, nombre } of ROLES) {
    const existe = await prisma.usuario.findFirst({ where: { auth0_id: auth0Id } })
    if (!existe) {
      await prisma.usuario.create({
        data: { auth0_id: auth0Id, nombre_visible: nombre, email, rol },
      })
    }
  }

  console.log('Seed completo: 1 temporada, 3 equipos, 4 usuarios')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })