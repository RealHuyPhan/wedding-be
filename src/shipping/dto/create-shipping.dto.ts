import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateShippingDto {
  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsOptional()
  province?: string;

  @IsNumber()
  @IsNotEmpty()
  shippingFee: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

