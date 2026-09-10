import { Module } from '@nestjs/common'
import { CatalogoController } from './catalogo.controller'
import { CatalogoService } from './catalogo.service'
import { CatalogoAccessService } from './catalogo-access.service'

@Module({
  controllers: [CatalogoController],
  providers: [CatalogoService, CatalogoAccessService],
})
export class CatalogoModule {}
