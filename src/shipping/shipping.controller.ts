import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { UpdateShippingDto } from './dto/update-shipping.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ShippoService } from './shippo.service';
import { CartService } from '../cart/cart.service';
import { GetRatesDto } from './dto/get-rates.dto';

@ApiTags('Shipping Config')
@Controller('shipping')
export class ShippingController {
  constructor(
    private readonly shippingService: ShippingService,
    private readonly shippoService: ShippoService,
    private readonly cartService: CartService,
  ) { }

  @ApiOperation({ summary: 'Get dynamic shipping rates', description: 'Fetch shipping rates from Shippo based on cart and destination' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('rates')
  async getRates(@Req() req: { user: { id: string } }, @Body() getRatesDto: GetRatesDto) {
    const cartData = await this.cartService.getMyCart(req.user.id);
    const cart = cartData.data;

    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Calculate total weight
    // Each set is ~30g (0.03kg). Plus packaging.
    const totalSets = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const itemsWeight = totalSets * 0.03;
    let packagingWeight = 0;

    if (totalSets < 50) {
      packagingWeight = 0.15;
    } else if (totalSets <= 150) {
      packagingWeight = 0.30;
    } else {
      packagingWeight = 0.50;
    }

    const totalWeightKg = itemsWeight + packagingWeight;

    // Shippo destination object
    const addressTo = {
      city: getRatesDto.city,
      state: getRatesDto.province,
      zip: getRatesDto.postcode,
      country: getRatesDto.country,
    };

    const rates = await this.shippoService.getRates(addressTo, totalWeightKg);
    return {
      statusCode: 200,
      message: 'Rates fetched successfully',
      data: rates,
    };
  }

  @ApiOperation({ summary: '[Admin] Create shipping config', description: 'Create a new shipping destination (Whitelist) (Admin only)' })
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @Post()
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

  @ApiOperation({ summary: '[Admin] Update shipping config', description: 'Change shipping state or disable a destination (Admin only)' })
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

