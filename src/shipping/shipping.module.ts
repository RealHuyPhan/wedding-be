import { Module } from '@nestjs/common';
import { CanadaPostService } from './canada-post.service';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';

@Module({
  controllers: [ShippingController],
  providers: [ShippingService, CanadaPostService],
  exports: [ShippingService]
})
export class ShippingModule { }
