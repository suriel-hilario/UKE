import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { MailerService } from './mailer.service'
import { NotificacionTipo } from '../generated/prisma/enums'
import { buildAsistenciaDiaTemplate, buildMinutajeDiaTemplate, EmailContent } from './templates'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  constructor(private prisma: PrismaService, private mailer: MailerService) {}

  private startOfToday(): Date {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  }

  async yaEnviadoHoy(usuarioId: string, equipoId: string, tipo: NotificacionTipo): Promise<boolean> {
    const exists = await this.prisma.notificacion_enviada.findFirst({
      where: { usuario_id: usuarioId, equipo_id: equipoId, tipo, fecha_envio: { gte: this.startOfToday() } },
    })
    return exists !== null
  }

  async registrarEnvio(usuarioId: string, equipoId: string, tipo: NotificacionTipo): Promise<void> {
    await this.prisma.notificacion_enviada.create({
      data: { usuario_id: usuarioId, equipo_id: equipoId, tipo, fecha_envio: new Date() },
    })
  }

  async sendEquipoNotification(
    usuarioId: string,
    equipoId: string,
    tipo: Extract<NotificacionTipo, 'asistencia_dia' | 'minutaje_dia'>,
    equipoNombre: string,
    fecha: string,
    link: string,
  ): Promise<{ sent: boolean; reason?: string }> {
    if (await this.yaEnviadoHoy(usuarioId, equipoId, tipo)) {
      return { sent: false, reason: 'already_sent' }
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } })
    if (!usuario) return { sent: false, reason: 'no_user' }

    const content: EmailContent =
      tipo === 'asistencia_dia'
        ? buildAsistenciaDiaTemplate(usuario, equipoNombre, fecha, link)
        : buildMinutajeDiaTemplate(usuario, equipoNombre, fecha, link)

    try {
      await this.mailer.sendMail({ to: usuario.email, subject: content.subject, text: content.text, html: content.html })
      await this.registrarEnvio(usuarioId, equipoId, tipo)
      return { sent: true }
    } catch (err) {
      this.logger.error('Failed to send notification', err as any)
      return { sent: false, reason: 'send_error' }
    }
  }

  async sendPrecomposedNotification(
    usuarioId: string,
    equipoIds: string[],
    tipo: NotificacionTipo,
    to: string,
    content: EmailContent,
  ): Promise<{ sent: boolean; reason?: string }> {
    try {
      await this.mailer.sendMail({ to, subject: content.subject, text: content.text, html: content.html })
      for (const equipoId of equipoIds) {
        await this.registrarEnvio(usuarioId, equipoId, tipo)
      }
      return { sent: true }
    } catch (err) {
      this.logger.error('Failed to send notification', err as any)
      return { sent: false, reason: 'send_error' }
    }
  }
}
