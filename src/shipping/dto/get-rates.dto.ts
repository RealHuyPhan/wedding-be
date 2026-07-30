import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetRatesDto {
  @ApiProperty({ description: 'Destination country code (e.g. CA, US)' })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ description: 'Destination postal code' })
  @IsString()
  @IsNotEmpty()
  postcode: string;

  @ApiProperty({ description: 'Total quantity of invitations in cart', required: false, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalCards?: number;
}
