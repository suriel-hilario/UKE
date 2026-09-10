const cronJobConstructorCalls: any[] = []

jest.mock('cron', () => ({
  CronJob: jest.fn().mockImplementation(function (this: any, ...args: any[]) {
    cronJobConstructorCalls.push(args)
    this.start = jest.fn()
    this.stop = jest.fn()
  }),
}))

import { NotificationsScheduler } from './notifications.scheduler'

describe('NotificationsScheduler', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    cronJobConstructorCalls.length = 0
    jest.clearAllMocks()
    process.env = {
      ...OLD_ENV,
      SMTP_HOST: 'localhost',
      SMTP_PORT: '1025',
      SMTP_FROM: 'UKE App <noreply@uke.local>',
      APP_BASE_URL: 'http://localhost:3000',
      TZ: 'Europe/Madrid',
    }
  })

  afterEach(() => {
    process.env = OLD_ENV
  })

  function buildScheduler(prismaOverrides: any = {}) {
    const notifications = {
      sendEquipoNotification: jest.fn().mockResolvedValue({ sent: true }),
      sendPrecomposedNotification: jest.fn().mockResolvedValue({ sent: true }),
      yaEnviadoHoy: jest.fn().mockResolvedValue(false),
      registrarEnvio: jest.fn().mockResolvedValue(undefined),
    }
    const prisma = {
      sesion: { findMany: jest.fn().mockResolvedValue([]) },
      usuario_equipo: { findMany: jest.fn().mockResolvedValue([]) },
      usuario: { findMany: jest.fn().mockResolvedValue([]) },
      ...prismaOverrides,
    }
    const schedulerRegistry = { addCronJob: jest.fn() }
    const scheduler = new NotificationsScheduler(notifications as any, prisma as any, schedulerRegistry as any)
    return { scheduler, notifications, prisma, schedulerRegistry }
  }

  it('registra los cron jobs con el timezone configurado (TZ=Europe/Madrid), no undefined ni UTC', () => {
    const { scheduler, schedulerRegistry } = buildScheduler()

    scheduler.onModuleInit()

    expect(schedulerRegistry.addCronJob).toHaveBeenCalledTimes(2)
    expect(cronJobConstructorCalls).toHaveLength(2)
    for (const args of cronJobConstructorCalls) {
      // constructor signature: (cronTime, onTick, onComplete, startNow, timeZone, ...)
      expect(args[4]).toBe('Europe/Madrid')
    }
  })

  describe('handleDaily', () => {
    it('sesión de tipo entrenamiento hoy envía asistencia_dia a los entrenadores del equipo', async () => {
      const { scheduler, prisma, notifications } = buildScheduler({
        sesion: {
          findMany: jest.fn().mockResolvedValue([
            { equipo_id: 'e1', tipo: 'entrenamiento', equipo: { nombre: 'Alevin A' } },
          ]),
        },
        usuario_equipo: {
          findMany: jest.fn().mockResolvedValue([{ usuario_id: 'u1', usuario: { rol: 'entrenador' } }]),
        },
      })

      await scheduler.handleDaily()

      expect(notifications.sendEquipoNotification).toHaveBeenCalledWith(
        'u1',
        'e1',
        'asistencia_dia',
        'Alevin A',
        expect.any(String),
        expect.stringContaining('tab=asistencia'),
      )
    })

    it('sesión de tipo partido hoy envía minutaje_dia en vez de asistencia_dia', async () => {
      const { scheduler, notifications } = buildScheduler({
        sesion: {
          findMany: jest.fn().mockResolvedValue([{ equipo_id: 'e1', tipo: 'partido', equipo: { nombre: 'Alevin A' } }]),
        },
        usuario_equipo: {
          findMany: jest.fn().mockResolvedValue([{ usuario_id: 'u1', usuario: { rol: 'entrenador' } }]),
        },
      })

      await scheduler.handleDaily()

      expect(notifications.sendEquipoNotification).toHaveBeenCalledWith(
        'u1',
        'e1',
        'minutaje_dia',
        'Alevin A',
        expect.any(String),
        expect.stringContaining('tab=minutaje'),
      )
    })

    it('entrenador con dos equipos con sesión hoy recibe dos llamadas independientes', async () => {
      const { scheduler, notifications } = buildScheduler({
        sesion: {
          findMany: jest.fn().mockResolvedValue([
            { equipo_id: 'e1', tipo: 'entrenamiento', equipo: { nombre: 'Equipo 1' } },
            { equipo_id: 'e2', tipo: 'entrenamiento', equipo: { nombre: 'Equipo 2' } },
          ]),
        },
        usuario_equipo: {
          findMany: jest
            .fn()
            .mockResolvedValueOnce([{ usuario_id: 'u1', usuario: { rol: 'entrenador' } }])
            .mockResolvedValueOnce([{ usuario_id: 'u1', usuario: { rol: 'entrenador' } }]),
        },
      })

      await scheduler.handleDaily()

      expect(notifications.sendEquipoNotification).toHaveBeenCalledTimes(2)
      expect(notifications.sendEquipoNotification).toHaveBeenCalledWith('u1', 'e1', 'asistencia_dia', 'Equipo 1', expect.any(String), expect.any(String))
      expect(notifications.sendEquipoNotification).toHaveBeenCalledWith('u1', 'e2', 'asistencia_dia', 'Equipo 2', expect.any(String), expect.any(String))
    })

    it('no notifica a usuarios del equipo que no son entrenadores', async () => {
      const { scheduler, notifications } = buildScheduler({
        sesion: {
          findMany: jest.fn().mockResolvedValue([{ equipo_id: 'e1', tipo: 'entrenamiento', equipo: { nombre: 'Alevin A' } }]),
        },
        usuario_equipo: {
          findMany: jest.fn().mockResolvedValue([{ usuario_id: 'u1', usuario: { rol: 'director' } }]),
        },
      })

      await scheduler.handleDaily()

      expect(notifications.sendEquipoNotification).not.toHaveBeenCalled()
    })
  })

  describe('handleWeekly', () => {
    const today = new Date()
    const ayer = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const manana = new Date(today.getTime() + 24 * 60 * 60 * 1000)

    it('entrenador con equipo en temporada abierta pero SIN bloque activo no recibe el semanal', async () => {
      const { scheduler, notifications } = buildScheduler({
        usuario: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'coach1',
              email: 'coach1@uke.local',
              nombre_visible: 'Coach 1',
              equipos: [
                {
                  equipo: {
                    id: 'e1',
                    nombre: 'Alevin A',
                    temporada: { estado: 'abierta', bloques: [{ fecha_activacion: manana }] },
                  },
                },
              ],
            },
          ]),
        },
      })

      await scheduler.handleWeekly()

      expect(notifications.sendPrecomposedNotification).not.toHaveBeenCalled()
    })

    it('entrenador con equipo en temporada abierta y bloque activo recibe el semanal', async () => {
      const { scheduler, notifications } = buildScheduler({
        usuario: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'coach1',
              email: 'coach1@uke.local',
              nombre_visible: 'Coach 1',
              idioma: 'es',
              equipos: [
                {
                  equipo: {
                    id: 'e1',
                    nombre: 'Alevin A',
                    temporada: { estado: 'abierta', bloques: [{ fecha_activacion: ayer }] },
                  },
                },
              ],
            },
          ]),
        },
      })

      await scheduler.handleWeekly()

      expect(notifications.sendPrecomposedNotification).toHaveBeenCalledWith(
        'coach1',
        ['e1'],
        'recordatorio_semanal',
        'coach1@uke.local',
        expect.any(Object),
      )
    })

    it('entrenador sin equipos en temporada abierta no recibe nada', async () => {
      const { scheduler, notifications } = buildScheduler({
        usuario: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'coach1',
              email: 'coach1@uke.local',
              nombre_visible: 'Coach 1',
              equipos: [
                {
                  equipo: {
                    id: 'e1',
                    nombre: 'Alevin A',
                    temporada: { estado: 'cerrada', bloques: [{ fecha_activacion: ayer }] },
                  },
                },
              ],
            },
          ]),
        },
      })

      await scheduler.handleWeekly()

      expect(notifications.sendPrecomposedNotification).not.toHaveBeenCalled()
    })

    it('no reenvía el semanal si ya se envió hoy para alguno de sus equipos elegibles', async () => {
      const { scheduler, notifications } = buildScheduler({
        usuario: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'coach1',
              email: 'coach1@uke.local',
              nombre_visible: 'Coach 1',
              equipos: [
                {
                  equipo: {
                    id: 'e1',
                    nombre: 'Alevin A',
                    temporada: { estado: 'abierta', bloques: [{ fecha_activacion: ayer }] },
                  },
                },
              ],
            },
          ]),
        },
      })
      notifications.yaEnviadoHoy.mockResolvedValue(true)

      await scheduler.handleWeekly()

      expect(notifications.sendPrecomposedNotification).not.toHaveBeenCalled()
    })
  })
})
