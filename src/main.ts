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

  // CORS & Security Headers
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Bảo mật Headers: Cho phép Frontend nhúng iframe xem preview HTML và cho phép chạy script/audio mẫu thiệp
  app.use(
    helmet({
      frameguard: false, // Bỏ X-Frame-Options: SAMEORIGIN để frontend nhúng được iframe preview
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https:', 'http:'],
          fontSrc: ["'self'", 'https:', 'data:', 'http:'],
          imgSrc: ["'self'", 'data:', 'https:', 'http:'],
          mediaSrc: ["'self'", 'https:', 'http:', 'data:', 'blob:'],
          frameAncestors: ["'self'", frontendUrl, 'http://localhost:3000'],
        },
      },
    }),
  );

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

  // CORS: Sử dụng frontendUrl đã khai báo
  app.enableCors({
    origin: frontendUrl,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
