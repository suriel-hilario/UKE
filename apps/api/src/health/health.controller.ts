import { Controller, Get } from '@nestjs/common'
import { Public } from '../auth/public.decorator'

@Controller('health')
export class HealthController {
  @Get()
  @Public()
  health(): any {
    return { status: 'ok' }
  }
}
