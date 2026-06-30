import { IsNotEmpty, IsNumber, IsUUID, Min } from "class-validator";

export class AddToCartDto {
    @IsNotEmpty()
    @IsUUID()
    productId: string;

    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    quantity: number;
}
