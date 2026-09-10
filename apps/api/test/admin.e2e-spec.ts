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
import ExcelJS from 'exceljs'
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

async function buildXlsx(rows: Array<{ nombre?: string; alias?: string; fecha_incorporacion?: string }>) {
  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('jugadores')
  sheet.addRow(['nombre', 'alias', 'fecha_incorporacion'])
  for (const row of rows) {
    sheet.addRow([row.nombre ?? '', row.alias ?? '', row.fecha_incorporacion ?? ''])
  }
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

describe('Admin (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let temporadaId: string
  let equipoId: string
  let adminUsuarioId: string
  let entrenadorUsuarioId: string

  const adminAuth0Id = `auth0|admin-${randomUUID()}`
  const entrenadorAuth0Id = `auth0|entrenador-${randomUUID()}`
  const adminToken = buildToken({ sub: adminAuth0Id, [AUTH0_ROLE_CLAIM]: 'admin' })
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

    const temporada = await prisma.temporada.create({
      data: {
        nombre: `test-${randomUUID()}`,
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
        estado: 'abierta',
      },
    })
    temporadaId = temporada.id

    const equipo = await prisma.equipo.create({
      data: {
        temporada_id: temporadaId,
        categoria: 'f7',
        nombre: `Equipo test ${randomUUID()}`,
        minutos_por_periodo: 25,
        num_periodos: 3,
        dias_entrenamiento: [2, 4],
      },
    })
    equipoId = equipo.id

    const adminUsuario = await prisma.usuario.create({
      data: {
        auth0_id: adminAuth0Id,
        nombre_visible: 'Admin Test',
        email: `admin-${randomUUID()}@example.com`,
        rol: 'admin',
      },
    })
    adminUsuarioId = adminUsuario.id

    const entrenadorUsuario = await prisma.usuario.create({
      data: {
        auth0_id: entrenadorAuth0Id,
        nombre_visible: 'Entrenador Test',
        email: `entrenador-${randomUUID()}@example.com`,
        rol: 'entrenador',
      },
    })
    entrenadorUsuarioId = entrenadorUsuario.id
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: [adminUsuarioId, entrenadorUsuarioId] } } })
    await prisma.usuario_equipo.deleteMany({ where: { equipo_id: equipoId } })
    await prisma.registro_asistencia.deleteMany({ where: { sesion: { equipo_id: equipoId } } })
    await prisma.sesion.deleteMany({ where: { equipo_id: equipoId } })
    await prisma.miembro_equipo.deleteMany({ where: { equipo_id: equipoId } })
    await prisma.equipo.delete({ where: { id: equipoId } })
    await prisma.temporada.delete({ where: { id: temporadaId } })
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects /admin/* for a non-admin role with 403', async () => {
    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${entrenadorToken}`)
      .expect(403)
  })

  it('POST /admin/users creates the Auth0 account then the local usuario', async () => {
    mockManagementService.createUser.mockResolvedValue('auth0|new-user')
    const email = `${randomUUID()}@example.com`

    const res = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, nombre_visible: 'Test User', rol: 'entrenador' })
      .expect(201)

    expect(res.body.auth0_id).toBe('auth0|new-user')
    expect(mockManagementService.createUser).toHaveBeenCalledWith(email, 'Test User')

    const created = await prisma.usuario.findUnique({ where: { email } })
    expect(created).not.toBeNull()

    await prisma.usuario.delete({ where: { email } })
  })

  it('POST /admin/users does not create a local row if Auth0 creation fails', async () => {
    mockManagementService.createUser.mockRejectedValue(new Error('auth0 down'))
    const email = `${randomUUID()}@example.com`

    await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, nombre_visible: 'Test User', rol: 'entrenador' })
      .expect(500)

    const created = await prisma.usuario.findUnique({ where: { email } })
    expect(created).toBeNull()
  })

  it('PATCH /admin/users/:id replaces the full set of equipo_ids', async () => {
    mockManagementService.createUser.mockResolvedValue(`auth0|${randomUUID()}`)
    const email = `${randomUUID()}@example.com`

    const otherEquipo = await prisma.equipo.create({
      data: {
        temporada_id: temporadaId,
        categoria: 'f11',
        nombre: `Otro equipo ${randomUUID()}`,
        minutos_por_periodo: 40,
        num_periodos: 2,
        dias_entrenamiento: [1, 3],
      },
    })

    const user = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email,
        nombre_visible: 'Coach',
        rol: 'entrenador',
        equipo_ids: [equipoId, otherEquipo.id],
      })
      .expect(201)

    await request(app.getHttpServer())
      .patch(`/admin/users/${user.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ equipo_ids: [equipoId] })
      .expect(200)

    const links = await prisma.usuario_equipo.findMany({ where: { usuario_id: user.body.id } })
    expect(links.map((l) => l.equipo_id)).toEqual([equipoId])

    const list = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
    const listed = list.body.find((u: { id: string }) => u.id === user.body.id)
    expect(listed.equipo_ids).toEqual([equipoId])

    await prisma.usuario_equipo.deleteMany({ where: { usuario_id: user.body.id } })
    await prisma.usuario.delete({ where: { id: user.body.id } })
    await prisma.equipo.delete({ where: { id: otherEquipo.id } })
  })

  it('PATCH /admin/users/:id does not call Auth0 when email/nombre_visible are unchanged', async () => {
    mockManagementService.createUser.mockResolvedValue(`auth0|${randomUUID()}`)
    const email = `${randomUUID()}@example.com`

    const user = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, nombre_visible: 'Coach', rol: 'entrenador', equipo_ids: [equipoId] })
      .expect(201)

    mockManagementService.updateUser.mockClear()

    await request(app.getHttpServer())
      .patch(`/admin/users/${user.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, nombre_visible: 'Coach', equipo_ids: [] })
      .expect(200)

    expect(mockManagementService.updateUser).not.toHaveBeenCalled()

    await prisma.usuario_equipo.deleteMany({ where: { usuario_id: user.body.id } })
    await prisma.usuario.delete({ where: { id: user.body.id } })
  })

  it('DELETE /admin/users/:id blocks in Auth0 but keeps the local row', async () => {
    mockManagementService.createUser.mockResolvedValue(`auth0|${randomUUID()}`)
    mockManagementService.blockUser.mockResolvedValue(undefined)
    const email = `${randomUUID()}@example.com`

    const user = await request(app.getHttpServer())
      .post('/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ email, nombre_visible: 'ToBlock', rol: 'entrenador' })
      .expect(201)

    await request(app.getHttpServer())
      .delete(`/admin/users/${user.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)

    expect(mockManagementService.blockUser).toHaveBeenCalled()
    const stillThere = await prisma.usuario.findUnique({ where: { id: user.body.id } })
    expect(stillThere).not.toBeNull()

    await prisma.usuario.delete({ where: { id: user.body.id } })
  })

  it('POST /admin/temporadas/:id/close fails when already closed', async () => {
    const temporada = await prisma.temporada.create({
      data: {
        nombre: `to-close-${randomUUID()}`,
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
        estado: 'cerrada',
      },
    })

    await request(app.getHttpServer())
      .post(`/admin/temporadas/${temporada.id}/close`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400)

    await prisma.temporada.delete({ where: { id: temporada.id } })
  })

  it('DELETE /admin/equipos/:id returns 409 when the equipo has miembros', async () => {
    const persona = await prisma.persona.create({ data: { nombre: 'Test Persona' } })
    const miembro = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoId,
        persona_id: persona.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-09-01'),
        orden: 1,
      },
    })

    await request(app.getHttpServer())
      .delete(`/admin/equipos/${equipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409)

    await prisma.miembro_equipo.delete({ where: { id: miembro.id } })
    await prisma.persona.delete({ where: { id: persona.id } })
  })

  it('POST /admin/equipos/:id/miembros without fecha_incorporacion returns 400', async () => {
    const persona = await prisma.persona.create({ data: { nombre: 'Sin fecha' } })

    await request(app.getHttpServer())
      .post(`/admin/equipos/${equipoId}/miembros`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ persona_id: persona.id, grupo: 'con_ficha' })
      .expect(400)

    await prisma.persona.delete({ where: { id: persona.id } })
  })

  it('import preview returns valid and error rows without persisting', async () => {
    const buffer = await buildXlsx([
      { nombre: 'Jugador Valido', fecha_incorporacion: '2026-09-01' },
      { nombre: 'Jugador Sin Fecha' },
    ])

    const res = await request(app.getHttpServer())
      .post(`/admin/equipos/${equipoId}/import-jugadores`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'jugadores.xlsx')
      .expect(201)

    expect(res.body.valid).toHaveLength(1)
    expect(res.body.errors).toHaveLength(1)

    const personas = await prisma.persona.findMany({ where: { nombre: 'Jugador Valido' } })
    expect(personas).toHaveLength(0)
  })

  it('import confirm persists only the valid rows', async () => {
    const nombreUnico = `Jugador Confirmado ${randomUUID()}`
    const buffer = await buildXlsx([
      { nombre: nombreUnico, fecha_incorporacion: '2026-09-01' },
      { nombre: 'Otro Sin Fecha' },
    ])

    const res = await request(app.getHttpServer())
      .post(`/admin/equipos/${equipoId}/import-jugadores?confirm=true`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'jugadores.xlsx')
      .expect(201)

    expect(res.body.created).toBe(1)

    const personas = await prisma.persona.findMany({ where: { nombre: nombreUnico } })
    expect(personas).toHaveLength(1)

    await prisma.miembro_equipo.deleteMany({ where: { persona_id: personas[0].id } })
    await prisma.persona.delete({ where: { id: personas[0].id } })
  })
})
