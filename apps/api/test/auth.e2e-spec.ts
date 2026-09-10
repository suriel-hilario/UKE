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
import { AuthModule } from '../src/auth/auth.module'
import { PrismaModule } from '../src/prisma/prisma.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { TestRolesController } from './support/test-roles.controller'

describe('Auth (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminId: string
  let adminAuth0Id: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    prisma = app.get(PrismaService)

    adminAuth0Id = `auth0|admin-${randomUUID()}`
    const admin = await prisma.usuario.create({
      data: {
        auth0_id: adminAuth0Id,
        nombre_visible: 'Admin Test',
        email: 'user@example.com',
        rol: 'admin',
      },
    })
    adminId = admin.id
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: adminId } })
    await app.close()
  })

  it('GET /health without token returns 200', async () => {
    await request(app.getHttpServer()).get('/health').expect(200)
  })

  it('GET /auth/me without token returns 401', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401)
  })

  it('GET /auth/me with an invalid token returns 401', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401)
  })

  it('GET /auth/me with an expired token returns 401', async () => {
    const expired = buildToken({ sub: adminAuth0Id }, -10)
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expired}`)
      .expect(401)
  })

  it('GET /auth/me with a valid token returns 200 with rol from the local usuario row, not the JWT claim', async () => {
    // JWT claim says 'entrenador' but the local usuario row says 'admin' — response must follow the DB.
    const token = buildToken({ sub: adminAuth0Id, email: 'user@example.com', [AUTH0_ROLE_CLAIM]: 'entrenador' })
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body).toMatchObject({ id: adminAuth0Id, email: 'user@example.com', rol: 'admin' })
  })

  it('GET /auth/me with a valid token but no local usuario row returns 404', async () => {
    const token = buildToken({ sub: `auth0|no-local-row-${randomUUID()}` })
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })
})

describe('Roles guard (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let adminId: string
  let entrenadorId: string
  let adminAuth0Id: string
  let entrenadorAuth0Id: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AuthModule, PrismaModule],
      controllers: [TestRolesController],
    }).compile()

    app = moduleRef.createNestApplication()
    await app.init()

    prisma = app.get(PrismaService)

    adminAuth0Id = `auth0|roles-admin-${randomUUID()}`
    const admin = await prisma.usuario.create({
      data: { auth0_id: adminAuth0Id, nombre_visible: 'Admin', email: `${randomUUID()}@example.com`, rol: 'admin' },
    })
    adminId = admin.id

    entrenadorAuth0Id = `auth0|roles-entrenador-${randomUUID()}`
    const entrenador = await prisma.usuario.create({
      data: {
        auth0_id: entrenadorAuth0Id,
        nombre_visible: 'Entrenador',
        email: `${randomUUID()}@example.com`,
        rol: 'entrenador',
      },
    })
    entrenadorId = entrenador.id
  })

  afterAll(async () => {
    await prisma.usuario.deleteMany({ where: { id: { in: [adminId, entrenadorId] } } })
    await app.close()
  })

  it('rejects a DB role not in the required list with 403', async () => {
    const token = buildToken({ sub: entrenadorAuth0Id, [AUTH0_ROLE_CLAIM]: 'entrenador' })
    await request(app.getHttpServer())
      .get('/test-roles/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('allows a DB role in the required list with 200', async () => {
    const token = buildToken({ sub: adminAuth0Id, [AUTH0_ROLE_CLAIM]: 'admin' })
    await request(app.getHttpServer())
      .get('/test-roles/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
  })

  it('rejects when the JWT claim says admin but the DB role does not', async () => {
    // JWT claim says 'admin' but the local usuario row for this auth0_id says 'entrenador'.
    const token = buildToken({ sub: entrenadorAuth0Id, [AUTH0_ROLE_CLAIM]: 'admin' })
    await request(app.getHttpServer())
      .get('/test-roles/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })

  it('rejects a valid token with no matching local usuario row with 403', async () => {
    const token = buildToken({ sub: `auth0|no-local-row-${randomUUID()}`, [AUTH0_ROLE_CLAIM]: 'admin' })
    await request(app.getHttpServer())
      .get('/test-roles/admin-only')
      .set('Authorization', `Bearer ${token}`)
      .expect(403)
  })
})
