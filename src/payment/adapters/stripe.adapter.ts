import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { Order } from '../../order/entities/order.entity';
import { OrderItem } from '../../order/entities/order-item.entity';

@Injectable()
export class StripeAdapter implements IPaymentGateway {
  private readonly stripe: Stripe;
  private readonly frontendUrl: string;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') ?? '',
    );
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
  }

  async createPaymentSession(order: Order, items: OrderItem[]): Promise<string> {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => ({
      price_data: {
        currency: 'cad',
        product_data: {
          name: item.product?.product ?? 'Wedding Product',
          images: item.product?.image ? [item.product.image] : [],
        },
        unit_amount: Math.round(Number(item.price) * 100), // Đơn vị Cent
      },
      quantity: item.quantity,
    }));

    // Thêm phí ship như một line item riêng
    if (Number(order.shippingFee) > 0) {
      lineItems.push({
        price_data: {
          currency: 'cad',
          product_data: {
            name: 'Shipping Fee',
          },
          unit_amount: Math.round(Number(order.shippingFee) * 100),
        },
        quantity: 1,
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${this.frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/orders/${order.id}`,
      metadata: {
        orderId: order.id,
      },
      customer_email: order.user?.email,
    });

    return session.url ?? '';
  }
}
