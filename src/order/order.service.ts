import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Repository, DataSource } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Cart } from '../cart/entities/cart.entity';
import { ShippingDestination } from '../shipping/entities/shipping.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private dataSource: DataSource
  ) { }

  async checkout(userId: string, createOrderDto: CreateOrderDto) {
    const { shippingName, shippingPhone, shippingAddress, shippingDestinationId, orderNotes, paymentMethod } = createOrderDto;

    // Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

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
        throw new BadRequestException('Giỏ hàng trống');
      }

      // 2. Tính tổng tiền (Sử dụng đơn vị Cent để tránh lỗi sai số thập phân của Javascript khi tính tiền CAD)
      let totalCents = 0;
      for (const item of cart.items) {
        const product = item.product;
        if (!product) {
          throw new NotFoundException('Sản phẩm không tồn tại');
        }

        // Đổi giá thành số nguyên (Cent) bằng cách nhân 100 và làm tròn
        const priceInCents = Math.round(Number(product.price || 0) * 100);
        totalCents += priceInCents * item.quantity;
      }

      // 2.5 Lấy thông tin Shipping Destination
      const shippingDest = await queryRunner.manager.findOne(ShippingDestination, {
        where: { id: shippingDestinationId, isActive: true }
      });

      if (!shippingDest) {
        throw new BadRequestException('Khu vực giao hàng không hợp lệ hoặc không còn hỗ trợ');
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
        shippingCountry: shippingDest.country,
        shippingProvince: shippingDest.province,
        orderNotes,
        paymentMethod,
        subTotal,
        shippingFee,
        totalAmount,
        status: OrderStatus.PENDING_PAYMENT,
      });

      const savedOrder = await queryRunner.manager.save(newOrder);

      // 4. Tạo OrderItems
      const orderItems = cart.items.map(item => {
        return queryRunner.manager.create(OrderItem, {
          order: savedOrder,
          product: item.product,
          quantity: item.quantity,
          price: item.product.price, // Snapshot giá hiện tại
        });
      });

      await queryRunner.manager.save(orderItems);

      // 5. Xóa CartItems
      await queryRunner.manager.remove(cart.items);

      // Commit transaction
      await queryRunner.commitTransaction();

      return savedOrder;
    } catch (err) {
      // Nếu có lỗi, rollback toàn bộ
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
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
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Nếu có truyền user vào (từ Controller), kiểm tra quyền sở hữu
    if (currentUser) {
      if (currentUser.role !== 'admin' && order.user.id !== currentUser.id) {
        throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
      }
    }

    return order;
  }
}
