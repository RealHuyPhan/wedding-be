import { IsDateString, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class CreateUserDto {
    @IsEmail({}, { message: 'Email is invalid' })
    @IsNotEmpty({ message: 'Email is required' })
    email: string;

    @IsOptional()
    @Transform(({ value }: { value: string | undefined }) => value === '' ? null : value)
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password?: string;

    @IsOptional()
    @Transform(({ value }: { value: string | undefined }) => value === '' ? null : value)
    @IsString()
    @MinLength(10, { message: 'Phone must be at least 10 characters long' })
    phone?: string;


    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @Transform(({ value }: { value: string | undefined }) => value === '' ? null : value)
    @IsDateString()
    birthday?: Date;

    @IsOptional()
    @IsString()
    gender?: string;

    @IsOptional()
    @IsString()
    role?: string;
}
