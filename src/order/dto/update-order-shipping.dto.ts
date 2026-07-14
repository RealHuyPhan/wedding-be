import { IsOptional, IsString } from 'class-validator';

export class UpdateOrderShippingDto {
  @IsString()
  @IsOptional()
  shippingName?: string;

  @IsString()
  @IsOptional()
  shippingPhone?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsString()
  @IsOptional()
  shippingCountry?: string;

  @IsString()
  @IsOptional()
  shippingProvince?: string;

  @IsString()
  @IsOptional()
  shippingCity?: string;

  @IsString()
  @IsOptional()
  shippingPostcode?: string;

  @IsString()
  @IsOptional()
  shippingUnit?: string;
}
