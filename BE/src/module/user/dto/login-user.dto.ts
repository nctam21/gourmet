import { IsString, IsOptional, IsEmail, MinLength, MaxLength, ValidateIf } from 'class-validator';

/**
 * DTO for user login
 */
export class LoginUserDto {
    @ValidateIf(o => !o.phone)
    @IsEmail()
    @IsOptional()
    email?: string;

    @ValidateIf(o => !o.email)
    @IsString()
    @IsOptional()
    phone?: string;

    @IsString()
    @MinLength(6)
    @MaxLength(32)
    password: string;
} 