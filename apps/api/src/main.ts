import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { loadAuthConfig } from './config/auth.config'
import { loadManagementConfig } from './config/management.config'
import { loadStorageConfig } from './config/storage.config'

async function bootstrap() {
  loadAuthConfig()
  loadManagementConfig()
  loadStorageConfig()
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') ?? 'http://localhost:3000' })
  await app.listen(3001, '0.0.0.0')
  console.log(`API server running at http://localhost:3001`)
}

bootstrap()
