import { IsArray, IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    label: string;


    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    tags: string;

    @IsNumber()
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

    @IsString()
    @IsOptional()
    image?: string;

    @IsOptional()
    @Transform(({ value }: { value: string | boolean | undefined }) => value === 'true' || value === true)
    @IsBoolean()
    isHotItem?: boolean;

    @IsOptional()
    @Transform(({ value }: { value: string | boolean | undefined }) => value === 'true' || value === true)
    @IsBoolean()
    isDiscountItem?: boolean;

    @IsNumber()
    @IsOptional()
    discountPrice?: number;

    @IsNumber()
    @IsOptional()
    discountPercent?: number;

    @IsDateString()
    @IsOptional()
    discountStartDate?: string;

    @IsDateString()
    @IsOptional()
    discountEndDate?: string;
}
