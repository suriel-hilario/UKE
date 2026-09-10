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

describe('Panel de estado (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let temporadaId: string
  let bloqueId: string
  let temporadaSinBloqueId: string

  let equipoEskolaId: string
  let equipoF7PendienteId: string
  let equipoF7AlDiaId: string
  let equipoF11Id: string
  let equipoSinBloqueId: string
  let equipoTimestampId: string

  let miembroF7PendienteId: string
  let miembroF7AlDiaId: string
  let miembroTimestampId: string

  let directorToken: string
  let coordinadorF7Token: string
  let entrenadorToken: string
  let adminToken: string

  const usuarioIds: string[] = []
  const equipoIds: string[] = []
  const personaIds: string[] = []

  const HOY = new Date()
  const AYER = new Date(HOY.getTime() - 24 * 60 * 60 * 1000)

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
        nombre: `panel-test-${randomUUID()}`,
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
        estado: 'abierta',
      },
    })
    temporadaId = temporada.id

    const bloque = await prisma.bloque.create({
      data: { temporada_id: temporadaId, tipo: 'unico', fecha_activacion: new Date('2026-01-01') },
    })
    bloqueId = bloque.id

    async function crearEquipo(categoria: 'eskola' | 'f7' | 'f11', nombre: string, temporada = temporadaId) {
      const equipo = await prisma.equipo.create({
        data: {
          temporada_id: temporada,
          categoria,
          nombre: `${nombre} ${randomUUID()}`,
          minutos_por_periodo: 25,
          num_periodos: 3,
          dias_entrenamiento: [1, 3],
        },
      })
      equipoIds.push(equipo.id)
      return equipo.id
    }

    async function crearMiembro(equipoId: string, nombre: string) {
      const persona = await prisma.persona.create({ data: { nombre } })
      personaIds.push(persona.id)
      const miembro = await prisma.miembro_equipo.create({
        data: {
          equipo_id: equipoId,
          persona_id: persona.id,
          grupo: 'con_ficha',
          fecha_incorporacion: new Date('2026-01-01'),
          orden: 0,
        },
      })
      return miembro.id
    }

    equipoEskolaId = await crearEquipo('eskola', 'Eskola Panel')
    equipoF7PendienteId = await crearEquipo('f7', 'F7 Pendiente')
    equipoF7AlDiaId = await crearEquipo('f7', 'F7 Al Dia')
    equipoF11Id = await crearEquipo('f11', 'F11 Panel')
    equipoTimestampId = await crearEquipo('f7', 'F7 Timestamp')

    // Eskola: una sesión pasada sin registro -> asistencia_pendiente true, minutaje_pendiente null.
    const miembroEskolaId = await crearMiembro(equipoEskolaId, 'Jugador Eskola')
    await prisma.sesion.create({
      data: { equipo_id: equipoEskolaId, bloque_id: bloqueId, fecha: AYER, tipo: 'entrenamiento', origen: 'manual' },
    })
    void miembroEskolaId

    // F7 Pendiente: sesión sin registro + jornada sin participación -> ambos pendientes, semáforo rojo.
    miembroF7PendienteId = await crearMiembro(equipoF7PendienteId, 'Jugador F7 Pendiente')
    await prisma.sesion.create({
      data: {
        equipo_id: equipoF7PendienteId,
        bloque_id: bloqueId,
        fecha: AYER,
        tipo: 'entrenamiento',
        origen: 'manual',
      },
    })
    await prisma.jornada.create({
      data: { equipo_id: equipoF7PendienteId, bloque_id: bloqueId, numero: 1, fecha: AYER, campo: 'local' },
    })

    // F7 Al Día: sesión + registro completo, jornada + participación completa -> ambos false, semáforo verde.
    miembroF7AlDiaId = await crearMiembro(equipoF7AlDiaId, 'Jugador F7 Al Dia')
    const sesionAlDia = await prisma.sesion.create({
      data: { equipo_id: equipoF7AlDiaId, bloque_id: bloqueId, fecha: AYER, tipo: 'entrenamiento', origen: 'manual' },
    })
    await prisma.registro_asistencia.create({
      data: { sesion_id: sesionAlDia.id, miembro_equipo_id: miembroF7AlDiaId, estado: 'P' },
    })
    const jornadaAlDia = await prisma.jornada.create({
      data: { equipo_id: equipoF7AlDiaId, bloque_id: bloqueId, numero: 1, fecha: AYER, campo: 'local' },
    })
    await prisma.participacion_jornada.create({
      data: {
        jornada_id: jornadaAlDia.id,
        miembro_equipo_id: miembroF7AlDiaId,
        convocado: true,
        jugado: true,
        titular: true,
        minutos: 75,
        goles: 0,
      },
    })

    // Timestamp: una sesión sin registro -> ultima_actualizacion_asistencia null hasta que se marque.
    miembroTimestampId = await crearMiembro(equipoTimestampId, 'Jugador Timestamp')
    await prisma.sesion.create({
      data: { equipo_id: equipoTimestampId, bloque_id: bloqueId, fecha: AYER, tipo: 'entrenamiento', origen: 'manual' },
    })

    // Sin bloque activo: temporada aparte cuyo único bloque tiene fecha_activacion futura
    // (bloque es por temporada, no por equipo — necesita su propia temporada para no heredar `bloqueId`).
    const temporadaSinBloque = await prisma.temporada.create({
      data: {
        nombre: `panel-sin-bloque-${randomUUID()}`,
        fecha_inicio: new Date('2026-01-01'),
        fecha_fin: new Date('2026-12-31'),
        estado: 'abierta',
      },
    })
    temporadaSinBloqueId = temporadaSinBloque.id
    await prisma.bloque.create({
      data: { temporada_id: temporadaSinBloqueId, tipo: 'unico', fecha_activacion: new Date('2099-01-01') },
    })
    equipoSinBloqueId = await crearEquipo('f7', 'F7 Sin Bloque', temporadaSinBloqueId)

    const director = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|director-panel-${randomUUID()}`,
        nombre_visible: 'Director',
        email: `director-panel-${randomUUID()}@example.com`,
        rol: 'director',
      },
    })
    directorToken = buildToken({ sub: director.auth0_id, [AUTH0_ROLE_CLAIM]: 'director' })
    usuarioIds.push(director.id)

    const coordinadorF7 = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|coordinador-panel-${randomUUID()}`,
        nombre_visible: 'Coordinador F7',
        email: `coordinador-panel-${randomUUID()}@example.com`,
        rol: 'coordinador',
        categoria_asignada: 'f7',
      },
    })
    coordinadorF7Token = buildToken({ sub: coordinadorF7.auth0_id, [AUTH0_ROLE_CLAIM]: 'coordinador' })
    usuarioIds.push(coordinadorF7.id)

    const entrenador = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|entrenador-panel-${randomUUID()}`,
        nombre_visible: 'Entrenador',
        email: `entrenador-panel-${randomUUID()}@example.com`,
        rol: 'entrenador',
      },
    })
    entrenadorToken = buildToken({ sub: entrenador.auth0_id, [AUTH0_ROLE_CLAIM]: 'entrenador' })
    usuarioIds.push(entrenador.id)

    const admin = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|admin-panel-${randomUUID()}`,
        nombre_visible: 'Admin',
        email: `admin-panel-${randomUUID()}@example.com`,
        rol: 'admin',
      },
    })
    adminToken = buildToken({ sub: admin.auth0_id, [AUTH0_ROLE_CLAIM]: 'admin' })
    usuarioIds.push(admin.id)
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } })
    await prisma.participacion_jornada.deleteMany({ where: { jornada: { equipo_id: { in: equipoIds } } } })
    await prisma.jornada.deleteMany({ where: { equipo_id: { in: equipoIds } } })
    await prisma.registro_asistencia.deleteMany({ where: { sesion: { equipo_id: { in: equipoIds } } } })
    await prisma.sesion.deleteMany({ where: { equipo_id: { in: equipoIds } } })
    await prisma.miembro_equipo.deleteMany({ where: { equipo_id: { in: equipoIds } } })
    await prisma.persona.deleteMany({ where: { id: { in: personaIds } } })
    await prisma.equipo.deleteMany({ where: { id: { in: equipoIds } } })
    await prisma.bloque.deleteMany({ where: { temporada_id: { in: [temporadaId, temporadaSinBloqueId] } } })
    await prisma.temporada.deleteMany({ where: { id: { in: [temporadaId, temporadaSinBloqueId] } } })
    await app.close()
  })

  it('admin and entrenador are denied, director and coordinador get 200', async () => {
    await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${entrenadorToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/panel/estado/${equipoF7AlDiaId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/panel/estado/${equipoF7AlDiaId}`)
      .set('Authorization', `Bearer ${entrenadorToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${coordinadorF7Token}`)
      .expect(200)
  })

  it('coordinador only sees equipos of their categoria_asignada', async () => {
    const res = await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${coordinadorF7Token}`)
      .expect(200)

    expect(res.body.every((e: { categoria: string }) => e.categoria === 'f7')).toBe(true)
    expect(res.body.map((e: { id: string }) => e.id)).not.toContain(equipoEskolaId)
    expect(res.body.map((e: { id: string }) => e.id)).not.toContain(equipoF11Id)
  })

  it('temporada_id is required', async () => {
    await request(app.getHttpServer())
      .get('/panel/estado')
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(400)
  })

  it('a team with a past sesion missing a registro is pendiente with semaforo rojo', async () => {
    const res = await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const equipo = res.body.find((e: { id: string }) => e.id === equipoF7PendienteId)
    expect(equipo.asistencia_pendiente).toBe(true)
    expect(equipo.minutaje_pendiente).toBe(true)
    expect(equipo.semaforo).toBe('rojo')
  })

  it('a team fully up to date has semaforo verde', async () => {
    const res = await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const equipo = res.body.find((e: { id: string }) => e.id === equipoF7AlDiaId)
    expect(equipo.asistencia_pendiente).toBe(false)
    expect(equipo.minutaje_pendiente).toBe(false)
    expect(equipo.semaforo).toBe('verde')
  })

  it('eskola has minutaje_pendiente and ultima_actualizacion_minutaje as null, not false', async () => {
    const res = await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const equipo = res.body.find((e: { id: string }) => e.id === equipoEskolaId)
    expect(equipo.minutaje_pendiente).toBeNull()
    expect(equipo.ultima_actualizacion_minutaje).toBeNull()
    expect(equipo.asistencia_pendiente).toBe(true)
  })

  it('a team with no bloque activated on or before today gets semaforo sin_datos', async () => {
    const res = await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaSinBloqueId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const equipo = res.body.find((e: { id: string }) => e.id === equipoSinBloqueId)
    expect(equipo.semaforo).toBe('sin_datos')
    expect(equipo.asistencia_pendiente).toBeNull()
    expect(equipo.minutaje_pendiente).toBeNull()
  })

  it('GET /panel/estado does not create any sesion as a side effect', async () => {
    const antes = await prisma.sesion.count({ where: { equipo_id: equipoF7AlDiaId } })

    await request(app.getHttpServer())
      .get(`/panel/estado?temporada_id=${temporadaId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const despues = await prisma.sesion.count({ where: { equipo_id: equipoF7AlDiaId } })
    expect(despues).toBe(antes)
  })

  it('detail endpoint lists pending sesiones/jornadas, empty when semaforo is verde', async () => {
    const pendiente = await request(app.getHttpServer())
      .get(`/panel/estado/${equipoF7PendienteId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    expect(pendiente.body.sesiones_pendientes).toHaveLength(1)
    expect(pendiente.body.jornadas_pendientes).toHaveLength(1)
    expect(pendiente.body.jornadas_pendientes[0]).toMatchObject({ numero: 1 })

    const alDia = await request(app.getHttpServer())
      .get(`/panel/estado/${equipoF7AlDiaId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    expect(alDia.body.sesiones_pendientes).toEqual([])
    expect(alDia.body.jornadas_pendientes).toEqual([])
  })

  it('ultima_actualizacion_asistencia reflects the updatedAt of a new registro', async () => {
    const antes = await request(app.getHttpServer())
      .get(`/panel/estado/${equipoTimestampId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    expect(antes.body.ultima_actualizacion_asistencia).toBeNull()

    const sesion = await prisma.sesion.findFirstOrThrow({ where: { equipo_id: equipoTimestampId } })
    await request(app.getHttpServer())
      .patch(`/equipos/${equipoTimestampId}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesion.id, miembro_equipo_id: miembroTimestampId, estado: 'P' })
      .expect(200)

    const despues = await request(app.getHttpServer())
      .get(`/panel/estado/${equipoTimestampId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    expect(despues.body.ultima_actualizacion_asistencia).not.toBeNull()
  })
})
