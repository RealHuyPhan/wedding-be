import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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




}

