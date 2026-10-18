import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { Transform, Type } from "class-transformer";

export class DigitalProductImageDto {
    @IsString()
    url: string;

    @IsBoolean()
    isCover: boolean;
}

export class CreateDigitalProductDto {
    @IsString()
    @IsNotEmpty()
    product: string;

    @IsString()
    @IsOptional()
    productCode?: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsOptional()
    tags?: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    price: number;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    categoryIds?: string[];

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DigitalProductImageDto)
    @IsOptional()
    images?: DigitalProductImageDto[];

    @IsString()
    @IsOptional()
    previewUrl?: string;

    @IsString()
    @IsOptional()
    templateId?: string;

    @IsString()
    @IsOptional()
    musicUrl?: string;

    @IsOptional()
    @Transform(({ value }: { value: string | boolean | undefined }) => value === 'true' || value === true)
    @IsBoolean()
    isHotItem?: boolean;
}
