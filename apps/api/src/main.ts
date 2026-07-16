import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  await app.listen(3001, '0.0.0.0')
  console.log(`API server running at http://localhost:3001`)
}

bootstrap()
