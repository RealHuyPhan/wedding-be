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

  @ApiOperation({ summary: 'View cart', description: 'Get shopping cart for the logged-in user' })
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getMyCart(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.cartService.getMyCart(userId);
  }

  @ApiOperation({ summary: 'Add to cart', description: 'Add product or increase quantity if already exists in cart' })
  @UseGuards(AuthGuard('jwt'))
  @Post('items')
  addToCart(@Request() req: RequestWithUser, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user.sub;
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @ApiOperation({ summary: 'Update quantity', description: 'Change quantity of a product in the cart' })
  @UseGuards(AuthGuard('jwt'))
  @Patch('items/:itemId')
  updateItemQuantity(@Request() req: RequestWithUser, @Param('itemId') itemId: string, @Body() updateCartItemDto: UpdateCartItemDto) {
    const userId = req.user.sub;
    return this.cartService.updateItemQuantity(userId, itemId, updateCartItemDto.quantity);
  }

  @ApiOperation({ summary: 'Remove item', description: 'Completely remove a product from the cart' })
  @UseGuards(AuthGuard('jwt'))
  @Delete('items/:itemId')
  removeItem(@Request() req: RequestWithUser, @Param('itemId') itemId: string) {
    const userId = req.user.sub;
    return this.cartService.removeItem(userId, itemId);
  }

  @ApiOperation({ summary: 'Clear cart', description: 'Remove all products from the cart' })
  @UseGuards(AuthGuard('jwt'))
  @Delete()
  clearCart(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.cartService.clearCart(userId);
  }

  // --------------------------------------------------------------------------
  // ADMIN API (Marketing / Abandoned Carts)
  // --------------------------------------------------------------------------

  @ApiOperation({ summary: '[Admin] Get all carts', description: 'Monitor abandoned carts (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  getAllCartsForAdmin(@Query() pageOptionsDto: PageOptionsDto) {
    return this.cartService.getAllCartsForAdmin(pageOptionsDto);
  }

  @ApiOperation({ summary: '[Admin] Get cart details', description: 'View cart details of any user (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/:cartId')
  getCartDetailsForAdmin(@Param('cartId') cartId: string) {
    return this.cartService.getCartDetailsForAdmin(cartId);
  }
}
