import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '../entities/order.entity';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  shippingName: string;

  @IsString()
  @IsNotEmpty()
  shippingPhone: string;

  @IsString()
  @IsNotEmpty()
  shippingAddress: string;

  @IsString()
  @IsNotEmpty()
  shippingCountry: string;

  @IsString()
  @IsOptional()
  shippingProvince?: string;

  @IsString()
  @IsNotEmpty()
  shippingCity: string;

  @IsString()
  @IsNotEmpty()
  shippingPostcode: string;

  @IsString()
  @IsOptional()
  shippingUnit?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

