import { BadRequestException, ForbiddenException, Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { paginate } from '../common/utils/pagination.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAdminDto } from './dto/create-order-admin.dto';
import { UpdateOrderAdminDto } from './dto/update-order-admin.dto';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus, PaymentMethod } from './entities/order.entity';
import { Repository, DataSource } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { Country } from '../country/entities/country.entity';
import { State } from '../state/entities/state.entity';
import { PaymentService } from '../payment/payment.service';
import { EmailService } from 'src/email/email.service';
import { ShippingService } from '../shipping/shipping.service';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private dataSource: DataSource,
    private paymentService: PaymentService,
    private emailService: EmailService,
    private shippingService: ShippingService,
  ) { }

  async checkout(userId: string, createOrderDto: CreateOrderDto) {
    const { shippingName, shippingPhone, shippingAddress, shippingCountry, shippingProvince, shippingCity, shippingPostcode, shippingUnit, paymentMethod, shippingServiceCode, shippingFeeCAD } = createOrderDto;

    if (paymentMethod === PaymentMethod.VIA_SOCIAL_MEDIA) {
      throw new BadRequestException('This payment method is not available for online checkout.');
    }

    // Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // Khai báo ngoài try để dùng được sau khi transaction kết thúc (cho Stripe)
    let savedOrder!: Order;
    let orderItems!: OrderItem[];

    try {
      // 1. Lấy Cart của User kèm theo các Items
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { user: { id: userId } },
        relations: {
          items: {
            product: true
          }
        }
      });

      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      // 2. Tính tổng tiền và tổng số lượng thiệp
      let totalCents = 0;
      let totalCards = 0;
      for (const item of cart.items) {
        const product = item.product;
        if (!product) {
          throw new NotFoundException('Product not found');
        }

        // Đổi giá thành số nguyên (Cent) bằng cách nhân 100 và làm tròn
        const priceInCents = Math.round(Number(product.price || 0) * 100);
        totalCents += priceInCents * item.quantity;
        totalCards += item.quantity;
      }

      // 2.5 Validate shipping destination against Country & State tables
      let normCountryCode = (shippingCountry || '').trim().toUpperCase();
      if (normCountryCode === 'CANADA') normCountryCode = 'CA';
      if (normCountryCode === 'UNITED STATES' || normCountryCode === 'USA') normCountryCode = 'US';

      const normStateCode = (shippingProvince || '').trim().toUpperCase();

      const country = await queryRunner.manager.findOne(Country, {
        where: [
          { code: normCountryCode },
          { code: shippingCountry }
        ]
      });

      if (!country && normCountryCode !== 'CA' && normCountryCode !== 'US') {
        throw new BadRequestException('Invalid or unsupported shipping country');
      }

      if (normStateCode) {
        const state = await queryRunner.manager.findOne(State, {
          where: [
            { code: normStateCode, countryCode: normCountryCode },
            { code: normStateCode, countryCode: shippingCountry }
          ]
        });

        if (!state) {
          console.warn(`State/Province ${shippingProvince} not found in DB for country ${shippingCountry}, proceeding with checkout.`);
        }
      }

      // 2.6 Lấy phí ship: ưu tiên dùng giá FE đã gửi, fallback mới gọi Canada Post
      let shippingFeeCents = 2000; // Mặc định 20 CAD dự phòng

      if (shippingFeeCAD !== undefined && shippingFeeCAD > 0) {
        // FE đã gửi đúng giá user chọn → dùng trực tiếp, không gọi lại API
        shippingFeeCents = Math.round(shippingFeeCAD * 100);
      } else {
        // Fallback: gọi Canada Post với timeout 8s
        try {
          type RateOption = {
            serviceCode: string;
            serviceName: string;
            price: number;
            transitDays?: number;
            expectedDeliveryDate?: string;
            guaranteedDelivery?: boolean;
            includedOptions?: string[];
          };

          const timeoutPromise = new Promise<{ rates: RateOption[] }>((_, reject) =>
            setTimeout(() => reject(new Error('Shipping rate fetch timeout')), 8000)
          );

          const ratesResult = await Promise.race([
            this.shippingService.getRates(normCountryCode, shippingPostcode, totalCards),
            timeoutPromise,
          ]);

          if (ratesResult && ratesResult.rates && ratesResult.rates.length > 0) {
            const ratesList = ratesResult.rates as RateOption[];
            const selectedRate = ratesList.find((r) => r.serviceCode === shippingServiceCode) || ratesList[0];
            shippingFeeCents = Math.round(Number(selectedRate.price || 20) * 100);
          }
        } catch (err) {
          console.error('Fast fallback for live shipping fee during checkout:', err);
          shippingFeeCents = 2000; // Fallback 20 CAD
        }
      }

      // Tính Service Fee theo vùng
      let serviceFeeCents = 0;
      const prov = shippingProvince?.toLowerCase() || '';

      const NO_FEE_REGIONS = ['qc', 'quebec', 'ct', 'connecticut', 'me', 'maine', 'ma', 'massachusetts', 'pr', 'puerto rico'];
      const TWO_PERCENT_REGIONS = ['co', 'colorado', 'ok', 'oklahoma'];

      if (paymentMethod === PaymentMethod.DEBIT_CARD || NO_FEE_REGIONS.includes(prov)) {
        serviceFeeCents = 0;
      } else if (TWO_PERCENT_REGIONS.includes(prov)) {
        serviceFeeCents = Math.round((totalCents + shippingFeeCents) * 0.020);
      } else {
        serviceFeeCents = Math.round((totalCents + shippingFeeCents) * 0.024);
      }

      const { taxFeeCents, taxName } = this.calculateCanadaTax(shippingCountry, prov, totalCents, shippingFeeCents, serviceFeeCents);


      // Tính Customs Fee (2% của tiền hàng) nếu ship đi Mỹ
      let customsFeeCents = 0;
      const isUS = shippingCountry && (shippingCountry.toLowerCase() === 'us' || shippingCountry.toLowerCase() === 'usa' || shippingCountry.toLowerCase() === 'united states');
      if (isUS) {
        customsFeeCents = Math.round(totalCents * 0.02);
      }

      const totalAmountCents = totalCents + shippingFeeCents + serviceFeeCents + taxFeeCents + customsFeeCents;

      // Trả lại định dạng CAD chuẩn
      const subTotal = totalCents / 100;
      const shippingFee = shippingFeeCents / 100;
      const serviceFee = serviceFeeCents / 100;
      const taxFee = taxFeeCents / 100;
      const customsFee = customsFeeCents / 100;
      const totalAmount = totalAmountCents / 100;

      // 3. Tạo Order
      const newOrder = queryRunner.manager.create(Order, {
        user: { id: userId },
        shippingName,
        shippingPhone,
        shippingAddress,
        shippingCountry,
        shippingProvince,
        shippingCity,
        shippingPostcode,
        shippingUnit,
        paymentMethod,
        subTotal,
        shippingFee,
        serviceFee,
        taxFee,
        taxName,
        customsFee,
        totalAmount,
        status: OrderStatus.PENDING_PAYMENT,
      });

      savedOrder = await queryRunner.manager.save(newOrder);

      // 4. Tạo OrderItems
      orderItems = cart.items.map(item => {
        return queryRunner.manager.create(OrderItem, {
          order: savedOrder,
          product: item.product,
          quantity: item.quantity,
          price: item.product.price,
        });
      });

      await queryRunner.manager.save(orderItems);

      // 5. Xoá sạch giỏ hàng ngay lập tức để tránh clone order nếu khách bấm Back
      if (cart.items && cart.items.length > 0) {
        await queryRunner.manager.remove(cart.items);
      }
      // Commit transaction
      await queryRunner.commitTransaction();

    } catch (err) {
      console.error('TRANSACTION ERROR:', err);
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // 6. Tạo Stripe Checkout Session (Sau khi transaction hoàn tất)
    try {
      const paymentUrl = await this.paymentService.createPaymentSession(
        savedOrder,
        orderItems,
      );

      // Save paymentUrl to the database for future retrieval (e.g., "Continue Payment")
      savedOrder.paymentUrl = paymentUrl;
      await this.orderRepository.save(savedOrder);

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Order created successfully',
        data: { orderId: savedOrder.id, paymentUrl },
      };
    } catch (stripeErr) {
      console.error('STRIPE ERROR:', stripeErr);
      const errorMessage = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      throw new BadRequestException(`Stripe Error: ${errorMessage}`);
    }
  }

  async findAllByUser(userId: string) {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      relations: {
        items: {
          product: true
        }
      },
      order: { createdAt: 'DESC' }
    });
  }

  async verifySession(sessionId: string, userId: string) {
    const verification = await this.paymentService.verifySession(sessionId);
    if (!verification.orderId) {
      throw new BadRequestException('Invalid or expired payment session');
    }

    const order = await this.orderRepository.findOne({
      where: { id: verification.orderId },
      relations: { user: true }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify ownership
    if (!order.user || order.user.id !== userId) {
      throw new ForbiddenException('You do not have permission to verify this order');
    }

    // Fallback: Update status if paid and currently pending.
    // This is crucial for Local Development where Stripe Webhooks cannot reach the server,
    // or if the webhook is delayed. The Webhook will check the status and skip duplicate emails.
    if (verification.isPaid && order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.PROCESSING;
      await this.orderRepository.save(order);

      const orderWithItems = await this.orderRepository.findOne({
        where: { id: order.id },
        relations: { user: true, items: { product: true } }
      });
      if (orderWithItems) {
        void this.emailService.sendOrderConfirmation(orderWithItems);
        void this.emailService.sendNewOrderAlert(orderWithItems);
      }
    }

    return {
      statusCode: HttpStatus.OK,
      message: 'Session verified',
      isPaid: verification.isPaid,
      orderId: order.id,
      status: order.status
    };
  }

  async findOne(id: string, currentUser?: { id: string, role: string }) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        items: {
          product: true
        },
        user: true
      }
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Nếu có truyền user vào (từ Controller), kiểm tra quyền sở hữu
    if (currentUser) {
      if (currentUser.role !== 'admin' && order.user.id !== currentUser.id) {
        throw new ForbiddenException('You do not have permission to view this order');
      }
    }

    // Backward compatibility: Tự động tạo paymentUrl cho các đơn cũ nếu chưa có
    if (order.status === OrderStatus.PENDING_PAYMENT && !order.paymentUrl) {
      try {
        const paymentUrl = await this.paymentService.createPaymentSession(order, order.items);
        order.paymentUrl = paymentUrl;
        await this.orderRepository.save(order);
      } catch (err) {
        console.error('Failed to generate paymentUrl for old order:', err);
      }
    }

    return order;
  }

  // ----------------------------------------------------------------------
  // CÁC HÀM DÀNH CHO ADMIN
  // ----------------------------------------------------------------------

  async findAllForAdmin(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10 } = pageOptionsDto;

    const queryBuilder = this.orderRepository.createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .orderBy('order.createdAt', 'DESC');

    // Chú ý: Ở đây ta gọi hàm paginate dùng chung
    return await paginate(queryBuilder, page, size);
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.orderRepository.findOne({ where: { id }, relations: { user: true } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }


    order.status = status;
    await this.orderRepository.save(order);

    void this.emailService.sendStatusUpdate(order, status);

    return { statusCode: HttpStatus.OK, message: 'Order status updated successfully' };
  }

  async createByAdmin(createOrderAdminDto: CreateOrderAdminDto) {
    const { email, items, shippingFee, status, ...shippingInfo } = createOrderAdminDto;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Tìm user theo email nếu có
      let user: User | null = null;
      if (email) {
        user = await queryRunner.manager.findOne(User, { where: { email } });
      }

      let totalCents = 0;
      const orderItemsToSave: { product: Product; quantity: number; price: number }[] = [];

      // Tính tiền từng sản phẩm
      for (const item of items) {
        const product = await queryRunner.manager.findOne(Product, { where: { id: item.productId } });
        if (!product) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }

        const priceInCents = Math.round(Number(product.price || 0) * 100);
        totalCents += priceInCents * item.quantity;

        orderItemsToSave.push({
          product: product,
          quantity: item.quantity,
          price: product.price,
        });
      }

      const shippingFeeCents = Math.round(Number(shippingFee || 0) * 100);

      // Logic tính phí tương tự cho Admin
      let serviceFeeCents = 0;
      const prov = shippingInfo.shippingProvince?.toLowerCase() || '';

      const NO_FEE_REGIONS = ['qc', 'quebec', 'ct', 'connecticut', 'me', 'maine', 'ma', 'massachusetts', 'pr', 'puerto rico'];
      const TWO_PERCENT_REGIONS = ['co', 'colorado', 'ok', 'oklahoma'];

      if (NO_FEE_REGIONS.includes(prov)) {
        serviceFeeCents = 0;
      } else if (TWO_PERCENT_REGIONS.includes(prov)) {
        serviceFeeCents = Math.round((totalCents + shippingFeeCents) * 0.020);
      } else {
        serviceFeeCents = Math.round((totalCents + shippingFeeCents) * 0.024);
      }

      const { taxFeeCents, taxName } = this.calculateCanadaTax(shippingInfo.shippingCountry, prov, totalCents, shippingFeeCents, serviceFeeCents);

      // Tính Customs Fee (2% của tiền hàng) nếu ship đi Mỹ
      let customsFeeCents = 0;
      const isUS = shippingInfo.shippingCountry && (shippingInfo.shippingCountry.toLowerCase() === 'us' || shippingInfo.shippingCountry.toLowerCase() === 'usa' || shippingInfo.shippingCountry.toLowerCase() === 'united states');
      if (isUS) {
        customsFeeCents = Math.round(totalCents * 0.02);
      }

      const totalAmountCents = totalCents + shippingFeeCents + serviceFeeCents + taxFeeCents + customsFeeCents;

      const newOrder = queryRunner.manager.create(Order, {
        ...shippingInfo,
        subTotal: totalCents / 100,
        shippingFee: shippingFeeCents / 100,
        serviceFee: serviceFeeCents / 100,
        taxFee: taxFeeCents / 100,
        taxName: taxName,
        customsFee: customsFeeCents / 100,
        totalAmount: totalAmountCents / 100,
        status: status,
        ...(user ? { user } : {}),
      });

      const savedOrder = await queryRunner.manager.save(newOrder);

      const orderItems = orderItemsToSave.map(oi => queryRunner.manager.create(OrderItem, {
        order: savedOrder,
        ...oi,
      }));

      await queryRunner.manager.save(orderItems);

      await queryRunner.commitTransaction();

      return {
        statusCode: HttpStatus.CREATED,
        message: 'Order created successfully by admin',
        data: { orderId: savedOrder.id },
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateByAdmin(id: string, updateOrderAdminDto: UpdateOrderAdminDto) {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    Object.assign(order, updateOrderAdminDto);
    await this.orderRepository.save(order);

    return { statusCode: HttpStatus.OK, message: 'Order updated successfully by admin' };
  }

  async updateShippingInfo(id: string, userId: string, updateOrderShippingDto: UpdateOrderShippingDto) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { user: true }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.user || order.user.id !== userId) {
      throw new ForbiddenException('You do not have permission to edit this order');
    }

    if (order.status !== OrderStatus.PROCESSING && order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('You can only update shipping information when the order is processing or pending payment');
    }

    Object.assign(order, updateOrderShippingDto);
    await this.orderRepository.save(order);

    return { statusCode: HttpStatus.OK, message: 'Shipping information updated successfully' };
  }

  async remove(id: string, currentUser?: { id: string, role: string }) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { user: true }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (currentUser && currentUser.role !== 'admin') {
      if (!order.user || order.user.id !== currentUser.id) {
        throw new ForbiddenException('You do not have permission to delete this order');
      }
      if (order.status !== OrderStatus.PENDING_PAYMENT) {
        throw new BadRequestException('You can only delete orders that are pending payment');
      }
    }

    await this.orderRepository.remove(order);
    return { statusCode: HttpStatus.OK, message: 'Order deleted successfully' };
  }

  private calculateCanadaTax(shippingCountry: string, province: string, totalCents: number, shippingFeeCents: number, serviceFeeCents: number) {
    let taxFeeCents = 0;
    let taxName: string | null = null;

    const isCanada = shippingCountry && (shippingCountry.toLowerCase() === 'canada' || shippingCountry.toLowerCase() === 'ca' || shippingCountry.toLowerCase() === 'can');
    if (isCanada) {
      let taxRate = 0;
      const prov = province.toLowerCase();
      if (['on', 'ontario'].includes(prov)) { taxRate = 0.13; taxName = 'HST (13%)'; }
      else if (['nb', 'new brunswick', 'nl', 'newfoundland and labrador', 'ns', 'nova scotia', 'pe', 'prince edward island'].includes(prov)) { taxRate = 0.15; taxName = 'HST (15%)'; }
      else if (['bc', 'british columbia'].includes(prov)) { taxRate = 0.12; taxName = 'GST + PST (12%)'; }
      else if (['mb', 'manitoba'].includes(prov)) { taxRate = 0.12; taxName = 'GST + RST (12%)'; }
      else if (['qc', 'quebec'].includes(prov)) { taxRate = 0.14975; taxName = 'GST + QST (14.975%)'; }
      else if (['sk', 'saskatchewan'].includes(prov)) { taxRate = 0.11; taxName = 'GST + PST (11%)'; }
      else if (['ab', 'alberta', 'nt', 'northwest territories', 'nu', 'nunavut', 'yt', 'yukon'].includes(prov)) { taxRate = 0.05; taxName = 'GST (5%)'; }

      taxFeeCents = Math.round((totalCents + shippingFeeCents + serviceFeeCents) * taxRate);
    }

    return { taxFeeCents, taxName };
  }
}
