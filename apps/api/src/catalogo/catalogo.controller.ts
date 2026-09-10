import { Controller, Get, Param, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { CatalogoAccessService } from './catalogo-access.service'
import { CatalogoService } from './catalogo.service'
import { JwtPayload } from '../auth/jwt-payload'

@Controller('catalogo')
export class CatalogoController {
  constructor(
    private readonly catalogoService: CatalogoService,
    private readonly access: CatalogoAccessService,
  ) {}

  @Get('temporadas')
  findTemporadas() {
    return this.catalogoService.findTemporadas()
  }

  @Get('temporadas/:id/equipos')
  async findEquipos(@Req() req: Request & { user: JwtPayload }, @Param('id') temporadaId: string) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    return this.catalogoService.findEquiposByTemporada(usuario, temporadaId)
  }

  @Get('equipos/:id')
  async findEquipoDetail(@Req() req: Request & { user: JwtPayload }, @Param('id') equipoId: string) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    return this.catalogoService.findEquipoDetail(usuario, equipoId)
  }

  @Get('equipos/:id/sesiones')
  async findSesiones(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Query('bloque_id') bloqueId?: string,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    return this.catalogoService.findSesiones(usuario, equipoId, bloqueId)
  }
}
