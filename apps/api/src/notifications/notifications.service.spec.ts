import { NotificationsService } from './notifications.service'

describe('NotificationsService', () => {
  const usuarioEu = { id: 'u1', email: 'coach-eu@uke.local', idioma: 'eu', nombre_visible: 'Coach EU' }
  const usuarioEs = { id: 'u2', email: 'coach-es@uke.local', idioma: 'es', nombre_visible: 'Coach ES' }

  function buildService() {
    const prisma = {
      notificacion_enviada: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      usuario: {
        findUnique: jest.fn(),
      },
    }
    const mailer = {
      sendMail: jest.fn().mockResolvedValue({}),
    }
    const service = new NotificationsService(prisma as any, mailer as any)
    return { service, prisma, mailer }
  }

  it('no reenvía asistencia_dia si ya existe notificacion_enviada de hoy', async () => {
    const { service, prisma, mailer } = buildService()
    prisma.notificacion_enviada.findFirst.mockResolvedValue({ id: 'existing' })

    const result = await service.sendEquipoNotification('u1', 'e1', 'asistencia_dia', 'Alevin A', '2026-08-27', 'http://link')

    expect(result).toEqual({ sent: false, reason: 'already_sent' })
    expect(mailer.sendMail).not.toHaveBeenCalled()
    expect(prisma.notificacion_enviada.create).not.toHaveBeenCalled()
  })

  it('usuario con idioma eu recibe el email en euskera', async () => {
    const { service, prisma, mailer } = buildService()
    prisma.usuario.findUnique.mockResolvedValue(usuarioEu)

    await service.sendEquipoNotification('u1', 'e1', 'asistencia_dia', 'Alevin A', '2026-08-27', 'http://link')

    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: usuarioEu.email,
        subject: expect.stringContaining('Mesedez, erregistratu gaurko asistentzia'),
      }),
    )
  })

  it('usuario con idioma es recibe el email en castellano', async () => {
    const { service, prisma, mailer } = buildService()
    prisma.usuario.findUnique.mockResolvedValue(usuarioEs)

    await service.sendEquipoNotification('u2', 'e1', 'asistencia_dia', 'Alevin A', '2026-08-27', 'http://link')

    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: usuarioEs.email,
        subject: expect.stringContaining('Por favor, registre la asistencia de hoy'),
      }),
    )
  })

  it('minutaje_dia compone el asunto de minutaje, no de asistencia', async () => {
    const { service, prisma, mailer } = buildService()
    prisma.usuario.findUnique.mockResolvedValue(usuarioEs)

    await service.sendEquipoNotification('u2', 'e1', 'minutaje_dia', 'Alevin A', '2026-08-27', 'http://link')

    expect(mailer.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('registre el minutaje del partido de hoy') }),
    )
  })

  it('registra notificacion_enviada solo tras un envío exitoso', async () => {
    const { service, prisma, mailer } = buildService()
    prisma.usuario.findUnique.mockResolvedValue(usuarioEs)

    await service.sendEquipoNotification('u2', 'e1', 'asistencia_dia', 'Alevin A', '2026-08-27', 'http://link')

    expect(prisma.notificacion_enviada.create).toHaveBeenCalledWith({
      data: { usuario_id: 'u2', equipo_id: 'e1', tipo: 'asistencia_dia', fecha_envio: expect.any(Date) },
    })
  })

  it('no registra notificacion_enviada si el envío SMTP falla', async () => {
    const { service, prisma, mailer } = buildService()
    prisma.usuario.findUnique.mockResolvedValue(usuarioEs)
    mailer.sendMail.mockRejectedValue(new Error('smtp down'))

    const result = await service.sendEquipoNotification('u2', 'e1', 'asistencia_dia', 'Alevin A', '2026-08-27', 'http://link')

    expect(result).toEqual({ sent: false, reason: 'send_error' })
    expect(prisma.notificacion_enviada.create).not.toHaveBeenCalled()
  })
})
