import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateShippingDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  provinceCode?: string;

  @IsNumber()
  @IsNotEmpty()
  shippingFee: number;


}

