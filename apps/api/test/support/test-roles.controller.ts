import { Controller, Get } from '@nestjs/common'
import { Roles } from '../../src/auth/roles.decorator'

@Controller('test-roles')
export class TestRolesController {
  @Get('admin-only')
  @Roles('admin')
  adminOnly() {
    return { ok: true }
  }
}
