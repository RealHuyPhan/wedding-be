import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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

  @IsString()
  @IsNotEmpty()
  shippingMethodToken: string;

  @IsString()
  @IsOptional()
  shippingMethodName?: string;

  @IsNumber()
  @Min(0)
  shippingAmount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

