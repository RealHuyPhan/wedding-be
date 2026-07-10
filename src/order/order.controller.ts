import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @ApiOperation({ summary: 'Đặt hàng (Checkout)', description: 'Tạo đơn hàng mới từ giỏ hàng hiện tại của người dùng' })
  @UseGuards(AuthGuard('jwt'))
  @Post('checkout')
  checkout(@Request() req: { user: { id: string } }, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user.id; // Lấy ID an toàn từ Token
    return this.orderService.checkout(userId, createOrderDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách đơn hàng của tôi', description: 'Lấy toàn bộ lịch sử đơn hàng của người dùng đang đăng nhập' })
  @UseGuards(AuthGuard('jwt'))
  @Get('my-orders') // Bỏ :userId ra khỏi URL
  findAllByUser(@Request() req: { user: { id: string } }) {
    const userId = req.user.id; // Lấy ID an toàn từ Token
    return this.orderService.findAllByUser(userId);
  }

  @ApiOperation({ summary: 'Lấy chi tiết 1 đơn hàng', description: 'Lấy thông tin chi tiết đơn hàng (Chỉ người tạo hoặc Admin mới xem được)' })
  @UseGuards(AuthGuard('jwt'))
  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: { id: string, role: string } }) {
    return this.orderService.findOne(id, req.user);
  }
}
