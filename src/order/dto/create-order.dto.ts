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
  shippingDestinationId: string;

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
  @IsOptional()
  orderNotes?: string;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

