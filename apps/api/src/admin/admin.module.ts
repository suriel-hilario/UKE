import { Module } from '@nestjs/common'
import { ManagementService } from './management/management.service'
import { UsersController } from './users/users.controller'
import { UsersService } from './users/users.service'
import { TemporadasController } from './temporadas/temporadas.controller'
import { TemporadasService } from './temporadas/temporadas.service'
import { EquiposController } from './equipos/equipos.controller'
import { EquiposService } from './equipos/equipos.service'
import { ImportJugadoresService } from './equipos/import-jugadores.service'
import { HistoricoModule } from './historico/historico.module'

@Module({
  imports: [HistoricoModule],
  controllers: [UsersController, TemporadasController, EquiposController],
  providers: [
    ManagementService,
    UsersService,
    TemporadasService,
    EquiposService,
    ImportJugadoresService,
  ],
})
export class AdminModule {}
