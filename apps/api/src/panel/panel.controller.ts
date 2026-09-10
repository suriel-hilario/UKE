import { BadRequestException, Controller, Get, Param, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { PanelService } from './panel.service'
import { AsistenciaAccessService } from '../asistencia/asistencia-access.service'
import { JwtPayload } from '../auth/jwt-payload'

@Controller('panel')
export class PanelController {
  constructor(
    private readonly panel: PanelService,
    private readonly access: AsistenciaAccessService,
  ) {}

  @Get('estado')
  async getEstado(
    @Req() req: Request & { user: JwtPayload },
    @Query('temporada_id') temporadaId: string | undefined,
  ) {
    if (!temporadaId) {
      throw new BadRequestException('temporada_id es obligatorio')
    }

    const usuario = await this.access.resolveUsuario(req.user.sub)
    return this.panel.getEstadoTemporada(usuario, temporadaId)
  }

  @Get('estado/:equipoId')
  async getEstadoEquipo(@Req() req: Request & { user: JwtPayload }, @Param('equipoId') equipoId: string) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    return this.panel.getEstadoEquipo(usuario, equipoId)
  }
}
