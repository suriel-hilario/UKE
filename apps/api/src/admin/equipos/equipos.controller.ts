import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Roles } from '../../auth/roles.decorator'
import {
  EquiposService,
  CreateEquipoInput,
  UpdateEquipoInput,
  CreateMiembroInput,
  UpdateMiembroInput,
} from './equipos.service'
import { ImportJugadoresService } from './import-jugadores.service'

@Controller('admin/equipos')
@Roles('admin')
export class EquiposController {
  constructor(
    private readonly equiposService: EquiposService,
    private readonly importJugadoresService: ImportJugadoresService,
  ) {}

  @Get()
  findAll(@Query('temporada_id') temporadaId?: string) {
    return this.equiposService.findAll(temporadaId)
  }

  @Post()
  create(@Body() body: CreateEquipoInput) {
    return this.equiposService.create(body)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: UpdateEquipoInput) {
    return this.equiposService.update(id, body)
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.equiposService.remove(id)
  }

  @Get(':id/miembros')
  findMiembros(@Param('id') id: string) {
    return this.equiposService.findMiembros(id)
  }

  @Post(':id/miembros')
  createMiembro(@Param('id') id: string, @Body() body: CreateMiembroInput) {
    return this.equiposService.createMiembro(id, body)
  }

  @Patch(':id/miembros/:miembroId')
  updateMiembro(@Param('miembroId') miembroId: string, @Body() body: UpdateMiembroInput) {
    return this.equiposService.updateMiembro(miembroId, body)
  }

  @Delete(':id/miembros/:miembroId')
  removeMiembro(@Param('miembroId') miembroId: string) {
    return this.equiposService.removeMiembro(miembroId)
  }

  @Post(':id/import-jugadores')
  @UseInterceptors(FileInterceptor('file'))
  async importJugadores(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('confirm') confirm?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Falta el archivo .xlsx/.xls')
    }

    const preview = await this.importJugadoresService.parse(file.buffer)

    if (confirm !== 'true') {
      return preview
    }

    const result = await this.importJugadoresService.persist(id, preview.valid)
    return { ...preview, ...result }
  }
}
