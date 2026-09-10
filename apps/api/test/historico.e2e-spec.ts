jest.mock('jwks-rsa', () => ({
  passportJwtSecret:
    () =>
    (_req: unknown, _rawJwtToken: unknown, done: (err: unknown, key?: string) => void) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { testJwtKeys } = require('./support/test-jwt-keys')
      done(null, testJwtKeys.publicKey)
    },
}))

import { AUTH0_AUDIENCE, AUTH0_DOMAIN, AUTH0_ROLE_CLAIM, buildToken } from './support/build-token'

process.env.AUTH0_DOMAIN = AUTH0_DOMAIN
process.env.AUTH0_AUDIENCE = AUTH0_AUDIENCE
process.env.AUTH0_ROLE_CLAIM = AUTH0_ROLE_CLAIM
process.env.AUTH0_M2M_CLIENT_ID = 'test-m2m-client-id'
process.env.AUTH0_M2M_CLIENT_SECRET = 'test-m2m-client-secret'
process.env.AUTH0_M2M_AUDIENCE = `https://${AUTH0_DOMAIN}/api/v2/`

import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { randomUUID } from 'crypto'
import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { ManagementService } from '../src/admin/management/management.service'

const mockManagementService = {
  createUser: jest.fn(),
  updateUser: jest.fn(),
  blockUser: jest.fn(),
  deleteUser: jest.fn(),
  triggerPasswordReset: jest.fn(),
}

describe('Historico (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let temporadaAbiertaId: string
  let temporadaCerradaId: string
  let equipoId: string
  let usuarioIds: string[]

  const adminAuth0Id = `auth0|historico-admin-${randomUUID()}`
  const directorAuth0Id = `auth0|historico-director-${randomUUID()}`
  const coordinadorAuth0Id = `auth0|historico-coordinador-${randomUUID()}`
  const entrenadorAuth0Id = `auth0|historico-entrenador-${randomUUID()}`
  const adminToken = buildToken({ sub: adminAuth0Id, [AUTH0_ROLE_CLAIM]: 'admin' })
  const directorToken = buildToken({ sub: directorAuth0Id, [AUTH0_ROLE_CLAIM]: 'director' })
  const coordinadorToken = buildToken({ sub: coordinadorAuth0Id, [AUTH0_ROLE_CLAIM]: 'coordinador' })
  const entrenadorToken = buildToken({ sub: entrenadorAuth0Id, [AUTH0_ROLE_CLAIM]: 'entrenador' })

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ManagementService)
      .useValue(mockManagementService)
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()

    prisma = app.get(PrismaService)

    const temporadaAbierta = await prisma.temporada.create({
      data: {
        nombre: `historico-test-abierta-${randomUUID()}`,
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
        estado: 'abierta',
      },
    })
    temporadaAbiertaId = temporadaAbierta.id

    const temporadaCerrada = await prisma.temporada.create({
      data: {
        nombre: `historico-test-cerrada-${randomUUID()}`,
        fecha_inicio: new Date('2025-01-01'),
        fecha_fin: new Date('2025-12-31'),
        estado: 'cerrada',
      },
    })
    temporadaCerradaId = temporadaCerrada.id

    const bloque = await prisma.bloque.create({
      data: { temporada_id: temporadaCerradaId, tipo: 'temporada', fecha_activacion: new Date('2025-01-01') },
    })

    const equipo = await prisma.equipo.create({
      data: {
        temporada_id: temporadaCerradaId,
        categoria: 'f7',
        nombre: `Equipo Historico ${randomUUID()}`,
        minutos_por_periodo: 25,
        num_periodos: 3,
        dias_entrenamiento: [2, 4],
      },
    })
    equipoId = equipo.id

    await prisma.sesion.create({
      data: {
        equipo_id: equipoId,
        bloque_id: bloque.id,
        fecha: new Date('2025-03-01'),
        tipo: 'entrenamiento',
        origen: 'manual',
      },
    })
    await prisma.jornada.create({
      data: { equipo_id: equipoId, bloque_id: bloque.id, numero: 1, campo: 'local', goles_favor: 0, goles_contra: 0 },
    })

    usuarioIds = await Promise.all(
      [
        { auth0_id: adminAuth0Id, rol: 'admin' as const },
        { auth0_id: directorAuth0Id, rol: 'director' as const },
        { auth0_id: coordinadorAuth0Id, rol: 'coordinador' as const },
        { auth0_id: entrenadorAuth0Id, rol: 'entrenador' as const },
      ].map(async ({ auth0_id, rol }) => {
        const usuario = await prisma.usuario.create({
          data: {
            auth0_id,
            nombre_visible: `Historico ${rol}`,
            email: `${auth0_id}@example.com`,
            rol,
          },
        })
        return usuario.id
      }),
    )
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } })
    await prisma.jornada.deleteMany({ where: { equipo_id: equipoId } })
    await prisma.sesion.deleteMany({ where: { equipo_id: equipoId } })
    await prisma.equipo.deleteMany({ where: { id: equipoId } })
    await prisma.bloque.deleteMany({ where: { temporada_id: temporadaCerradaId } })
    await prisma.temporada.deleteMany({ where: { id: { in: [temporadaAbiertaId, temporadaCerradaId] } } })
    await app.close()
  })

  it('admin and director get 200, coordinador and entrenador get 403', async () => {
    await request(app.getHttpServer())
      .get('/admin/historico')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    await request(app.getHttpServer())
      .get('/admin/historico')
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    await request(app.getHttpServer())
      .get('/admin/historico')
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get('/admin/historico')
      .set('Authorization', `Bearer ${entrenadorToken}`)
      .expect(403)
  })

  it('only includes temporadas cerradas, with correct summary stats', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/historico?page=1&limit=100')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    const ids = res.body.map((t: { id: string }) => t.id)
    expect(ids).toContain(temporadaCerradaId)
    expect(ids).not.toContain(temporadaAbiertaId)

    const entry = res.body.find((t: { id: string }) => t.id === temporadaCerradaId)
    expect(entry).toMatchObject({ total_equipos: 1, total_sesiones: 1, total_jornadas: 1 })
  })

  it('director gets 403 on other /admin/* endpoints while still getting 200 on historico', async () => {
    await request(app.getHttpServer())
      .get('/admin/historico')
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(403)
  })
})
