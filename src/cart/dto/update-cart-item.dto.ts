import { IsNotEmpty, IsNumber, Min } from "class-validator";

export class UpdateCartItemDto {
    @IsNotEmpty()
    @IsNumber()
    @Min(0) // Cho phép 0 nếu muốn xử lý xoá ở backend khi số lượng = 0
    quantity: number;
}
