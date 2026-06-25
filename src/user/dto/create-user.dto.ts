import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
    @IsEmail({}, { message: 'Email is invalid' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password: string;

    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Phone is required' })
    @MinLength(10, { message: 'Phone must be at least 10 characters long' })
    phone?: string;


    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsDateString()
    birthday?: Date;

    @IsOptional()
    @IsString()
    gender?: string;
}
