import { Controller, Get, Post, Body, Param, Delete, Query, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { DigitalProductService } from './digital-product.service';
import { CreateDigitalProductDto } from './dto/create-digital-product.dto';
import { UpdateDigitalProductDto } from './dto/update-digital-product.dto';
import { PageOptionsDto } from '../common/dto/page-options.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Digital Products')
@Controller('digital-product')
export class DigitalProductController {
  constructor(private readonly digitalProductService: DigitalProductService) { }

  @ApiOperation({ summary: '[Admin] Create digital product', description: 'Add a new digital wedding invitation (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() createProductDto: CreateDigitalProductDto) {
    return this.digitalProductService.create(createProductDto);
  }

  @ApiOperation({ summary: 'Get digital products list', description: 'Supports pagination, category filter, and search (Public)' })
  @Get()
  findAll(@Query() pageOptionsDto: PageOptionsDto) {
    return this.digitalProductService.findAll(pageOptionsDto);
  }

  @ApiOperation({ summary: 'Get Best Sellers', description: 'Get top best-selling digital products (Public)' })
  @Get('best-sellers')
  findBestSeller() {
    return this.digitalProductService.findBestSeller();
  }

  @ApiOperation({ summary: 'Get digital product details', description: 'Get digital product information by ID (Public)' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.digitalProductService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Update digital product', description: 'Update digital product info, price, categories (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProductDto: UpdateDigitalProductDto) {
    return this.digitalProductService.update(id, updateProductDto);
  }

  @ApiOperation({ summary: '[Admin] Delete digital product', description: 'Permanently delete a digital product (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.digitalProductService.remove(id);
  }
}
