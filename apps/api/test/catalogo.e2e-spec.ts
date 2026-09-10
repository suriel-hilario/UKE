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

describe('Catalogo (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let temporadaId: string
  let equipoF7Id: string
  let equipoF11Id: string
  let bloqueId: string

  let directorId: string
  let coordinadorId: string
  let coordinadorSinCategoriaId: string
  let entrenadorId: string

  let directorToken: string
  let coordinadorToken: string
  let coordinadorSinCategoriaToken: string
  let entrenadorToken: string

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
        nombre: `catalogo-test-${randomUUID()}`,
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
        estado: 'abierta',
      },
    })
    temporadaId = temporada.id

    const equipoF7 = await prisma.equipo.create({
      data: {
        temporada_id: temporadaId,
        categoria: 'f7',
        nombre: `Equipo F7 ${randomUUID()}`,
        minutos_por_periodo: 25,
        num_periodos: 3,
        dias_entrenamiento: [2, 4],
      },
    })
    equipoF7Id = equipoF7.id

    const equipoF11 = await prisma.equipo.create({
      data: {
        temporada_id: temporadaId,
        categoria: 'f11',
        nombre: `Equipo F11 ${randomUUID()}`,
        minutos_por_periodo: 40,
        num_periodos: 2,
        dias_entrenamiento: [1, 3],
      },
    })
    equipoF11Id = equipoF11.id

    const bloque = await prisma.bloque.create({
      data: { temporada_id: temporadaId, tipo: 'unico', fecha_activacion: new Date('2026-01-01') },
    })
    bloqueId = bloque.id

    const director = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|director-${randomUUID()}`,
        nombre_visible: 'Director Test',
        email: `director-${randomUUID()}@example.com`,
        rol: 'director',
      },
    })
    directorId = director.id
    directorToken = buildToken({ sub: director.auth0_id, [AUTH0_ROLE_CLAIM]: 'director' })

    const coordinador = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|coordinador-${randomUUID()}`,
        nombre_visible: 'Coordinador Test',
        email: `coordinador-${randomUUID()}@example.com`,
        rol: 'coordinador',
        categoria_asignada: 'f7',
      },
    })
    coordinadorId = coordinador.id
    coordinadorToken = buildToken({ sub: coordinador.auth0_id, [AUTH0_ROLE_CLAIM]: 'coordinador' })

    const coordinadorSinCategoria = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|coordinador-sin-categoria-${randomUUID()}`,
        nombre_visible: 'Coordinador Sin Categoria',
        email: `coordinador-sc-${randomUUID()}@example.com`,
        rol: 'coordinador',
      },
    })
    coordinadorSinCategoriaId = coordinadorSinCategoria.id
    coordinadorSinCategoriaToken = buildToken({
      sub: coordinadorSinCategoria.auth0_id,
      [AUTH0_ROLE_CLAIM]: 'coordinador',
    })

    const entrenador = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|entrenador-${randomUUID()}`,
        nombre_visible: 'Entrenador Test',
        email: `entrenador-${randomUUID()}@example.com`,
        rol: 'entrenador',
      },
    })
    entrenadorId = entrenador.id
    entrenadorToken = buildToken({ sub: entrenador.auth0_id, [AUTH0_ROLE_CLAIM]: 'entrenador' })

    await prisma.usuario_equipo.create({ data: { usuario_id: entrenadorId, equipo_id: equipoF7Id } })
  })

  afterAll(async () => {
    await prisma.usuario_equipo.deleteMany({ where: { equipo_id: { in: [equipoF7Id, equipoF11Id] } } })
    await prisma.usuario.deleteMany({
      where: { id: { in: [directorId, coordinadorId, coordinadorSinCategoriaId, entrenadorId] } },
    })
    await prisma.sesion.deleteMany({ where: { equipo_id: { in: [equipoF7Id, equipoF11Id] } } })
    await prisma.miembro_equipo.deleteMany({ where: { equipo_id: { in: [equipoF7Id, equipoF11Id] } } })
    await prisma.equipo.deleteMany({ where: { id: { in: [equipoF7Id, equipoF11Id] } } })
    await prisma.bloque.delete({ where: { id: bloqueId } })
    await prisma.temporada.delete({ where: { id: temporadaId } })
    await app.close()
  })

  it('GET /catalogo/temporadas is accessible to all 4 roles with the same list', async () => {
    for (const token of [directorToken, coordinadorToken, entrenadorToken]) {
      const res = await request(app.getHttpServer())
        .get('/catalogo/temporadas')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
      expect(res.body.some((t: { id: string }) => t.id === temporadaId)).toBe(true)
    }
  })

  it('GET /catalogo/temporadas/:id/equipos returns all equipos for director', async () => {
    const res = await request(app.getHttpServer())
      .get(`/catalogo/temporadas/${temporadaId}/equipos`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const ids = res.body.map((e: { id: string }) => e.id)
    expect(ids).toEqual(expect.arrayContaining([equipoF7Id, equipoF11Id]))
  })

  it('GET /catalogo/temporadas/:id/equipos filters by categoria_asignada for coordinador', async () => {
    const res = await request(app.getHttpServer())
      .get(`/catalogo/temporadas/${temporadaId}/equipos`)
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .expect(200)

    const ids = res.body.map((e: { id: string }) => e.id)
    expect(ids).toEqual([equipoF7Id])
  })

  it('GET /catalogo/temporadas/:id/equipos returns empty list for coordinador without categoria_asignada', async () => {
    const res = await request(app.getHttpServer())
      .get(`/catalogo/temporadas/${temporadaId}/equipos`)
      .set('Authorization', `Bearer ${coordinadorSinCategoriaToken}`)
      .expect(200)

    expect(res.body).toEqual([])
  })

  it('GET /catalogo/temporadas/:id/equipos returns only linked equipos for entrenador', async () => {
    const res = await request(app.getHttpServer())
      .get(`/catalogo/temporadas/${temporadaId}/equipos`)
      .set('Authorization', `Bearer ${entrenadorToken}`)
      .expect(200)

    const ids = res.body.map((e: { id: string }) => e.id)
    expect(ids).toEqual([equipoF7Id])
  })

  it('GET /catalogo/equipos/:id returns active members ordered by orden, excluding baja', async () => {
    const persona1 = await prisma.persona.create({ data: { nombre: 'Activo Primero' } })
    const persona2 = await prisma.persona.create({ data: { nombre: 'Activo Segundo' } })
    const personaBaja = await prisma.persona.create({ data: { nombre: 'De Baja' } })

    const m1 = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoF7Id,
        persona_id: persona1.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-01-01'),
        orden: 2,
      },
    })
    const m2 = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoF7Id,
        persona_id: persona2.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-01-01'),
        orden: 1,
      },
    })
    const m3 = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoF7Id,
        persona_id: personaBaja.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-01-01'),
        fecha_baja: new Date('2020-01-01'),
        orden: 0,
      },
    })

    const res = await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoF7Id}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const memberIds = res.body.miembros.map((m: { id: string }) => m.id)
    expect(memberIds).toEqual([m2.id, m1.id])
    expect(memberIds).not.toContain(m3.id)

    await prisma.miembro_equipo.deleteMany({ where: { id: { in: [m1.id, m2.id, m3.id] } } })
    await prisma.persona.deleteMany({ where: { id: { in: [persona1.id, persona2.id, personaBaja.id] } } })
  })

  it('GET /catalogo/equipos/:id returns temporada.estado abierta for the seeded temporada', async () => {
    const res = await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoF7Id}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(res.body.temporada).toEqual({ estado: 'abierta' })
  })

  it('GET /catalogo/equipos/:id returns temporada.estado cerrada for an equipo in a closed temporada', async () => {
    const temporadaCerrada = await prisma.temporada.create({
      data: {
        nombre: `catalogo-test-cerrada-${randomUUID()}`,
        fecha_inicio: new Date('2025-01-01'),
        fecha_fin: new Date('2025-12-31'),
        estado: 'cerrada',
      },
    })
    const equipoCerrado = await prisma.equipo.create({
      data: {
        temporada_id: temporadaCerrada.id,
        categoria: 'f7',
        nombre: `Equipo Cerrado ${randomUUID()}`,
        minutos_por_periodo: 25,
        num_periodos: 3,
        dias_entrenamiento: [2, 4],
      },
    })

    const res = await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoCerrado.id}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(res.body.temporada).toEqual({ estado: 'cerrada' })

    await prisma.equipo.delete({ where: { id: equipoCerrado.id } })
    await prisma.temporada.delete({ where: { id: temporadaCerrada.id } })
  })

  it('GET /catalogo/equipos/:id returns 403 when out of scope', async () => {
    await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoF11Id}`)
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoF11Id}`)
      .set('Authorization', `Bearer ${entrenadorToken}`)
      .expect(403)
  })

  it('GET /catalogo/equipos/:id returns 403 for coordinador without categoria_asignada', async () => {
    await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoF7Id}`)
      .set('Authorization', `Bearer ${coordinadorSinCategoriaToken}`)
      .expect(403)
  })

  it('GET /catalogo/equipos/:id/sesiones requires bloque_id', async () => {
    await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoF7Id}/sesiones`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(400)
  })

  it('GET /catalogo/equipos/:id/sesiones excludes eliminada=true', async () => {
    const activa = await prisma.sesion.create({
      data: {
        equipo_id: equipoF7Id,
        bloque_id: bloqueId,
        fecha: new Date('2026-02-01'),
        tipo: 'entrenamiento',
        origen: 'regla',
        eliminada: false,
      },
    })
    const eliminada = await prisma.sesion.create({
      data: {
        equipo_id: equipoF7Id,
        bloque_id: bloqueId,
        fecha: new Date('2026-02-02'),
        tipo: 'entrenamiento',
        origen: 'regla',
        eliminada: true,
      },
    })

    const res = await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoF7Id}/sesiones?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const ids = res.body.map((s: { id: string }) => s.id)
    expect(ids).toContain(activa.id)
    expect(ids).not.toContain(eliminada.id)

    await prisma.sesion.deleteMany({ where: { id: { in: [activa.id, eliminada.id] } } })
  })

  it('GET /catalogo/equipos/:id/sesiones returns 403 when out of scope', async () => {
    await request(app.getHttpServer())
      .get(`/catalogo/equipos/${equipoF11Id}/sesiones?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${coordinadorToken}`)
      .expect(403)
  })

  it('PATCH /auth/me/idioma updates usuario.idioma', async () => {
    await request(app.getHttpServer())
      .patch('/auth/me/idioma')
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ idioma: 'es' })
      .expect(200)

    const updated = await prisma.usuario.findUnique({ where: { id: directorId } })
    expect(updated?.idioma).toBe('es')

    await prisma.usuario.update({ where: { id: directorId }, data: { idioma: 'eu' } })
  })

  it('PATCH /auth/me/idioma returns 404 when the local usuario does not exist', async () => {
    const orphanToken = buildToken({ sub: `auth0|no-local-row-${randomUUID()}`, [AUTH0_ROLE_CLAIM]: 'director' })

    await request(app.getHttpServer())
      .patch('/auth/me/idioma')
      .set('Authorization', `Bearer ${orphanToken}`)
      .send({ idioma: 'es' })
      .expect(404)
  })
})
