import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Food } from '../food.model';
import { PaginationResult } from '../../shared/pagination/pagination.types';

/**
 * Input DTO for getting paginated list of foods
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
}

/**
 * Output type for a paginated list of foods
 */
export type GetAllFoodResult = PaginationResult<Food>;
