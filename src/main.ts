import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  // rawBody: true — Bắt buộc để Stripe verify chữ ký webhook
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix('api');
  app.use(cookieParser());

  // Bảo mật Headers: Chặn XSS, Clickjacking, và các tấn công phổ biến
  app.use(helmet());

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  // Rate Limiting được đăng ký trong AppModule (app.module.ts) qua APP_GUARD

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Wedding API')
    .setDescription('API documentation for the Wedding system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // CORS: Lấy từ biến môi trường để linh hoạt khi deploy
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
