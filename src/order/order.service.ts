import { BadRequestException, ForbiddenException, Injectable, NotFoundException, HttpStatus } from '@nestjs/common';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { paginate } from '../common/utils/pagination.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAdminDto } from './dto/create-order-admin.dto';
import { UpdateOrderAdminDto } from './dto/update-order-admin.dto';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus, PaymentMethod } from './entities/order.entity';
import { Repository, DataSource, IsNull, FindOptionsWhere } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { Product } from '../product/entities/product.entity';
import { User } from '../user/entities/user.entity';
import { ShippingDestination } from '../shipping/entities/shipping.entity';
import { PaymentService } from '../payment/payment.service';
import { EmailService } from 'src/email/email.service';

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
  ) { }

  async checkout(userId: string, createOrderDto: CreateOrderDto) {
    const { shippingName, shippingPhone, shippingAddress, shippingCountry, shippingProvince, shippingCity, shippingPostcode, shippingUnit, paymentMethod } = createOrderDto;

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

      // 2. Tính tổng tiền (Sử dụng đơn vị Cent để tránh lỗi sai số thập phân của Javascript khi tính tiền CAD)
      let totalCents = 0;
      for (const item of cart.items) {
        const product = item.product;
        if (!product) {
          throw new NotFoundException('Product not found');
        }

        // Đổi giá thành số nguyên (Cent) bằng cách nhân 100 và làm tròn
        const priceInCents = Math.round(Number(product.price || 0) * 100);
        totalCents += priceInCents * item.quantity;
      }

      // 2.5 Lấy thông tin Shipping Destination
      const whereCondition: FindOptionsWhere<ShippingDestination> = { country: shippingCountry };
      if (shippingProvince) {
        whereCondition.province = shippingProvince;
      } else {
        whereCondition.province = IsNull();
      }

      const shippingDest = await queryRunner.manager.findOne(ShippingDestination, {
        where: whereCondition
      });

      if (!shippingDest) {
        throw new BadRequestException('Invalid or unsupported shipping destination');
      }

      // Đưa phí ship về dạng Cent để cộng cho an toàn
      const shippingFeeCents = Math.round(Number(shippingDest.shippingFee || 0) * 100);
      const totalAmountCents = totalCents + shippingFeeCents;

      // Trả lại định dạng CAD chuẩn
      const subTotal = totalCents / 100;
      const shippingFee = shippingFeeCents / 100;
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

    // Update status if paid and currently pending
    if (verification.isPaid && order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.PROCESSING;
      await this.orderRepository.save(order);
      void this.emailService.sendStatusUpdate(order, OrderStatus.PROCESSING);
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
      const totalAmountCents = totalCents + shippingFeeCents;

      const newOrder = queryRunner.manager.create(Order, {
        ...shippingInfo,
        subTotal: totalCents / 100,
        shippingFee: shippingFeeCents / 100,
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
}
