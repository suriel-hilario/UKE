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
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://minio:9000'
process.env.S3_BUCKET = process.env.S3_BUCKET ?? 'uke-fotos'
process.env.S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? 'uke_minio'
process.env.S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? 'uke_minio_secret'
process.env.S3_REGION = process.env.S3_REGION ?? 'us-east-1'

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

describe('Jornadas / Minutaje (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let temporadaId: string
  let equipoF11Id: string
  let bloqueId: string
  let miembroId: string
  let directorToken: string
  let adminToken: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ManagementService)
      .useValue(mockManagementService)
      .compile()

    app = moduleRef.createNestApplication()
    await app.init()

    prisma = app.get(PrismaService)

    const temporada = await prisma.temporada.create({
      data: {
        nombre: `jornadas-test-${randomUUID()}`,
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
        estado: 'abierta',
      },
    })
    temporadaId = temporada.id

    const equipoF11 = await prisma.equipo.create({
      data: {
        temporada_id: temporadaId,
        categoria: 'f11',
        nombre: `Equipo F11 Jornadas ${randomUUID()}`,
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

    const persona = await prisma.persona.create({ data: { nombre: 'Jugador Minutaje' } })
    const miembro = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoF11Id,
        persona_id: persona.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-01-01'),
        orden: 0,
      },
    })
    miembroId = miembro.id

    const director = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|director-jornadas-${randomUUID()}`,
        nombre_visible: 'Director',
        email: `director-jornadas-${randomUUID()}@example.com`,
        rol: 'director',
      },
    })
    directorToken = buildToken({ sub: director.auth0_id, [AUTH0_ROLE_CLAIM]: 'director' })

    const admin = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|admin-jornadas-${randomUUID()}`,
        nombre_visible: 'Admin',
        email: `admin-jornadas-${randomUUID()}@example.com`,
        rol: 'admin',
      },
    })
    adminToken = buildToken({ sub: admin.auth0_id, [AUTH0_ROLE_CLAIM]: 'admin' })
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { auth0_id: { contains: 'jornadas-' } } })
    await prisma.participacion_jornada.deleteMany({ where: { jornada: { equipo_id: equipoF11Id } } })
    await prisma.jornada.deleteMany({ where: { equipo_id: equipoF11Id } })
    await prisma.miembro_equipo.deleteMany({ where: { equipo_id: equipoF11Id } })
    await prisma.equipo.delete({ where: { id: equipoF11Id } })
    await prisma.bloque.delete({ where: { id: bloqueId } })
    await prisma.temporada.delete({ where: { id: temporadaId } })
    await app.close()
  })

  afterEach(async () => {
    await prisma.participacion_jornada.deleteMany({ where: { jornada: { equipo_id: equipoF11Id } } })
    await prisma.jornada.deleteMany({ where: { equipo_id: equipoF11Id } })
  })

  it('lists jornadas ordered by numero desc', async () => {
    for (const numero of [1, 2, 3]) {
      await request(app.getHttpServer())
        .post(`/equipos/${equipoF11Id}/jornadas`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ numero, campo: 'local', goles_favor: 0, goles_contra: 0, participaciones: [] })
        .expect(201)
    }

    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/jornadas?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(res.body.map((j: { numero: number }) => j.numero)).toEqual([3, 2, 1])
  })

  it('a nonexistent jornada returns blank participation for active members', async () => {
    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/jornadas/9?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(res.body.participaciones).toHaveLength(1)
    expect(res.body.participaciones[0]).toMatchObject({
      miembro_equipo_id: miembroId,
      convocado: false,
      jugado: false,
      titular: false,
      baja: null,
      minutos: 0,
      goles: 0,
    })
  })

  it('creates a new jornada and returns saved participations', async () => {
    const res = await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        numero: 1,
        rival: 'CD Rival',
        fecha: '2026-02-01',
        campo: 'local',
        goles_favor: 2,
        goles_contra: 1,
        participaciones: [
          { miembro_equipo_id: miembroId, convocado: true, jugado: true, titular: false, minutos: 40, goles: 1 },
        ],
      })
      .expect(201)

    expect(res.body.rival).toBe('CD Rival')
    expect(res.body.participaciones[0]).toMatchObject({ minutos: 40, goles: 1, jugado: true })
  })

  it('overwrites an existing jornada on re-save with the same numero', async () => {
    await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ numero: 1, rival: 'Rival A', campo: 'local', goles_favor: 1, goles_contra: 0, participaciones: [] })
      .expect(201)

    const res = await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ numero: 1, rival: 'Rival B', campo: 'visitante', goles_favor: 3, goles_contra: 2, participaciones: [] })
      .expect(201)

    expect(res.body.rival).toBe('Rival B')

    const listado = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/jornadas?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    expect(listado.body).toHaveLength(1)
  })

  it('rejects minutos beyond the allowed margin (F11: 40x2 + 30 = 110)', async () => {
    await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        numero: 1,
        campo: 'local',
        goles_favor: 0,
        goles_contra: 0,
        participaciones: [
          { miembro_equipo_id: miembroId, convocado: true, jugado: true, titular: false, minutos: 111, goles: 0 },
        ],
      })
      .expect(400)
  })

  it('blocks writes when the temporada is closed', async () => {
    await prisma.temporada.update({ where: { id: temporadaId }, data: { estado: 'cerrada' } })

    await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ numero: 1, campo: 'local', goles_favor: 0, goles_contra: 0, participaciones: [] })
      .expect(409)

    await prisma.temporada.update({ where: { id: temporadaId }, data: { estado: 'abierta' } })
  })

  it('jugado implies convocado', async () => {
    const res = await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        numero: 1,
        campo: 'local',
        goles_favor: 0,
        goles_contra: 0,
        participaciones: [
          { miembro_equipo_id: miembroId, convocado: false, jugado: true, titular: false, minutos: 40, goles: 0 },
        ],
      })
      .expect(201)

    expect(res.body.participaciones[0].convocado).toBe(true)
  })

  it('titular implies convocado, jugado, and default minutos when 0', async () => {
    const res = await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        numero: 1,
        campo: 'local',
        goles_favor: 0,
        goles_contra: 0,
        participaciones: [
          { miembro_equipo_id: miembroId, convocado: false, jugado: false, titular: true, minutos: 0, goles: 0 },
        ],
      })
      .expect(201)

    expect(res.body.participaciones[0]).toMatchObject({ convocado: true, jugado: true, titular: true, minutos: 80 })
  })

  it('baja clears convocado, jugado, and titular', async () => {
    const res = await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        numero: 1,
        campo: 'local',
        goles_favor: 0,
        goles_contra: 0,
        participaciones: [
          {
            miembro_equipo_id: miembroId,
            convocado: true,
            jugado: true,
            titular: true,
            baja: 'LES',
            minutos: 40,
            goles: 0,
          },
        ],
      })
      .expect(201)

    expect(res.body.participaciones[0]).toMatchObject({ convocado: false, jugado: false, titular: false, baja: 'LES' })
  })

  it('PATCH updates a single participation applying the same business rules', async () => {
    await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ numero: 1, campo: 'local', goles_favor: 0, goles_contra: 0, participaciones: [] })
      .expect(201)

    const res = await request(app.getHttpServer())
      .patch(`/equipos/${equipoF11Id}/jornadas/1/miembro/${miembroId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ convocado: false, jugado: false, titular: true, minutos: 0, goles: 2 })
      .expect(200)

    expect(res.body).toMatchObject({ convocado: true, jugado: true, titular: true, minutos: 80, goles: 2 })
  })

  it('dashboard includes jornadas with no fecha set', async () => {
    await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        numero: 1,
        campo: 'local',
        goles_favor: 0,
        goles_contra: 0,
        participaciones: [
          { miembro_equipo_id: miembroId, convocado: true, jugado: true, titular: false, minutos: 40, goles: 0 },
        ],
      })
      .expect(201)

    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/dashboard?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const miembro = res.body.find((m: { miembro_equipo_id: string }) => m.miembro_equipo_id === miembroId)
    expect(miembro.jornadasDesdeDebut).toBe(1)
    expect(miembro.minutos).toBe(40)
  })

  it('dashboard computes %TOTAL/%CONV/%DISP and alerta', async () => {
    for (const numero of [1, 2, 3, 4, 5]) {
      await request(app.getHttpServer())
        .post(`/equipos/${equipoF11Id}/jornadas`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({
          numero,
          fecha: `2026-0${numero}-01`,
          campo: 'local',
          goles_favor: 0,
          goles_contra: 0,
          participaciones: [
            {
              miembro_equipo_id: miembroId,
              convocado: true,
              jugado: true,
              titular: false,
              minutos: 40,
              goles: 0,
            },
          ],
        })
        .expect(201)
    }

    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/dashboard?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const miembro = res.body.find((m: { miembro_equipo_id: string }) => m.miembro_equipo_id === miembroId)
    expect(miembro.jornadasDesdeDebut).toBe(5)
    expect(miembro.disponibles).toBe(5)
    expect(miembro.minutos).toBe(200)
    expect(miembro.porcentaje_disp).toBe(50)
    expect(miembro.alerta).toBe('vigilar')
  })

  it('fewer than 2 disponibles does not generate an alert', async () => {
    await request(app.getHttpServer())
      .post(`/equipos/${equipoF11Id}/jornadas`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({
        numero: 1,
        fecha: '2026-02-01',
        campo: 'local',
        goles_favor: 0,
        goles_contra: 0,
        participaciones: [
          { miembro_equipo_id: miembroId, convocado: true, jugado: true, titular: false, minutos: 5, goles: 0 },
        ],
      })
      .expect(201)

    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/dashboard?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const miembro = res.body.find((m: { miembro_equipo_id: string }) => m.miembro_equipo_id === miembroId)
    expect(miembro.disponibles).toBe(1)
    expect(miembro.alerta).toBeNull()
  })

  it('a member with no jornadas shows "--" for all three percentages', async () => {
    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/dashboard?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const miembro = res.body.find((m: { miembro_equipo_id: string }) => m.miembro_equipo_id === miembroId)
    expect(miembro.porcentaje_total).toBe('--')
    expect(miembro.porcentaje_conv).toBe('--')
    expect(miembro.porcentaje_disp).toBe('--')
  })

  it('admin is denied access to jornadas and dashboard endpoints', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/jornadas?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/jornadas/1?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/dashboard?bloque_id=${bloqueId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)
  })
})
