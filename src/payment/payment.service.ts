import { Injectable } from '@nestjs/common';
import { StripeAdapter } from './adapters/stripe.adapter';
import { Order } from '../order/entities/order.entity';
import { OrderItem } from '../order/entities/order-item.entity';

@Injectable()
export class PaymentService {
  constructor(private readonly stripeAdapter: StripeAdapter) {}

  /**
   * Factory method: Hiện tại routing sang Stripe.
   * Sau này nếu cần thêm Momo/VNPay, kiểm tra order.paymentMethod
   * rồi điều phối sang adapter tương ứng.
   */
  async createPaymentSession(order: Order, items: OrderItem[]): Promise<string> {
    return this.stripeAdapter.createPaymentSession(order, items);
  }
}
