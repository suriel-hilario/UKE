import { Module } from '@nestjs/common'
import { EquiposAsistenciaController } from './equipos-asistencia.controller'
import { EquiposAsistenciaEntrenadoresController } from './equipos-asistencia-entrenadores.controller'
import { MiembrosAsistenciaController } from './miembros-asistencia.controller'
import { JornadasController } from './jornadas.controller'
import { AsistenciaAccessService } from './asistencia-access.service'
import { SesionesService } from './sesiones.service'
import { FichaService } from './ficha.service'
import { StorageService } from './storage.service'
import { PlantillaService } from './plantilla.service'
import { JornadasService } from './jornadas.service'

@Module({
  controllers: [
    EquiposAsistenciaController,
    EquiposAsistenciaEntrenadoresController,
    MiembrosAsistenciaController,
    JornadasController,
  ],
  providers: [AsistenciaAccessService, SesionesService, FichaService, StorageService, PlantillaService, JornadasService],
  exports: [AsistenciaAccessService],
})
export class AsistenciaModule {}
