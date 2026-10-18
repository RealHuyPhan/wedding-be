import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DigitalTemplate } from './entities/digital-template.entity';
import { DigitalTemplateService } from './digital-template.service';
import { DigitalTemplateController } from './digital-template.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DigitalTemplate])],
  controllers: [DigitalTemplateController],
  providers: [DigitalTemplateService],
  exports: [DigitalTemplateService],
})
export class DigitalTemplateModule {}
