import { PartialType } from '@nestjs/swagger';
import { CreateDigitalCategoryDto } from './create-digital-category.dto';

export class UpdateDigitalCategoryDto extends PartialType(CreateDigitalCategoryDto) {}
