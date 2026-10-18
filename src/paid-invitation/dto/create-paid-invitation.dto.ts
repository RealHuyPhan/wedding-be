import { IsNotEmpty, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CoupleDataDto {
  @IsString()
  @IsNotEmpty()
  groomName: string;

  @IsString()
  @IsNotEmpty()
  brideName: string;

  @IsString()
  @IsOptional()
  dayOfWeek?: string;

  @IsString()
  @IsNotEmpty()
  eventDate: string;

  @IsString()
  @IsNotEmpty()
  eventMonth: string;

  @IsString()
  @IsNotEmpty()
  eventYear: string;

  @IsString()
  @IsNotEmpty()
  eventTime: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsString()
  @IsOptional()
  musicUrl?: string;

  @IsString()
  @IsOptional()
  customNote?: string;
}

export class CreatePaidInvitationDto {
  @IsString()
  @IsOptional()
  inviteCode?: string;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  digitalProductId?: string;

  @IsString()
  @IsOptional()
  templateId?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => CoupleDataDto)
  coupleData: CoupleDataDto;
}
