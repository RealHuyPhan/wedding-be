import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalCategoryService } from './digital-category.service';
import { DigitalCategoryController } from './digital-category.controller';
import { DigitalCategory } from './entities/digital-category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DigitalCategory])],
  controllers: [DigitalCategoryController],
  providers: [DigitalCategoryService],
  exports: [DigitalCategoryService],
})
export class DigitalCategoryModule {}
