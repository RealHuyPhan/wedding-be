import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingDestination } from './entities/shipping.entity';
import { ShippoService } from './shippo.service';
import { CartModule } from '../cart/cart.module';

@Module({
  imports: [TypeOrmModule.forFeature([ShippingDestination]), CartModule],
  controllers: [ShippingController],
  providers: [ShippingService, ShippoService],
  exports: [ShippingService, ShippoService],
})
export class ShippingModule {}
