import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from './roles.decorator'
import { JwtPayload } from './jwt-payload'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class RolesGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>()
    const auth0Id = request.user?.sub
    const usuario = auth0Id ? await this.prisma.usuario.findUnique({ where: { auth0_id: auth0Id } }) : null

    if (!usuario || !requiredRoles.includes(usuario.rol)) {
      throw new ForbiddenException()
    }

    return true
  }
}
