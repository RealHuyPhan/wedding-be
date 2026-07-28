import { Module } from '@nestjs/common';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingDestination } from './entities/shipping.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShippingDestination])],
  controllers: [ShippingController],
  providers: [ShippingService],
})
export class ShippingModule {}
