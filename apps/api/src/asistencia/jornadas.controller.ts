import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { AsistenciaAccessService } from './asistencia-access.service'
import { JornadasService, JornadaInput, ParticipacionInput } from './jornadas.service'
import { getBloqueActivo } from './bloque-activo'
import { JwtPayload } from '../auth/jwt-payload'
import { PrismaService } from '../prisma/prisma.service'

@Controller('equipos/:id')
export class JornadasController {
  constructor(
    private readonly access: AsistenciaAccessService,
    private readonly jornadas: JornadasService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('jornadas')
  async listarJornadas(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Query('bloque_id') bloqueIdParam: string | undefined,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    const bloqueId = bloqueIdParam ?? (await getBloqueActivo(this.prisma, equipo.temporada_id)).id
    return this.jornadas.listarJornadas(equipo, bloqueId)
  }

  @Get('jornadas/:numero')
  async getJornada(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Param('numero') numero: string,
    @Query('bloque_id') bloqueIdParam: string | undefined,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    const bloqueId = bloqueIdParam ?? (await getBloqueActivo(this.prisma, equipo.temporada_id)).id
    return this.jornadas.getJornadaPorNumero(equipo, bloqueId, Number(numero))
  }

  @Post('jornadas')
  async guardarJornada(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Body() body: JornadaInput & { bloque_id?: string },
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)
    await this.access.assertTemporadaAbierta(equipoId)

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    const bloqueId = body.bloque_id ?? (await getBloqueActivo(this.prisma, equipo.temporada_id)).id
    return this.jornadas.guardarJornada(equipo, bloqueId, body)
  }

  @Patch('jornadas/:numero/miembro/:miembroId')
  async actualizarParticipacion(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Param('numero') numero: string,
    @Param('miembroId') miembroId: string,
    @Body() body: Omit<ParticipacionInput, 'miembro_equipo_id'> & { bloque_id?: string },
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)
    await this.access.assertTemporadaAbierta(equipoId)

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    const bloqueId = body.bloque_id ?? (await getBloqueActivo(this.prisma, equipo.temporada_id)).id
    return this.jornadas.actualizarParticipacion(equipo, bloqueId, Number(numero), miembroId, body)
  }

  @Get('dashboard')
  async getDashboard(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Query('bloque_id') bloqueIdParam: string | undefined,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    const bloqueId = bloqueIdParam ?? (await getBloqueActivo(this.prisma, equipo.temporada_id)).id
    return this.jornadas.getDashboard(equipo, bloqueId)
  }
}
