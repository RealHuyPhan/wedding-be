import {
  Controller,
  Post,
  Param,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import type { RawBodyRequest } from '@nestjs/common';
import { Request } from 'express';
import Stripe from 'stripe';
import { ApiExcludeController } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Order, OrderStatus, PaymentMethod } from '../order/entities/order.entity';
import { EmailService } from 'src/email/email.service';

@ApiExcludeController()
@SkipThrottle() // Webhook từ Stripe không bị giới hạn rate limit
@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private dataSource: DataSource,
    private readonly emailService: EmailService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') ?? '',
    );
    this.webhookSecret =
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
  }

  @Post('webhook/:gateway')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('gateway') gateway: string,
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (gateway !== 'stripe') {
      throw new BadRequestException(`Unsupported gateway: ${gateway}`);
    }

    if (!req.rawBody) {
      throw new BadRequestException('No raw body found');
    }

    let event: Stripe.Event;

    try {
      // Stripe dùng rawBody Buffer để verify chữ ký
      event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${String(err)}`);
      throw new BadRequestException('Webhook signature verification failed');
    }

    // Xử lý event thanh toán thành công
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        this.logger.warn('Webhook received but no orderId in metadata');
        return { received: true };
      }

      const order = await this.orderRepository.findOne({ where: { id: orderId }, relations: { user: true } });

      if (order) {
        // --- FRAUD DETECTION LOGIC ---
        try {
          if (order.paymentMethod === PaymentMethod.DEBIT_CARD && session.payment_intent) {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(session.payment_intent as string, { expand: ['payment_method'] });
            const paymentMethodData = paymentIntent.payment_method as Stripe.PaymentMethod;
            const fundingType = paymentMethodData?.card?.funding;
            
            if (fundingType === 'credit') {
              this.logger.warn(`Fraud detected for order ${orderId}: Used Credit Card for Debit Card payment method.`);
              
              // Hoàn tiền
              await this.stripe.refunds.create({
                payment_intent: paymentIntent.id,
                reason: 'fraudulent',
              });
              
              // Hủy đơn
              order.status = OrderStatus.CANCELLED;
              await this.orderRepository.save(order);
              
              const orderWithItems = await this.orderRepository.findOne({
                where: { id: orderId },
                relations: { user: true, items: { product: true } },
              });
              if (orderWithItems) {
                // Gửi email báo hủy đơn
                void this.emailService.sendFraudCancellationEmail(orderWithItems);
              }
              return { received: true, status: 'cancelled_due_to_fraud' };
            }
          }
        } catch (fraudErr) {
          this.logger.error(`Error during fraud check for order ${orderId}: ${String(fraudErr)}`);
          // Tiếp tục xử lý nếu lỗi API Stripe để không làm kẹt đơn hàng
        }
        // --- END FRAUD DETECTION LOGIC ---

        if (order.status === OrderStatus.PENDING_PAYMENT) {
          order.status = OrderStatus.PROCESSING;
          await this.orderRepository.save(order);
          this.logger.log(`Order ${orderId} status updated to PROCESSING`);
          const orderWithItems = await this.orderRepository.findOne({
            where: { id: orderId },
            relations: { user: true, items: { product: true } },
          });
          if (orderWithItems) {
            // Gửi song song, không await để không block webhook response
            void this.emailService.sendOrderConfirmation(orderWithItems);
            void this.emailService.sendNewOrderAlert(orderWithItems);
          }
        } else {
          this.logger.log(`Order ${orderId} is already processed or cancelled. Ignoring webhook status update.`);
        }
      } else {
        this.logger.warn(`Order ${orderId} not found in database`);
      }
    }

    return { received: true };
  }
}
