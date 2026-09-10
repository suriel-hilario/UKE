import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common'
import { Roles } from '../../auth/roles.decorator'
import {
  TemporadasService,
  CreateTemporadaInput,
  UpdateTemporadaInput,
  CreateBloqueInput,
  UpdateBloqueInput,
  CreateFestivoInput,
} from './temporadas.service'

@Controller('admin/temporadas')
@Roles('admin')
export class TemporadasController {
  constructor(private readonly temporadasService: TemporadasService) {}

  @Get()
  findAll() {
    return this.temporadasService.findAll()
  }

  @Post()
  create(@Body() body: CreateTemporadaInput) {
    return this.temporadasService.create(body)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateTemporadaInput) {
    return this.temporadasService.update(id, body)
  }

  @Post(':id/close')
  @HttpCode(200)
  close(@Param('id') id: string) {
    return this.temporadasService.close(id)
  }

  @Get(':id/bloques')
  findBloques(@Param('id') id: string) {
    return this.temporadasService.findBloques(id)
  }

  @Post(':id/bloques')
  createBloque(@Param('id') id: string, @Body() body: CreateBloqueInput) {
    return this.temporadasService.createBloque(id, body)
  }

  @Patch(':id/bloques/:bloqueId')
  updateBloque(@Param('bloqueId') bloqueId: string, @Body() body: UpdateBloqueInput) {
    return this.temporadasService.updateBloque(bloqueId, body)
  }

  @Get(':id/festivos')
  findFestivos(@Param('id') id: string) {
    return this.temporadasService.findFestivos(id)
  }

  @Post(':id/festivos')
  createFestivo(@Param('id') id: string, @Body() body: CreateFestivoInput) {
    return this.temporadasService.createFestivo(id, body)
  }

  @Delete(':id/festivos/:festivoId')
  deleteFestivo(@Param('festivoId') festivoId: string) {
    return this.temporadasService.deleteFestivo(festivoId)
  }
}
