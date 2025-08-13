import { Controller, Get, Post, Put, Delete, Param, Body, Query, ParseIntPipe } from '@nestjs/common';
import { FoodService } from './food.service';
import { GetAllFoodDto, GetAllFoodResult, CreateFoodDto, UpdateFoodDto } from './dto/get-all-food.dto';
import { Food } from './food.model';

@Controller('foods')
export class FoodController {
    constructor(private readonly foodService: FoodService) { }

    /**
     * Get all foods with pagination and filtering
     */
    @Get()
    async getAll(@Query() query: GetAllFoodDto): Promise<GetAllFoodResult> {
        return this.foodService.getAllFoods(query);
    }

    /**
     * Get food detail by ID
     */
    @Get(':id')
    async getDetail(@Param('id') id: string): Promise<Food | null> {
        return this.foodService.getFoodDetailById(id);
    }

    /**
     * Create a new food
     */
    @Post()
    async create(@Body() createFoodDto: CreateFoodDto): Promise<any> {
        return this.foodService.createFood(createFoodDto);
    }

    /**
     * Update an existing food
     */
    @Put(':id')
    async update(@Param('id') id: string, @Body() updateFoodDto: UpdateFoodDto): Promise<any> {
        return this.foodService.updateFood(id, updateFoodDto);
    }

    /**
     * Delete a food
     */
    @Delete(':id')
    async delete(@Param('id') id: string): Promise<{ success: boolean; message: string }> {
        const success = await this.foodService.deleteFood(id);
        return {
            success,
            message: success ? 'Food deleted successfully' : 'Failed to delete food'
        };
    }
}


