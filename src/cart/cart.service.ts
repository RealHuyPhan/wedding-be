import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { ProductService } from 'src/product/product.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { paginate } from 'src/common/utils/pagination.util';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    private productService: ProductService,
  ) { }

  // --------------------------------------------------------------------------
  // USER METHODS
  // --------------------------------------------------------------------------

  private async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { user: { id: userId } },
      relations: {
        items: {
          product: true,
        },
      },
    });

    if (!cart) {
      cart = this.cartRepository.create({
        user: { id: userId },
      });
      await this.cartRepository.save(cart);
      cart.items = [];
    }

    return cart;
  }

  async getMyCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    // Tính tổng tiền (subTotal)
    const subTotal = cart.items.reduce((total, item) => {
      // Dùng giá hiện tại của Product (hoặc item.priceAtAdded nếu có lưu)
      const price = Number(item.product.price) || 0;
      return total + price * item.quantity;
    }, 0);

    // Lấy sản phẩm gợi ý (Best Sellers)
    const bestSellersResult = await this.productService.findBestSeller();
    const suggestedProducts = bestSellersResult.data || [];

    return {
      data: {
        ...cart,
        subTotal,
      },
      suggestedProducts,
    };
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.productService.findOne(addToCartDto.productId);

    // Kiểm tra xem món đồ đã có trong giỏ chưa
    const existingItem = cart.items.find((item) => item.product.id === addToCartDto.productId);

    if (existingItem) {
      existingItem.quantity += addToCartDto.quantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      const newItem = this.cartItemRepository.create({
        cart: { id: cart.id },
        product: { id: product.id },
        quantity: addToCartDto.quantity,
        priceAtAdded: product.price,
      });
      await this.cartItemRepository.save(newItem);
    }

    return { message: 'Item added to cart successfully' };
  }

  async updateItemQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);

    // Đảm bảo item này thuộc về giỏ hàng của user hiện tại (bảo mật)
    const item = cart.items.find((i) => i.id === itemId);
    if (!item) {
      throw new NotFoundException('Item not found in your cart');
    }

    if (quantity === 0) {
      await this.cartItemRepository.remove(item);
      return { message: 'Item removed from cart' };
    }

    item.quantity = quantity;
    await this.cartItemRepository.save(item);

    return { message: 'Cart item updated' };
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.find((i) => i.id === itemId);

    if (!item) {
      throw new NotFoundException('Item not found in your cart');
    }

    await this.cartItemRepository.remove(item);
    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    if (cart.items.length > 0) {
      await this.cartItemRepository.remove(cart.items);
    }
    return { message: 'Cart cleared successfully' };
  }

  // --------------------------------------------------------------------------
  // ADMIN METHODS (Marketing)
  // --------------------------------------------------------------------------

  async getAllCartsForAdmin(pageOptionsDto: PageOptionsDto) {
    const { page = 0, size = 10 } = pageOptionsDto;

    // Lấy những giỏ hàng có ít nhất 1 item bên trong (đang bị bỏ quên)
    const queryBuilder = this.cartRepository.createQueryBuilder('cart')
      .innerJoin('cart.items', 'items') // Chỉ lấy nếu có JOIN thành công với items
      .leftJoinAndSelect('cart.items', 'cartItems')
      .leftJoinAndSelect('cartItems.product', 'product')
      .leftJoinAndSelect('cart.user', 'user');

    return paginate(queryBuilder, page, size);
  }

  async getCartDetailsForAdmin(cartId: string) {
    const cart = await this.cartRepository.findOne({
      where: { id: cartId },
      relations: {
        items: {
          product: true,
        },
        user: true,
      },
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    const subTotal = cart.items.reduce((total, item) => {
      const price = Number(item.product.price) || 0;
      return total + price * item.quantity;
    }, 0);

    return {
      ...cart,
      subTotal,
    };
  }
}
