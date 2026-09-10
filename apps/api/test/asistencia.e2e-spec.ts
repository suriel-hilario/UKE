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

function mondaysWednesdaysInMonth(year: number, month: number): Date[] {
  const dates: Date[] = []
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate()
  for (let day = 1; day <= last; day++) {
    const date = new Date(Date.UTC(year, month - 1, day))
    const dow = date.getUTCDay() === 0 ? 7 : date.getUTCDay()
    if (dow === 1 || dow === 3) dates.push(date)
  }
  return dates
}

describe('Asistencia (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let temporadaId: string
  let equipoId: string
  let bloqueId: string
  let persona1Id: string
  let persona2Id: string
  let personaEntrenadorId: string
  let miembro1Id: string
  let miembro2Id: string
  let miembroEntrenadorId: string

  let directorToken: string
  let coordinadorToken: string
  let coordinadorSinCategoriaToken: string
  let entrenadorToken: string
  let adminToken: string

  const usuarioIds: string[] = []

  const MES = '2026-03'
  const [year, month] = MES.split('-').map(Number)
  const diasEsperados = mondaysWednesdaysInMonth(year, month)

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
        nombre: `asistencia-test-${randomUUID()}`,
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
        nombre: `Equipo asistencia ${randomUUID()}`,
        minutos_por_periodo: 25,
        num_periodos: 3,
        dias_entrenamiento: [1, 3],
      },
    })
    equipoId = equipo.id

    const bloque = await prisma.bloque.create({
      data: { temporada_id: temporadaId, tipo: 'unico', fecha_activacion: new Date('2026-01-01') },
    })
    bloqueId = bloque.id

    await prisma.festivo.create({
      data: { temporada_id: temporadaId, fecha: diasEsperados[0] },
    })

    const persona1 = await prisma.persona.create({ data: { nombre: 'Jugador Uno' } })
    const persona2 = await prisma.persona.create({ data: { nombre: 'Jugador Dos' } })
    persona1Id = persona1.id
    persona2Id = persona2.id

    const miembro1 = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoId,
        persona_id: persona1Id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-01-01'),
        orden: 0,
      },
    })
    miembro1Id = miembro1.id

    const miembro2 = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoId,
        persona_id: persona2Id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-01-01'),
        orden: 1,
      },
    })
    miembro2Id = miembro2.id

    const personaEntrenador = await prisma.persona.create({ data: { nombre: 'Entrenador Uno' } })
    personaEntrenadorId = personaEntrenador.id

    const miembroEntrenador = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoId,
        persona_id: personaEntrenadorId,
        grupo: 'entrenador',
        rol_entrenador: 'Primer entrenador',
        fecha_incorporacion: new Date('2026-01-01'),
        orden: 0,
      },
    })
    miembroEntrenadorId = miembroEntrenador.id

    const director = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|director-${randomUUID()}`,
        nombre_visible: 'Director',
        email: `director-${randomUUID()}@example.com`,
        rol: 'director',
      },
    })
    directorToken = buildToken({ sub: director.auth0_id, [AUTH0_ROLE_CLAIM]: 'director' })
    usuarioIds.push(director.id)

    const coordinador = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|coordinador-${randomUUID()}`,
        nombre_visible: 'Coordinador',
        email: `coordinador-${randomUUID()}@example.com`,
        rol: 'coordinador',
        categoria_asignada: 'f7',
      },
    })
    coordinadorToken = buildToken({ sub: coordinador.auth0_id, [AUTH0_ROLE_CLAIM]: 'coordinador' })
    usuarioIds.push(coordinador.id)

    const coordinadorSinCategoria = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|coordinador-sc-${randomUUID()}`,
        nombre_visible: 'Coordinador Sin Categoria',
        email: `coordinador-sc-${randomUUID()}@example.com`,
        rol: 'coordinador',
      },
    })
    coordinadorSinCategoriaToken = buildToken({
      sub: coordinadorSinCategoria.auth0_id,
      [AUTH0_ROLE_CLAIM]: 'coordinador',
    })
    usuarioIds.push(coordinadorSinCategoria.id)

    const entrenador = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|entrenador-${randomUUID()}`,
        nombre_visible: 'Entrenador',
        email: `entrenador-${randomUUID()}@example.com`,
        rol: 'entrenador',
      },
    })
    entrenadorToken = buildToken({ sub: entrenador.auth0_id, [AUTH0_ROLE_CLAIM]: 'entrenador' })
    usuarioIds.push(entrenador.id)
    await prisma.usuario_equipo.create({ data: { usuario_id: entrenador.id, equipo_id: equipoId } })

    const admin = await prisma.usuario.create({
      data: {
        auth0_id: `auth0|admin-${randomUUID()}`,
        nombre_visible: 'Admin',
        email: `admin-${randomUUID()}@example.com`,
        rol: 'admin',
      },
    })
    adminToken = buildToken({ sub: admin.auth0_id, [AUTH0_ROLE_CLAIM]: 'admin' })
    usuarioIds.push(admin.id)
  })

  afterAll(async () => {
    await prisma.usuario_equipo.deleteMany({ where: { equipo_id: equipoId } })
    await prisma.usuario.deleteMany({ where: { id: { in: usuarioIds } } })
    await prisma.registro_asistencia.deleteMany({ where: { sesion: { equipo_id: equipoId } } })
    await prisma.sesion.deleteMany({ where: { equipo_id: equipoId } })
    await prisma.miembro_equipo.deleteMany({ where: { equipo_id: equipoId } })
    await prisma.persona.deleteMany({ where: { id: { in: [persona1Id, persona2Id, personaEntrenadorId] } } })
    await prisma.equipo.delete({ where: { id: equipoId } })
    await prisma.bloque.delete({ where: { id: bloqueId } })
    await prisma.festivo.deleteMany({ where: { temporada_id: temporadaId } })
    await prisma.temporada.delete({ where: { id: temporadaId } })
    await app.close()
  })

  it('admin gets 403 on asistencia, sesiones and ficha endpoints', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)

    await request(app.getHttpServer())
      .get(`/miembros/${miembro1Id}/ficha?equipo_id=${equipoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403)
  })

  it('director and entrenador with scope get 200, coordinador out of category gets empty scope', async () => {
    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${entrenadorToken}`)
      .expect(200)

    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${coordinadorSinCategoriaToken}`)
      .expect(403)
  })

  it('generates regla sesiones for the month, excluding the festivo, and is idempotent', async () => {
    const first = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(first.body.sesiones).toHaveLength(diasEsperados.length - 1)

    const second = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(second.body.sesiones).toHaveLength(diasEsperados.length - 1)
    expect(second.body.sesiones.map((s: { id: string }) => s.id).sort()).toEqual(
      first.body.sesiones.map((s: { id: string }) => s.id).sort(),
    )
  })

  it('PATCH asistencia upserts and validates estado', async () => {
    const asistencia = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    const sesionId = asistencia.body.sesiones[0].id

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoId}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesionId, miembro_equipo_id: miembro1Id, estado: 'P' })
      .expect(200)

    const updated = await request(app.getHttpServer())
      .patch(`/equipos/${equipoId}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesionId, miembro_equipo_id: miembro1Id, estado: 'A' })
      .expect(200)
    expect(updated.body.estado).toBe('A')

    const count = await prisma.registro_asistencia.count({
      where: { sesion_id: sesionId, miembro_equipo_id: miembro1Id },
    })
    expect(count).toBe(1)

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoId}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: sesionId, miembro_equipo_id: miembro1Id, estado: 'X' })
      .expect(400)
  })

  it('member without a registro appears as sin marcar (null estado)', async () => {
    const asistencia = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const miembro2Data = asistencia.body.miembros.find((m: { id: string }) => m.id === miembro2Id)
    expect(miembro2Data.registros.every((r: { estado: string | null }) => r.estado === null)).toBe(true)
  })

  it('member with fecha_baja today disappears from the miembros list entirely', async () => {
    const persona3 = await prisma.persona.create({ data: { nombre: 'Se Da De Baja' } })
    const miembro3 = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoId,
        persona_id: persona3.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2026-01-01'),
        orden: 2,
      },
    })

    const before = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    expect(before.body.miembros.map((m: { id: string }) => m.id)).toContain(miembro3.id)

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoId}/miembros/${miembro3.id}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ fecha_baja: new Date().toISOString().slice(0, 10) })
      .expect(200)

    const after = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    expect(after.body.miembros.map((m: { id: string }) => m.id)).not.toContain(miembro3.id)

    await prisma.miembro_equipo.delete({ where: { id: miembro3.id } })
    await prisma.persona.delete({ where: { id: persona3.id } })
  })

  it('PATCH sesiones eliminada=true removes it from GET asistencia', async () => {
    const asistencia = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    const sesionId = asistencia.body.sesiones[asistencia.body.sesiones.length - 1].id

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoId}/sesiones/${sesionId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ eliminada: true })
      .expect(200)

    const after = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(after.body.sesiones.map((s: { id: string }) => s.id)).not.toContain(sesionId)

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoId}/sesiones/${sesionId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ eliminada: false })
      .expect(200)
  })

  it('POST sesiones creates a manual sesion and rejects duplicates', async () => {
    const fecha = '2026-03-15'

    const created = await request(app.getHttpServer())
      .post(`/equipos/${equipoId}/sesiones`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ tipo: 'partido', fecha, bloque_id: bloqueId })
      .expect(201)

    expect(created.body.origen).toBe('manual')

    await request(app.getHttpServer())
      .post(`/equipos/${equipoId}/sesiones`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ tipo: 'partido', fecha, bloque_id: bloqueId })
      .expect(409)

    await prisma.sesion.delete({ where: { id: created.body.id } })
  })

  it('GET ficha computes percentage and returns -- with no denominator', async () => {
    const ficha = await request(app.getHttpServer())
      .get(`/miembros/${miembro2Id}/ficha?equipo_id=${equipoId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(typeof ficha.body.estadisticas.porcentaje_total).toBe('number')

    const persona3 = await prisma.persona.create({ data: { nombre: 'Sin Sesiones' } })
    const miembroFuturo = await prisma.miembro_equipo.create({
      data: {
        equipo_id: equipoId,
        persona_id: persona3.id,
        grupo: 'con_ficha',
        fecha_incorporacion: new Date('2099-01-01'),
        orden: 2,
      },
    })

    const fichaVacia = await request(app.getHttpServer())
      .get(`/miembros/${miembroFuturo.id}/ficha?equipo_id=${equipoId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)
    expect(fichaVacia.body.estadisticas.porcentaje_total).toBe('--')

    await prisma.miembro_equipo.delete({ where: { id: miembroFuturo.id } })
    await prisma.persona.delete({ where: { id: persona3.id } })
  })

  it('GET asistencia/exportar returns a CSV with expected columns', async () => {
    const res = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia/exportar?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.text.split('\n')[0]).toMatch(/^Jugador,/)
    expect(res.text).toContain('Jugador Uno')
  })

  it('write endpoints return 409 when the temporada is closed', async () => {
    await prisma.temporada.update({ where: { id: temporadaId }, data: { estado: 'cerrada' } })

    await request(app.getHttpServer())
      .patch(`/equipos/${equipoId}/asistencia`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ sesion_id: randomUUID(), miembro_equipo_id: miembro1Id, estado: 'P' })
      .expect(409)

    await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    await prisma.temporada.update({ where: { id: temporadaId }, data: { estado: 'abierta' } })
  })

  it('PATCH and DELETE foto update and clear persona.foto_url', async () => {
    const tinyPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    )

    const uploaded = await request(app.getHttpServer())
      .patch(`/miembros/${miembro1Id}/foto`)
      .set('Authorization', `Bearer ${directorToken}`)
      .attach('file', tinyPng, 'avatar.png')
      .expect(200)

    expect(uploaded.body.foto_url).toBeTruthy()

    const persona = await prisma.persona.findUnique({ where: { id: persona1Id } })
    expect(persona?.foto_url).toBe(uploaded.body.foto_url)

    await request(app.getHttpServer())
      .delete(`/miembros/${miembro1Id}/foto`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    const personaAfter = await prisma.persona.findUnique({ where: { id: persona1Id } })
    expect(personaAfter?.foto_url).toBeNull()
  })

  it('GET asistencia (jugadores) excludes entrenador members', async () => {
    const asistencia = await request(app.getHttpServer())
      .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .expect(200)

    expect(asistencia.body.miembros.map((m: { id: string }) => m.id)).not.toContain(miembroEntrenadorId)
  })

  it('PATCH miembro updates rol_entrenador', async () => {
    const updated = await request(app.getHttpServer())
      .patch(`/equipos/${equipoId}/miembros/${miembroEntrenadorId}`)
      .set('Authorization', `Bearer ${directorToken}`)
      .send({ rol_entrenador: 'Segundo entrenador' })
      .expect(200)

    expect(updated.body.rol_entrenador).toBe('Segundo entrenador')

    const miembro = await prisma.miembro_equipo.findUniqueOrThrow({ where: { id: miembroEntrenadorId } })
    expect(miembro.rol_entrenador).toBe('Segundo entrenador')
  })

  describe('asistencia de entrenadores', () => {
    it('GET asistencia/entrenadores includes only the entrenador and reuses the same sesiones', async () => {
      const jugadores = await request(app.getHttpServer())
        .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200)

      const entrenadores = await request(app.getHttpServer())
        .get(`/equipos/${equipoId}/asistencia/entrenadores?bloque_id=${bloqueId}&mes=${MES}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200)

      expect(entrenadores.body.miembros.map((m: { id: string }) => m.id)).toEqual([miembroEntrenadorId])
      expect(entrenadores.body.sesiones.map((s: { id: string }) => s.id).sort()).toEqual(
        jugadores.body.sesiones.map((s: { id: string }) => s.id).sort(),
      )
    })

    it('PATCH asistencia/entrenadores upserts, rejects non-entrenador members and validates estado', async () => {
      const asistencia = await request(app.getHttpServer())
        .get(`/equipos/${equipoId}/asistencia/entrenadores?bloque_id=${bloqueId}&mes=${MES}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200)
      const sesionId = asistencia.body.sesiones[0].id

      const updated = await request(app.getHttpServer())
        .patch(`/equipos/${equipoId}/asistencia/entrenadores`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ sesion_id: sesionId, miembro_equipo_id: miembroEntrenadorId, estado: 'P' })
        .expect(200)
      expect(updated.body.estado).toBe('P')

      await request(app.getHttpServer())
        .patch(`/equipos/${equipoId}/asistencia/entrenadores`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ sesion_id: sesionId, miembro_equipo_id: miembro1Id, estado: 'P' })
        .expect(400)

      await request(app.getHttpServer())
        .patch(`/equipos/${equipoId}/asistencia/entrenadores`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ sesion_id: sesionId, miembro_equipo_id: miembroEntrenadorId, estado: 'X' })
        .expect(400)
    })

    it('write endpoints return 409 when the temporada is closed', async () => {
      await prisma.temporada.update({ where: { id: temporadaId }, data: { estado: 'cerrada' } })

      await request(app.getHttpServer())
        .patch(`/equipos/${equipoId}/asistencia/entrenadores`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ sesion_id: randomUUID(), miembro_equipo_id: miembroEntrenadorId, estado: 'P' })
        .expect(409)

      await prisma.temporada.update({ where: { id: temporadaId }, data: { estado: 'abierta' } })
    })

    it('PATCH sesiones/:sesionId eliminada=true hides it from both entrenadores and jugadores views', async () => {
      const asistencia = await request(app.getHttpServer())
        .get(`/equipos/${equipoId}/asistencia/entrenadores?bloque_id=${bloqueId}&mes=${MES}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200)
      const sesionId = asistencia.body.sesiones[asistencia.body.sesiones.length - 1].id

      await request(app.getHttpServer())
        .patch(`/equipos/${equipoId}/asistencia/entrenadores/sesiones/${sesionId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ eliminada: true })
        .expect(200)

      const afterEntrenadores = await request(app.getHttpServer())
        .get(`/equipos/${equipoId}/asistencia/entrenadores?bloque_id=${bloqueId}&mes=${MES}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200)
      expect(afterEntrenadores.body.sesiones.map((s: { id: string }) => s.id)).not.toContain(sesionId)

      const afterJugadores = await request(app.getHttpServer())
        .get(`/equipos/${equipoId}/asistencia?bloque_id=${bloqueId}&mes=${MES}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .expect(200)
      expect(afterJugadores.body.sesiones.map((s: { id: string }) => s.id)).not.toContain(sesionId)

      await request(app.getHttpServer())
        .patch(`/equipos/${equipoId}/asistencia/entrenadores/sesiones/${sesionId}`)
        .set('Authorization', `Bearer ${directorToken}`)
        .send({ eliminada: false })
        .expect(200)
    })
  })
})
