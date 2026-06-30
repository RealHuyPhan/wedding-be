import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { AuthGuard } from '@nestjs/passport';
import { PageOptionsDto } from 'src/common/dto/page-options.dto';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

interface RequestWithUser {
  user: {
    sub: string;
  };
}

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) { }

  // --------------------------------------------------------------------------
  // USER API (My Cart)
  // --------------------------------------------------------------------------

  @UseGuards(AuthGuard('jwt'))
  @Get()
  getMyCart(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.cartService.getMyCart(userId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('items')
  addToCart(@Request() req: RequestWithUser, @Body() addToCartDto: AddToCartDto) {
    const userId = req.user.sub;
    return this.cartService.addToCart(userId, addToCartDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch('items/:itemId')
  updateItemQuantity(@Request() req: RequestWithUser, @Param('itemId') itemId: string, @Body() updateCartItemDto: UpdateCartItemDto) {
    const userId = req.user.sub;
    return this.cartService.updateItemQuantity(userId, itemId, updateCartItemDto.quantity);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete('items/:itemId')
  removeItem(@Request() req: RequestWithUser, @Param('itemId') itemId: string) {
    const userId = req.user.sub;
    return this.cartService.removeItem(userId, itemId);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete()
  clearCart(@Request() req: RequestWithUser) {
    const userId = req.user.sub;
    return this.cartService.clearCart(userId);
  }

  // --------------------------------------------------------------------------
  // ADMIN API (Marketing / Abandoned Carts)
  // --------------------------------------------------------------------------

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  getAllCartsForAdmin(@Query() pageOptionsDto: PageOptionsDto) {
    return this.cartService.getAllCartsForAdmin(pageOptionsDto);
  }

  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get('admin/:cartId')
  getCartDetailsForAdmin(@Param('cartId') cartId: string) {
    return this.cartService.getCartDetailsForAdmin(cartId);
  }
}
