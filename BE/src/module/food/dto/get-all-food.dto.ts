import { IsInt, IsOptional, Max, Min, IsString } from 'class-validator';
import { Food } from '../food.model';
import { PaginationResult } from '../../shared/pagination/pagination.types';

/**
 * DTO for getting paginated list of foods
 */
export class GetAllFoodDto {
    /** Current page number (1-based) */
    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number = 1;

    /** Page size */
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 10;

    /** Filter by food name (partial match) */
    @IsOptional()
    @IsString()
    name?: string;

    /** Filter by food type */
    @IsOptional()
    @IsString()
    type?: string;

    /** Filter by price range (min) */
    @IsOptional()
    @IsInt()
    @Min(0)
    minPrice?: number;

    /** Filter by price range (max) */
    @IsOptional()
    @IsInt()
    @Min(0)
    maxPrice?: number;
}

/**
 * DTO for creating a new food
 */
export class CreateFoodDto {
    @IsString()
    name: string;

    @IsString()
    description: string;

    @IsString()
    type: string;

    @IsString()
    ingredients: string;

    @IsString()
    recipe: string;

    @IsString()
    image_url: string;

    @IsInt()
    @Min(0)
    price: number;
}

/**
 * DTO for updating a food
 */
export class UpdateFoodDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    type?: string;

    @IsOptional()
    @IsString()
    ingredients?: string;

    @IsOptional()
    @IsString()
    recipe?: string;

    @IsOptional()
    @IsString()
    image_url?: string;

    @IsOptional()
    @IsInt()
    @Min(0)
    price?: number;
}

export type GetAllFoodResult = PaginationResult<Food>;
