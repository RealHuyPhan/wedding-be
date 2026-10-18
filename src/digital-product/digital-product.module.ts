import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalProductService } from './digital-product.service';
import { DigitalProductController } from './digital-product.controller';
import { DigitalProduct } from './entities/digital-product.entity';
import { DigitalCategoryModule } from '../digital-category/digital-category.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DigitalProduct]),
    DigitalCategoryModule,
  ],
  controllers: [DigitalProductController],
  providers: [DigitalProductService],
  exports: [DigitalProductService],
})
export class DigitalProductModule {}
