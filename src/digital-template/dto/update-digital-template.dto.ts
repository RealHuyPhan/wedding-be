import { PartialType } from '@nestjs/mapped-types';
import { CreateDigitalTemplateDto } from './create-digital-template.dto';

export class UpdateDigitalTemplateDto extends PartialType(CreateDigitalTemplateDto) {}
