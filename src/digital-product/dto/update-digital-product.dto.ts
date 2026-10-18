import { PartialType } from '@nestjs/swagger';
import { CreateDigitalProductDto } from './create-digital-product.dto';

export class UpdateDigitalProductDto extends PartialType(CreateDigitalProductDto) {}
