import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CategoryModule } from './category/category.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { ShippingModule } from './shipping/shipping.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Rate Limiting: Chặn Brute Force & DDoS
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,       // 1 giây
        limit: 10,       // Tối đa 10 requests / giây
      },
      {
        name: 'long',
        ttl: 60000,      // 1 phút
        limit: 200,      // Tối đa 200 requests / phút
      },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        return {
          type: 'postgres',
          url: configService.get<string>('DATABASE_URL'),
          autoLoadEntities: true,
          synchronize: configService.get<string>('NODE_ENV') !== 'production',
          logging: configService.get<string>('NODE_ENV') !== 'production',
          ssl: {
            rejectUnauthorized: false,
          },
        };
      },
    }),
    UserModule,
    AuthModule,
    CategoryModule,
    ProductModule,
    CartModule,
    OrderModule,
    ShippingModule,
    PaymentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Rate Limiting global: Đăng ký đúng cách qua DI Container
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
