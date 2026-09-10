import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsScheduler } from './notifications.scheduler'
import { MailerService } from './mailer.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [MailerService, NotificationsService, NotificationsScheduler],
  exports: [NotificationsService],
})
export class NotificationsModule {}
