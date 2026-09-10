import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common'
import { Request } from 'express'
import { AsistenciaAccessService } from './asistencia-access.service'
import { SesionesService } from './sesiones.service'
import { getBloqueActivo } from './bloque-activo'
import { JwtPayload } from '../auth/jwt-payload'
import { PrismaService } from '../prisma/prisma.service'

@Controller('equipos/:id/asistencia/entrenadores')
export class EquiposAsistenciaEntrenadoresController {
  constructor(
    private readonly access: AsistenciaAccessService,
    private readonly sesiones: SesionesService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async getAsistenciaEntrenadores(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Query('bloque_id') bloqueIdParam: string | undefined,
    @Query('mes') mes: string,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    const bloqueId = bloqueIdParam ?? (await getBloqueActivo(this.prisma, equipo.temporada_id)).id
    await this.sesiones.ensureSesionesRegla(equipo, bloqueId, mes)
    return this.sesiones.getAsistenciaMensual(equipo, bloqueId, mes, ['entrenador'])
  }

  @Patch()
  async patchAsistenciaEntrenadores(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Body('sesion_id') sesionId: string,
    @Body('miembro_equipo_id') miembroEquipoId: string,
    @Body('estado') estado: string,
    @Body('nota') nota?: string,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)
    await this.access.assertTemporadaAbierta(equipoId)

    const miembro = await this.prisma.miembro_equipo.findUniqueOrThrow({ where: { id: miembroEquipoId } })
    if (miembro.grupo !== 'entrenador') {
      throw new BadRequestException('miembro_equipo_id debe pertenecer a un entrenador')
    }

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    return this.sesiones.upsertRegistro(sesionId, miembroEquipoId, estado, equipo.categoria, nota)
  }

  @Patch('sesiones/:sesionId')
  async patchSesionEntrenadores(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Param('sesionId') sesionId: string,
    @Body('eliminada') eliminada: boolean,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)
    await this.access.assertTemporadaAbierta(equipoId)

    return this.sesiones.setSesionEliminada(sesionId, eliminada)
  }
}
