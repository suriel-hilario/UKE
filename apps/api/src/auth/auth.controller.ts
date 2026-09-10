import { BadRequestException, Controller, Get, NotFoundException, Patch, Body, Req } from '@nestjs/common'
import { Request } from 'express'
import { JwtPayload } from './jwt-payload'
import { PrismaService } from '../prisma/prisma.service'
import { Idioma } from '../generated/prisma/enums'

interface Me {
  id: string
  email?: string
  rol: string
  nombre_visible?: string
  idioma?: Idioma
}

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@Req() req: Request & { user: JwtPayload }): Promise<Me> {
    const usuario = await this.prisma.usuario.findUnique({ where: { auth0_id: req.user.sub } })
    if (!usuario) {
      throw new NotFoundException('El usuario no existe en la base de datos local')
    }

    return {
      id: req.user.sub,
      email: req.user.email,
      rol: usuario.rol,
      nombre_visible: usuario.nombre_visible,
      idioma: usuario.idioma,
    }
  }

  @Patch('me/idioma')
  async updateIdioma(@Req() req: Request & { user: JwtPayload }, @Body('idioma') idioma?: Idioma) {
    if (idioma !== Idioma.eu && idioma !== Idioma.es) {
      throw new BadRequestException("idioma debe ser 'eu' o 'es'")
    }

    const usuario = await this.prisma.usuario.findUnique({ where: { auth0_id: req.user.sub } })
    if (!usuario) {
      throw new NotFoundException('El usuario no existe en la base de datos local')
    }

    return this.prisma.usuario.update({ where: { id: usuario.id }, data: { idioma } })
  }
}
