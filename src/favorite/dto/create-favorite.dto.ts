import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class CreateFavoriteDto {
  @ApiProperty({ description: 'The ID of the product to add to favorites' })
  @IsNotEmpty()
  @IsUUID()
  productId: string;
}
