import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Cho phép mọi domain FE gọi API
  await app.listen(3000);
}
bootstrap();
