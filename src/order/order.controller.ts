import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

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

  @ApiOperation({ summary: 'Get my orders', description: 'Get order history of the logged-in user' })
  @UseGuards(AuthGuard('jwt'))
  @Get('my-orders') // Bỏ :userId ra khỏi URL
  findAllByUser(@Request() req: { user: { id: string } }) {
    const userId = req.user.id; // Lấy ID an toàn từ Token
    return this.orderService.findAllByUser(userId);
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
}
