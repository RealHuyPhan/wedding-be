import { Controller, Get, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
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
  constructor(private readonly shippingService: ShippingService) { }

  @ApiOperation({ summary: '[Admin] Create shipping config', description: 'Create a new shipping destination and fee (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  create(@Body() createShippingDto: CreateShippingDto) {
    return this.shippingService.create(createShippingDto);
  }

  @ApiOperation({ summary: 'Get all shipping configs', description: 'Get all shipping destinations' })
  @Get()
  findAll() {
    return this.shippingService.findAll();
  }


  @ApiOperation({ summary: 'Get shipping destination details', description: 'Get details of a specific shipping destination by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shippingService.findOne(id);
  }

  @ApiOperation({ summary: '[Admin] Update shipping config', description: 'Change shipping fee or disable a destination (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShippingDto: UpdateShippingDto) {
    return this.shippingService.update(id, updateShippingDto);
  }

  @ApiOperation({ summary: '[Admin] Delete shipping config', description: 'Permanently delete a shipping destination (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shippingService.remove(id);
  }
}
