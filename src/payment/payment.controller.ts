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
import { Order, OrderStatus } from '../order/entities/order.entity';

@ApiExcludeController()
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
        order.status = OrderStatus.PROCESSING;
        await this.orderRepository.save(order);
        this.logger.log(`Order ${orderId} status updated to PROCESSING`);
      } else {
        this.logger.warn(`Order ${orderId} not found in database`);
      }
    }

    return { received: true };
  }
}
