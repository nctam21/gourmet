import { IsString, IsInt, IsEmail, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * DTO for user registration
 */
export class RegisterUserDto {
    @IsString()
    @IsNotEmpty()
    userName: string;

    @IsString()
    dateOfBirth: string;

    @IsString()
    @IsNotEmpty()
    address: string;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    @MaxLength(32)
    password: string;
} 