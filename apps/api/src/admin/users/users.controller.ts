import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { Roles } from '../../auth/roles.decorator'
import { UsersService, CreateUserInput, UpdateUserInput } from './users.service'

@Controller('admin/users')
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll()
  }

  @Post()
  create(@Body() body: CreateUserInput) {
    return this.usersService.create(body)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateUserInput) {
    return this.usersService.update(id, body)
  }

  @Delete(':id')
  disable(@Param('id') id: string) {
    return this.usersService.disable(id)
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  async resetPassword(@Param('id') id: string) {
    await this.usersService.resetPassword(id)
    return { ok: true }
  }
}
