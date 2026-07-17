import { Order } from '../../order/entities/order.entity';
import { OrderItem } from '../../order/entities/order-item.entity';

export interface IPaymentGateway {
  createPaymentSession(order: Order, items: OrderItem[]): Promise<string>;
  verifySession?(sessionId: string): Promise<{ isPaid: boolean; orderId?: string }>;
}
