import { IsArray, IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Transform, Type } from "class-transformer";
import { ValidateNested } from "class-validator";

export class ProductImageDto {
    @IsString()
    url: string;

    @IsBoolean()
    isCover: boolean;
}

export class CreateProductDto {
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
    @IsNotEmpty()
    tags: string;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    price: number;

    // Dùng @IsOptional() để cho phép có hoặc không truyền trường này
    // Dùng IsArray vì một thiệp (Product) có thể thuộc nhiều phong cách (Category) (Many-to-Many)
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    categoryIds?: string[];

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProductImageDto)
    @IsOptional()
    images?: ProductImageDto[];

    @IsString()
    @IsOptional()
    printingTechnique?: string;

    @IsString()
    @IsOptional()
    paperStock?: string;

    @IsString()
    @IsOptional()
    dimensions?: string;

    @IsOptional()
    @Transform(({ value }: { value: string | boolean | undefined }) => value === 'true' || value === true)
    @IsBoolean()
    isHotItem?: boolean;

    @IsOptional()
    @Transform(({ value }: { value: string | boolean | undefined }) => value === 'true' || value === true)
    @IsBoolean()
    isDiscountItem?: boolean;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    discountPrice?: number;

    @Type(() => Number)
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsOptional()
    discountPercent?: number;

    @IsDateString()
    @IsOptional()
    discountStartDate?: string;

    @IsDateString()
    @IsOptional()
    discountEndDate?: string;
}
