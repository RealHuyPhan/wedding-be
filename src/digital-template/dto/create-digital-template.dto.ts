import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateDigitalTemplateDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  thumbnail?: string;

  @IsOptional()
  @IsString()
  htmlContent?: string;

  @IsOptional()
  @IsString()
  cssContent?: string;

  @IsOptional()
  @IsString()
  jsContent?: string;

  @IsOptional()
  @IsString()
  defaultMusicUrl?: string;

  @IsOptional()
  config?: Record<string, unknown>;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || (value === 'false' ? false : value))
  @IsBoolean()
  isActive?: boolean;
}
