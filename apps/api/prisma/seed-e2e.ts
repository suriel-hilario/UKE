// Seed for Playwright e2e runs (see openspec/specs/e2e-testing/spec.md and
// e2e/support/reset.ts). Truncates its own tables first, so re-running this
// script is both "seed" and "reset" — every spec file starts from the same
// known state regardless of what a previous spec mutated.
//
// Usuario rows are keyed to the REAL Auth0 test users' auth0_id (passed via
// env vars, not hardcoded), so `GET /auth/me`'s auth0_id lookup resolves the
// same role/user Playwright just logged in as via the real Auth0 hosted login.
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, Categoria, UsuarioRol, MiembroGrupo, SesionTipo, SesionOrigen, Campo } from '../src/generated/prisma/client'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required env var: ${name}`)
  return value
}

const TABLES_TO_RESET = [
  'notificacion_enviada',
  'participacion_jornada',
  'jornada',
  'registro_asistencia',
  'sesion',
  'usuario_equipo',
  'miembro_equipo',
  'persona',
  'bloque',
  'festivo',
  'equipo',
  'usuario',
  'temporada',
]

async function resetTables() {
  await prisma.$transaction(
    TABLES_TO_RESET.map((table) =>
      prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" RESTART IDENTITY CASCADE`),
    ),
  )
}

async function main() {
  await resetTables()

  const usuarios: {
    rol: UsuarioRol
    auth0Id: string
    email: string
    nombre: string
    categoriaAsignada?: Categoria
  }[] = [
    { rol: UsuarioRol.admin, auth0Id: requiredEnv('E2E_ADMIN_AUTH0_ID'), email: 'e2e-test+admin@uke.local', nombre: 'E2E Admin' },
    { rol: UsuarioRol.director, auth0Id: requiredEnv('E2E_DIRECTOR_AUTH0_ID'), email: 'e2e-test+director@uke.local', nombre: 'E2E Director' },
    // Coordinador is scoped by categoria_asignada (see asistencia-access.service.ts
    // getEquiposWhere) — f7 matches the E2E F7 team seeded below, so panel-estado
    // has a non-empty result for this role.
    { rol: UsuarioRol.coordinador, auth0Id: requiredEnv('E2E_COORDINADOR_AUTH0_ID'), email: 'e2e-test+coordinador@uke.local', nombre: 'E2E Coordinador', categoriaAsignada: Categoria.f7 },
    { rol: UsuarioRol.entrenador, auth0Id: requiredEnv('E2E_ENTRENADOR_AUTH0_ID'), email: 'e2e-test+entrenador@uke.local', nombre: 'E2E Entrenador' },
  ]

  for (const u of usuarios) {
    await prisma.usuario.create({
      data: {
        auth0_id: u.auth0Id,
        nombre_visible: u.nombre,
        email: u.email,
        rol: u.rol,
        categoria_asignada: u.categoriaAsignada,
      },
    })
  }

  const entrenadorUsuario = await prisma.usuario.findUniqueOrThrow({
    where: { auth0_id: requiredEnv('E2E_ENTRENADOR_AUTH0_ID') },
  })

  // Open season: exercised by catalogo-equipos, backoffice, panel-estado,
  // asistencia-*, minutaje.
  const abierta = await prisma.temporada.create({
    data: {
      nombre: 'E2E Abierta',
      fecha_inicio: new Date('2026-09-01'),
      fecha_fin: new Date('2027-06-30'),
      estado: 'abierta',
    },
  })
  const bloqueAbierta = await prisma.bloque.create({
    data: { temporada_id: abierta.id, tipo: 'temporada', fecha_activacion: new Date('2026-09-01') },
  })

  // Closed season: exercised by historico (read-only enforcement).
  const cerrada = await prisma.temporada.create({
    data: {
      nombre: 'E2E Cerrada',
      fecha_inicio: new Date('2025-09-01'),
      fecha_fin: new Date('2026-06-30'),
      estado: 'cerrada',
    },
  })

  const equiposConfig: { categoria: Categoria; nombre: string; minutos: number; periodos: number }[] = [
    { categoria: Categoria.eskola, nombre: 'E2E Eskola', minutos: 20, periodos: 2 },
    { categoria: Categoria.f7, nombre: 'E2E F7', minutos: 25, periodos: 3 },
    { categoria: Categoria.f11, nombre: 'E2E F11', minutos: 40, periodos: 2 },
  ]

  for (const cfg of equiposConfig) {
    const equipo = await prisma.equipo.create({
      data: {
        temporada_id: abierta.id,
        categoria: cfg.categoria,
        nombre: cfg.nombre,
        minutos_por_periodo: cfg.minutos,
        num_periodos: cfg.periodos,
        dias_entrenamiento: [2, 4],
      },
    })

    await prisma.usuario_equipo.create({
      data: { usuario_id: entrenadorUsuario.id, equipo_id: equipo.id },
    })

    // Entrenador (grupo 'entrenador') + 3 jugadores ('con_ficha').
    const entrenadorPersona = await prisma.persona.create({ data: { nombre: 'E2E Entrenador' } })
    await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipo.id,
        persona_id: entrenadorPersona.id,
        grupo: MiembroGrupo.entrenador,
        rol_entrenador: 'principal',
        fecha_incorporacion: new Date('2026-09-01'),
        orden: 0,
      },
    })

    const jugadorMiembros = []
    for (let i = 1; i <= 3; i++) {
      const persona = await prisma.persona.create({ data: { nombre: `E2E Jugador ${cfg.categoria} ${i}` } })
      const miembro = await prisma.miembro_equipo.create({
        data: {
          equipo_id: equipo.id,
          persona_id: persona.id,
          grupo: MiembroGrupo.con_ficha,
          fecha_incorporacion: new Date('2026-09-01'),
          orden: i,
        },
      })
      jugadorMiembros.push(miembro)
    }

    // One past training session, ungraded, so the asistencia tabs have a
    // session to mark attendance on.
    const sesion = await prisma.sesion.create({
      data: {
        equipo_id: equipo.id,
        bloque_id: bloqueAbierta.id,
        fecha: new Date('2026-09-15'),
        tipo: SesionTipo.entrenamiento,
        origen: SesionOrigen.manual,
      },
    })
    await prisma.registro_asistencia.create({
      data: { sesion_id: sesion.id, miembro_equipo_id: jugadorMiembros[0].id, estado: 'P' },
    })

    // Minutaje fixture (f7/f11 only).
    if (cfg.categoria === Categoria.f7 || cfg.categoria === Categoria.f11) {
      const jornada = await prisma.jornada.create({
        data: {
          equipo_id: equipo.id,
          bloque_id: bloqueAbierta.id,
          numero: 1,
          rival: 'E2E Rival',
          fecha: new Date('2026-09-20'),
          campo: Campo.local,
          goles_favor: 0,
          goles_contra: 0,
        },
      })
      await prisma.participacion_jornada.create({
        data: {
          jornada_id: jornada.id,
          miembro_equipo_id: jugadorMiembros[0].id,
          convocado: true,
          jugado: false,
          titular: false,
          minutos: 0,
          goles: 0,
        },
      })
    }
  }

  console.log('Seed e2e completo: 2 temporadas, 3 equipos, 4 usuarios de prueba')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
