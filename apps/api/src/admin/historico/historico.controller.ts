import { Controller, Get, Query } from '@nestjs/common'
import { Roles } from '../../auth/roles.decorator'
import { HistoricoService } from './historico.service'

@Controller('admin/historico')
@Roles('admin', 'director')
export class HistoricoController {
  constructor(private readonly historicoService: HistoricoService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.historicoService.findAll(page ? Number(page) : undefined, limit ? Number(limit) : undefined)
  }
}
