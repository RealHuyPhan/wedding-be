import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Query, Delete } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateOrderAdminDto } from './dto/create-order-admin.dto';
import { UpdateOrderAdminDto } from './dto/update-order-admin.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderShippingDto } from './dto/update-order-shipping.dto';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @ApiOperation({ summary: 'Checkout', description: 'Create a new order from current cart' })
  @UseGuards(AuthGuard('jwt'))
  @Post('checkout')
  checkout(@Request() req: { user: { id: string } }, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.id; // Lấy ID an toàn từ Token
    return this.orderService.checkout(userId, createOrderDto);
  }

  @ApiOperation({ summary: 'Verify Payment Session', description: 'Verify Stripe checkout session and update order status if paid' })
  @UseGuards(AuthGuard('jwt'))
  @Get('verify-session')
  verifySession(@Query('session_id') sessionId: string, @Request() req: { user: { id: string } }) {
    return this.orderService.verifySession(sessionId, req.user.id);
  }

  @ApiOperation({ summary: 'Get my orders', description: 'Get order history of the logged-in user' })
  @UseGuards(AuthGuard('jwt'))
  @Get('my-orders')
  findAllByUser(@Request() req: { user: { id: string } }) {
    return this.orderService.findAllByUser(req.user.id);
  }

  @ApiOperation({ summary: '[Admin] Get all orders', description: 'Get all orders in the system (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAllForAdmin(@Query() pageOptionsDto: PageOptionsDto) {
    return this.orderService.findAllForAdmin(pageOptionsDto);
  }

  @ApiOperation({ summary: 'Get order details', description: 'Get specific order info (Owner or Admin only)' })
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: { id: string, role: string } }) {
    return this.orderService.findOne(id, req.user);
  }

  @ApiOperation({ summary: '[Admin] Update order status', description: 'Update status of an order (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, updateOrderStatusDto.status);
  }

  @ApiOperation({ summary: '[Admin] Create new order manually', description: 'Create order manually by admin' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post('admin')
  createByAdmin(@Body() createOrderAdminDto: CreateOrderAdminDto) {
    return this.orderService.createByAdmin(createOrderAdminDto);
  }

  @ApiOperation({ summary: '[Admin] Update order details', description: 'Update order shipping info and status (Admin only)' })
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch('admin/:id')
  updateByAdmin(@Param('id') id: string, @Body() updateOrderAdminDto: UpdateOrderAdminDto) {
    return this.orderService.updateByAdmin(id, updateOrderAdminDto);
  }

  @ApiOperation({ summary: 'Update order shipping info', description: 'Update order shipping info by user if status is processing' })
  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/shipping')
  updateShippingInfo(
    @Param('id') id: string, 
    @Request() req: { user: { id: string } }, 
    @Body() updateOrderShippingDto: UpdateOrderShippingDto
  ) {
    return this.orderService.updateShippingInfo(id, req.user.id, updateOrderShippingDto);
  }

  @ApiOperation({ summary: 'Delete order', description: 'Delete a pending order (User) or any order (Admin)' })
  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: { id: string, role: string } }) {
    return this.orderService.remove(id, req.user);
  }
}
