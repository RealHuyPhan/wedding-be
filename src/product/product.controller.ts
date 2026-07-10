import { Controller, Get, Post, Body, Param, Delete, Query, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Products')
@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @ApiOperation({ summary: '[Admin] Tạo sản phẩm', description: 'Thêm sản phẩm mới (Chỉ Admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productService.create(createProductDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách sản phẩm', description: 'Có hỗ trợ phân trang và tìm kiếm theo tên (Public)' })
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.productService.findAll(pageOptionsDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách Best Sellers', description: 'Lấy 4 sản phẩm bán chạy nhất hiện thị trên trang chủ (Public)' })
  @Get('best-sellers')
  findBestSeller() {
    return this.productService.findBestSeller();
  }

  @ApiOperation({ summary: 'Lấy chi tiết sản phẩm', description: 'Lấy thông tin sản phẩm bằng giá trị value (slug) (Public)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Cập nhật sản phẩm', description: 'Cập nhật thông tin, giá, danh mục sản phẩm (Chỉ Admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productService.update(id, updateProductDto);
  }

  @ApiOperation({ summary: '[Admin] Xóa sản phẩm', description: 'Xóa vĩnh viễn sản phẩm khỏi hệ thống (Chỉ Admin)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productService.remove(id);
  }
}
