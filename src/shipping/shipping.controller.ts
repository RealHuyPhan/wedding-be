import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Shipping Config')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @ApiOperation({ summary: '[Admin] Tạo cấu hình phí giao hàng', description: 'Tạo một khu vực giao hàng mới kèm giá cước (Chỉ Admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createShippingDto: CreateShippingDto) {
    return this.shippingService.create(createShippingDto);
  }

  @ApiOperation({ summary: '[Admin] Lấy danh sách toàn bộ cấu hình ship', description: 'Lấy tất cả khu vực giao hàng kể cả đã vô hiệu hóa (Chỉ Admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Get()
  findAll() {
    return this.shippingService.findAll();
  }

  @ApiOperation({ summary: 'Lấy danh sách khu vực giao hàng (Public)', description: 'Dùng cho Frontend hiển thị ở form Checkout (Chỉ hiện các vùng isActive = true)' })
  @Get('active')
  findActive() {
    return this.shippingService.findActive();
  }

  @ApiOperation({ summary: 'Lấy chi tiết 1 khu vực giao hàng', description: 'Truy xuất thông tin 1 vùng giao hàng bằng ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shippingService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Cập nhật phí giao hàng', description: 'Đổi giá tiền hoặc vô hiệu hóa khu vực giao hàng (Chỉ Admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShippingDto: UpdateShippingDto) {
    return this.shippingService.update(id, updateShippingDto);
  }

  @ApiOperation({ summary: '[Admin] Xóa khu vực giao hàng', description: 'Xóa vĩnh viễn khu vực giao hàng (Chỉ Admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shippingService.remove(id);
  }
}
