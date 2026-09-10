import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { HealthController } from './health/health.controller'
import { AuthModule } from './auth/auth.module'
import { PrismaModule } from './prisma/prisma.module'
import { AdminModule } from './admin/admin.module'
import { CatalogoModule } from './catalogo/catalogo.module'
import { AsistenciaModule } from './asistencia/asistencia.module'
import { PanelModule } from './panel/panel.module'
import { NotificationsModule } from './notifications/notifications.module'

@Module({
  imports: [ScheduleModule.forRoot(), PrismaModule, AuthModule, AdminModule, CatalogoModule, AsistenciaModule, PanelModule, NotificationsModule],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
