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

describe('Asistencia F11 (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let temporadaId: string
  let equipoF11Id: string
  let equipoF7Id: string
  let bloqueId: string
  let miembroId: string
  let directorToken: string

  const MES = '2026-03'

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
        nombre: `f11-test-${randomUUID()}`,
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
        nombre: `Equipo F11 ${randomUUID()}`,
        minutos_por_periodo: 40,
        num_periodos: 2,
        dias_entrenamiento: [1, 3],
      },
    })
    equipoF11Id = equipoF11.id

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

    const bloque = await prisma.bloque.create({
      data: { temporada_id: temporadaId, tipo: 'unico', fecha_activacion: new Date('2026-01-01') },
    })
    bloqueId = bloque.id

    const persona = await prisma.persona.create({ data: { nombre: 'Jugador F11' } })
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
        auth0_id: `auth0|director-f11-${randomUUID()}`,
        nombre_visible: 'Director',
        email: `director-f11-${randomUUID()}@example.com`,
        rol: 'director',
      },
    })
    directorToken = buildToken({ sub: director.auth0_id, [AUTH0_ROLE_CLAIM]: 'director' })
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { auth0_id: { contains: 'director-f11-' } } })
    await prisma.registro_asistencia.deleteMany({
      where: { sesion: { equipo_id: { in: [equipoF11Id, equipoF7Id] } } },
    })
    await prisma.sesion.deleteMany({ where: { equipo_id: { in: [equipoF11Id, equipoF7Id] } } })
    await prisma.miembro_equipo.deleteMany({ where: { equipo_id: equipoF11Id } })
    await prisma.equipo.deleteMany({ where: { id: { in: [equipoF11Id, equipoF7Id] } } })
    await prisma.bloque.delete({ where: { id: bloqueId } })
    await prisma.temporada.delete({ where: { id: temporadaId } })
    await app.close()
  })

  async function getSesionId(equipoId: string) {
    const asistencia = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    return asistencia.body.sesiones[0].id as string
  }

  it('accepts a valid F11 state on an f11 equipo', async () => {
    const sesionId = await getSesionId(equipoF11Id)

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoF11Id}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesionId, miembro_equipo_id: miembroId, estado: 'EM' })
      .expect(200)
  })

  it('rejects a P/A state on an f11 equipo', async () => {
    const sesionId = await getSesionId(equipoF11Id)

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoF11Id}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesionId, miembro_equipo_id: miembroId, estado: 'P' })
      .expect(400)
  })

  it('rejects an F11 state on an f7 equipo', async () => {
    const sesionId = await getSesionId(equipoF7Id)
    const persona = await prisma.persona.create({ data: { nombre: 'Jugador F7' } })
    const miembroF7 = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoF7Id,
        persona_id: persona.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-01-01'),
        orden: 0,
      },
    })

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoF7Id}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesionId, miembro_equipo_id: miembroF7.id, estado: 'EM' })
      .expect(400)

    await prisma.miembro_equipo.delete({ where: { id: miembroF7.id } })
    await prisma.persona.delete({ where: { id: persona.id } })
  })

  it('GET asistencia includes contadores per estado', async () => {
    const asistencia = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const sesiones = asistencia.body.sesiones as { id: string }[]
    await request(app.getHttpServer())
      .patch(`/equipos/${equipoF11Id}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesiones[0].id, miembro_equipo_id: miembroId, estado: '1' })
      .expect(200)
    await request(app.getHttpServer())
      .patch(`/equipos/${equipoF11Id}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesiones[1].id, miembro_equipo_id: miembroId, estado: 'LS' })
      .expect(200)

    const after = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const miembro = after.body.miembros.find((m: { id: string }) => m.id === miembroId)
    expect(miembro.contadores['1']).toBe(1)
    expect(miembro.contadores['LS']).toBe(1)
    expect(typeof miembro.porcentaje_mes).toBe('number')
    expect(typeof miembro.porcentaje_ano).toBe('number')
  })

  it('GET ficha includes contadores and per-session detail for the monthly breakdown', async () => {
    const ficha = await request(app.getHttpServer())
      .get(`/miembros/${miembroId}/ficha?equipo_id=${equipoF11Id}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(ficha.body.contadores).toBeDefined()
    expect(Array.isArray(ficha.body.desglose_mensual)).toBe(true)
    if (ficha.body.desglose_mensual.length > 0) {
      expect(Array.isArray(ficha.body.desglose_mensual[0].detalle_sesiones)).toBe(true)
    }
  })

  it('GET ficha counts 1/EM/RC as presence for f11', async () => {
    const asistencia = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    const sesiones = asistencia.body.sesiones as { id: string }[]

    for (const [i, estado] of ['1', 'EM', 'RC', 'VA'].entries()) {
      if (!sesiones[i]) continue
      await request(app.getHttpServer())
        .patch(`/equipos/${equipoF11Id}/asistencia`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ sesion_id: sesiones[i].id, miembro_equipo_id: miembroId, estado })
        .expect(200)
    }

    const ficha = await request(app.getHttpServer())
      .get(`/miembros/${miembroId}/ficha?equipo_id=${equipoF11Id}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(ficha.body.estadisticas.presencias).toBeGreaterThanOrEqual(3)
  })

  it('PATCH miembros/:id updates orden', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/equipos/${equipoF11Id}/miembros/${miembroId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ orden: 5 })
      .expect(200)

    expect(updated.body.orden).toBe(5)
  })

  it('GET asistencia/exportar for f11 returns a season-wide semicolon CSV with BOM', async () => {
    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoF11Id}/asistencia/exportar`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(res.headers['content-disposition']).toContain('Asistencias_')
    expect(res.text.charCodeAt(0)).toBe(0xfeff)
    const firstLine = res.text.slice(1).split('\n')[0]
    expect(firstLine.startsWith('SECCION;JUGADOR;ALIAS;%ANO;%MES;')).toBe(true)
  })

  it('GET asistencia/exportar for f7 keeps the monthly comma format (regression)', async () => {
    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoF7Id}/asistencia/exportar?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(res.text.split('\n')[0]).toMatch(/^Jugador,/)
  })
})
