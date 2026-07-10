import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AuthGuard } from '@nestjs/passport';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

interface RequestWithUser {
  user: {
    sub: string;
  };
}

@ApiTags('Cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  // --------------------------------------------------------------------------
  // USER API (My Cart)
  // --------------------------------------------------------------------------

  @ApiOperation({ summary: 'Xem giỏ hàng', description: 'Lấy thông tin giỏ hàng của user đang đăng nhập' })
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getMyCart(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.cartService.getMyCart(userId);
  }

  @ApiOperation({ summary: 'Thêm vào giỏ hàng', description: 'Thêm sản phẩm hoặc tăng số lượng nếu đã có trong giỏ' })
  @UseGuards(AuthGuard('jwt'))
  @Post('items')
  addToCart(@Request() req: RequestWithUser, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user.sub;
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @ApiOperation({ summary: 'Cập nhật số lượng', description: 'Thay đổi số lượng của 1 sản phẩm trong giỏ hàng' })
  @UseGuards(AuthGuard('jwt'))
  @Patch('items/:itemId')
  updateItemQuantity(@Request() req: RequestWithUser, @Param('itemId') itemId: string, @Body() updateCartItemDto: UpdateCartItemDto) {
    const userId = req.user.sub;
    return this.cartService.updateItemQuantity(userId, itemId, updateCartItemDto.quantity);
  }

  @ApiOperation({ summary: 'Xóa 1 sản phẩm', description: 'Xóa hoàn toàn 1 sản phẩm khỏi giỏ hàng' })
  @UseGuards(AuthGuard('jwt'))
  @Delete('items/:itemId')
  removeItem(@Request() req: RequestWithUser, @Param('itemId') itemId: string) {
    const userId = req.user.sub;
    return this.cartService.removeItem(userId, itemId);
  }

  @ApiOperation({ summary: 'Xóa sạch giỏ hàng', description: 'Xóa toàn bộ sản phẩm trong giỏ' })
  @UseGuards(AuthGuard('jwt'))
  @Delete()
  clearCart(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.cartService.clearCart(userId);
  }

  // --------------------------------------------------------------------------
  // ADMIN API (Marketing / Abandoned Carts)
  // --------------------------------------------------------------------------

  @ApiOperation({ summary: '[Admin] Lấy toàn bộ giỏ hàng', description: 'Theo dõi giỏ hàng bị bỏ quên (Chỉ Admin)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  getAllCartsForAdmin(@Query() pageOptionsDto: PageOptionsDto) {
    return this.cartService.getAllCartsForAdmin(pageOptionsDto);
  }

  @ApiOperation({ summary: '[Admin] Lấy chi tiết giỏ hàng', description: 'Xem chi tiết giỏ hàng của bất kỳ ai (Chỉ Admin)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/:cartId')
  getCartDetailsForAdmin(@Param('cartId') cartId: string) {
    return this.cartService.getCartDetailsForAdmin(cartId);
  }
}
