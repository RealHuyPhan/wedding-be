import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';

import { GetRatesDto } from './dto/get-rates.dto';

@ApiTags('shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) { }

  @Get('rates')
  @ApiOperation({ summary: 'Get live shipping rates' })
  getRates(
    @Query() query: GetRatesDto,
  ): Promise<{ rates: Array<{ serviceName: string, serviceCode: string, price: number, transitDays?: number }> }> {
    return this.shippingService.getRates(query.countryCode, query.postcode, query.totalCards);
  }
}
