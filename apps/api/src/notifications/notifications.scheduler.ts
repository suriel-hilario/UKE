import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { CronJob } from 'cron'
import { SchedulerRegistry } from '@nestjs/schedule'
import { NotificationsService } from './notifications.service'
import { PrismaService } from '../prisma/prisma.service'
import { loadMailerConfig } from '../config/mailer.config'
import { buildRecordatorioSemanalTemplate } from './templates'

const DAILY_JOB_NAME = 'notifications-daily'
const WEEKLY_JOB_NAME = 'notifications-weekly'

@Injectable()
export class NotificationsScheduler implements OnModuleInit {
  private readonly logger = new Logger(NotificationsScheduler.name)

  constructor(
    private notifications: NotificationsService,
    private prisma: PrismaService,
    private schedulerRegistry: SchedulerRegistry,
  ) {}

  onModuleInit() {
    const { tz } = loadMailerConfig()

    const dailyJob = new CronJob(
      '0 0 20 * * *',
      () => this.handleDaily().catch((err) => this.logger.error('daily notifications failed', err as any)),
      null,
      false,
      tz,
    )
    this.schedulerRegistry.addCronJob(DAILY_JOB_NAME, dailyJob)
    dailyJob.start()

    const weeklyJob = new CronJob(
      '0 0 8 * * 1',
      () => this.handleWeekly().catch((err) => this.logger.error('weekly reminder failed', err as any)),
      null,
      false,
      tz,
    )
    this.schedulerRegistry.addCronJob(WEEKLY_JOB_NAME, weeklyJob)
    weeklyJob.start()
  }

  private todayDateOnly(): Date {
    const today = new Date()
    return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  }

  private formatFecha(fecha: Date): string {
    return fecha.toISOString().slice(0, 10)
  }

  async handleDaily() {
    const { appBaseUrl } = loadMailerConfig()
    const dateOnly = this.todayDateOnly()
    const fechaStr = this.formatFecha(dateOnly)

    const sessions = await this.prisma.sesion.findMany({ where: { fecha: dateOnly, eliminada: false }, include: { equipo: true } })

    for (const ses of sessions) {
      const tipo = ses.tipo === 'entrenamiento' ? 'asistencia_dia' : 'minutaje_dia'
      const tab = tipo === 'minutaje_dia' ? 'minutaje' : 'asistencia'
      const link = `${appBaseUrl}/equipos/${ses.equipo_id}?tab=${tab}`

      const usuarios = await this.prisma.usuario_equipo.findMany({ where: { equipo_id: ses.equipo_id }, include: { usuario: true } })

      for (const ue of usuarios) {
        if (ue.usuario.rol !== 'entrenador') continue

        await this.notifications.sendEquipoNotification(ue.usuario_id, ses.equipo_id, tipo, ses.equipo.nombre, fechaStr, link)
      }
    }
  }

  async handleWeekly() {
    const { appBaseUrl } = loadMailerConfig()
    const today = this.todayDateOnly()

    const coaches = await this.prisma.usuario.findMany({
      where: { rol: 'entrenador' },
      include: { equipos: { include: { equipo: { include: { temporada: { include: { bloques: true } } } } } } },
    })

    for (const coach of coaches) {
      const equiposElegibles = coach.equipos
        .map((ue) => ue.equipo)
        .filter((equipo) => equipo.temporada.estado === 'abierta' && equipo.temporada.bloques.some((b) => b.fecha_activacion <= today))

      if (equiposElegibles.length === 0) continue

      const yaEnviado = await Promise.all(
        equiposElegibles.map((equipo) => this.notifications.yaEnviadoHoy(coach.id, equipo.id, 'recordatorio_semanal')),
      )
      if (yaEnviado.some(Boolean)) continue

      const content = buildRecordatorioSemanalTemplate(
        coach,
        equiposElegibles.map((equipo) => ({ nombre: equipo.nombre, link: `${appBaseUrl}/equipos/${equipo.id}` })),
      )

      await this.notifications.sendPrecomposedNotification(
        coach.id,
        equiposElegibles.map((e) => e.id),
        'recordatorio_semanal',
        coach.email,
        content,
      )
    }
  }
}
