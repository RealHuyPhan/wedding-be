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

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  shippingServiceCode?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  shippingFeeCAD?: number; // Giá ship thực tế người dùng đã chọn (CAD), nếu có sẽ dùng trực tiếp

  @IsString()
  @IsOptional()
  weddingInvitationId?: string;
}

