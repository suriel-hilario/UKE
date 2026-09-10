import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Request } from 'express'
import Jimp from 'jimp'
import { randomUUID } from 'crypto'
import { AsistenciaAccessService } from './asistencia-access.service'
import { FichaService } from './ficha.service'
import { StorageService } from './storage.service'
import { JwtPayload } from '../auth/jwt-payload'
import { PrismaService } from '../prisma/prisma.service'

const AVATAR_MAX_SIZE = 200

@Controller('miembros')
export class MiembrosAsistenciaController {
  constructor(
    private readonly access: AsistenciaAccessService,
    private readonly ficha: FichaService,
    private readonly storage: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':miembroId/ficha')
  async getFicha(
    @Req() req: Request & { user: JwtPayload },
    @Param('miembroId') miembroId: string,
    @Query('equipo_id') equipoId: string,
  ) {
    await this.assertMiembroEnEquipo(req, miembroId, equipoId)
    return this.ficha.getFicha(miembroId, equipoId)
  }

  @Patch(':miembroId/foto')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFoto(
    @Req() req: Request & { user: JwtPayload },
    @Param('miembroId') miembroId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo de imagen')
    }

    const miembro = await this.assertMiembroAccess(req, miembroId)

    const image = await Jimp.read(file.buffer)
    image.scaleToFit(AVATAR_MAX_SIZE, AVATAR_MAX_SIZE)
    const buffer = await image.getBufferAsync(Jimp.MIME_JPEG)

    const key = `personas/${miembro.persona_id}/${randomUUID()}.jpg`
    const url = await this.storage.upload(buffer, key, 'image/jpeg')

    await this.prisma.persona.update({ where: { id: miembro.persona_id }, data: { foto_url: url } })

    return { foto_url: url }
  }

  @Delete(':miembroId/foto')
  async deleteFoto(@Req() req: Request & { user: JwtPayload }, @Param('miembroId') miembroId: string) {
    const miembro = await this.assertMiembroAccess(req, miembroId)
    await this.prisma.persona.update({ where: { id: miembro.persona_id }, data: { foto_url: null } })
    return { foto_url: null }
  }

  private async assertMiembroEnEquipo(req: Request & { user: JwtPayload }, miembroId: string, equipoId: string) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    await this.access.assertEquipoAccess(usuario, equipoId)

    const miembro = await this.prisma.miembro_equipo.findUniqueOrThrow({ where: { id: miembroId } })
    if (miembro.equipo_id !== equipoId) {
      throw new BadRequestException('El miembro no pertenece al equipo indicado')
    }
    return miembro
  }

  private async assertMiembroAccess(req: Request & { user: JwtPayload }, miembroId: string) {
    const usuario = await this.access.resolveUsuario(req.user.sub)
    const miembro = await this.prisma.miembro_equipo.findUniqueOrThrow({ where: { id: miembroId } })
    await this.access.assertEquipoAccess(usuario, miembro.equipo_id)
    await this.access.assertTemporadaAbierta(miembro.equipo_id)
    return miembro
  }
}
