import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { AsistenciaAccessService } from './asistencia-access.service'
import { SesionesService, CreateSesionInput } from './sesiones.service'
import { PlantillaService } from './plantilla.service'
import { getBloqueActivo } from './bloque-activo'
import { JwtPayload } from '../auth/jwt-payload'
import { PrismaService } from '../prisma/prisma.service'

@Controller('equipos/:id')
export class EquiposAsistenciaController {
  constructor(
    private readonly access: AsistenciaAccessService,
    private readonly sesiones: SesionesService,
    private readonly plantilla: PlantillaService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('miembros')
  async createMiembro(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Body('nombre') nombre: string,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)
    await this.access.assertTemporadaAbierta(equipoId)

    return this.plantilla.createJugador(equipoId, nombre)
  }

  @Patch('miembros/:miembroId')
  async updateMiembro(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Param('miembroId') miembroId: string,
    @Body('nombre') nombre: string | undefined,
    @Body('fecha_baja') fechaBaja: string | undefined,
    @Body('orden') orden: number | undefined,
    @Body('rol_entrenador') rolEntrenador: string | undefined,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)
    await this.access.assertTemporadaAbierta(equipoId)

    return this.plantilla.updateJugador(miembroId, {
      nombre,
      fecha_baja: fechaBaja,
      orden,
      rol_entrenador: rolEntrenador,
    })
  }

  @Get('asistencia')
  async getAsistencia(
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
    return this.sesiones.getAsistenciaMensual(equipo, bloqueId, mes, ['con_ficha', 'sin_ficha'])
  }

  @Get('asistencia/exportar')
  async exportarAsistencia(
    @Req() req: Request & { user: JwtPayload },
    @Res() res: Response,
    @Param('id') equipoId: string,
    @Query('bloque_id') bloqueIdParam: string | undefined,
    @Query('mes') mes: string,
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })

    if (equipo.categoria === 'f11') {
      const temporada = await this.prisma.temporada.findUniqueOrThrow({ where: { id: equipo.temporada_id } })
      const csv = await this.sesiones.exportarCsvF11(equipo)
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="Asistencias_${equipo.nombre}_${temporada.nombre}.csv"`,
      )
      res.send(csv)
      return
    }

    const bloqueId = bloqueIdParam ?? (await getBloqueActivo(this.prisma, equipo.temporada_id)).id
    const csv = await this.sesiones.exportarCsv(equipo, bloqueId, mes)

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="UKE_${equipo.nombre}_${mes}.csv"`)
    res.send(csv)
  }

  @Patch('asistencia')
  async patchAsistencia(
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

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    return this.sesiones.upsertRegistro(sesionId, miembroEquipoId, estado, equipo.categoria, nota)
  }

  @Patch('sesiones/:sesionId')
  async patchSesion(
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

  @Post('sesiones')
  async postSesion(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') equipoId: string,
    @Body() body: CreateSesionInput & { bloque_id?: string },
  ) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)
    await this.access.assertTemporadaAbierta(equipoId)

    const equipo = await this.prisma.equipo.findUniqueOrThrow({ where: { id: equipoId } })
    const bloqueId = body.bloque_id ?? (await getBloqueActivo(this.prisma, equipo.temporada_id)).id
    return this.sesiones.createSesionManual(equipoId, body, bloqueId)
  }
}
