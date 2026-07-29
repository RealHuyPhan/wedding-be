import { IsNotEmpty, IsString } from 'class-validator';

export class CreateStateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  countryCode: string;
}
