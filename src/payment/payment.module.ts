import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { StripeAdapter } from './adapters/stripe.adapter';
import { Order } from '../order/entities/order.entity';
import { EmailModule } from 'src/email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order]), EmailModule],
  controllers: [PaymentController],
  providers: [PaymentService, StripeAdapter],
  exports: [PaymentService],
})
export class PaymentModule { }
