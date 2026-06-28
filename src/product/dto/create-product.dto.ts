import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateProductDto {
    @IsString()
    @IsNotEmpty()
    label: string;

    @IsString()
    @IsNotEmpty()
    value: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    price: number;

    // Dùng @IsOptional() để cho phép có hoặc không truyền trường này
    // Dùng IsArray vì một thiệp (Product) có thể thuộc nhiều phong cách (Category) (Many-to-Many)
    @IsArray()
    @IsString({ each: true }) // Kiểm tra từng phần tử trong mảng phải là string (UUID)
    @IsOptional()
    categoryIds?: string[];
}
