import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateDigitalCategoryDto {
    @IsString()
    @IsNotEmpty()
    category: string;

    @IsString()
    @IsOptional()
    categoryCode?: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsOptional()
    image?: string;
}
