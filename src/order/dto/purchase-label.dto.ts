import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsNotEmpty } from 'class-validator';

export class PurchaseLabelDto {
    @ApiProperty({ example: 30, description: 'Length of the box in cm' })
    @IsNumber()
    @IsNotEmpty()
    length: number;

    @ApiProperty({ example: 25, description: 'Width of the box in cm' })
    @IsNumber()
    @IsNotEmpty()
    width: number;

    @ApiProperty({ example: 15, description: 'Height of the box in cm' })
    @IsNumber()
    @IsNotEmpty()
    height: number;

    @ApiProperty({ example: 1.5, description: 'Total weight of the box in kg' })
    @IsNumber()
    @IsNotEmpty()
    weight: number;
}
