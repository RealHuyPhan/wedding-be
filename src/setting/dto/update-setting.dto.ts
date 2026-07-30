import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingDto {
  @ApiProperty({ description: 'Setting value' })
  @IsNotEmpty()
  @IsString()
  value: string;
}
