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
     * Get food detail by RID (increments view count)
     */
    @Get(':rid')
    async getDetail(@Param('rid') rid: string): Promise<Food | null> {
        return this.foodService.getFoodDetailById(rid);
    }

    /**
     * Get food view count
     */
    @Get(':rid/view-count')
    async getViewCount(@Param('rid') rid: string): Promise<{ foodRid: string; viewCount: number }> {
        const viewCount = await this.foodService.getFoodViewCount(rid);
        return { foodRid: rid, viewCount };
    }

    /**
     * Test endpoint to manually increment view count
     */
    @Post(':rid/increment-view')
    async incrementViewCount(@Param('rid') rid: string): Promise<{ foodRid: string; message: string; success: boolean }> {
        try {
            // Get current view count
            const currentViewCount = await this.foodService.getFoodViewCount(rid);

            // Manually increment view count
            const updateSql = `UPDATE Food SET view_count = COALESCE(view_count, 0) + 1 WHERE @rid = '${rid}'`;
            const result = await this.foodService['orientDbHttpService'].command<any>(updateSql);

            if (result) {
                const newViewCount = await this.foodService.getFoodViewCount(rid);
                return {
                    foodRid: rid,
                    message: `View count incremented from ${currentViewCount} to ${newViewCount}`,
                    success: true
                };
            } else {
                return {
                    foodRid: rid,
                    message: 'Failed to increment view count',
                    success: false
                };
            }
        } catch (error) {
            return {
                foodRid: rid,
                message: `Error: ${error.message}`,
                success: false
            };
        }
    }

    @Get('test/database')
    async testDatabase(): Promise<{ success: boolean; message: string; details?: any }> {
        return this.foodService.testDatabaseConnection();
    }

    @Get('test/view-count/:rid')
    async testViewCountField(@Param('rid') rid: string): Promise<{ success: boolean; message: string; details?: any }> {
        return this.foodService.testViewCountField(rid);
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
    @Put(':rid')
    async update(@Param('rid') rid: string, @Body() updateFoodDto: UpdateFoodDto): Promise<any> {
        return this.foodService.updateFood(rid, updateFoodDto);
    }

    /**
     * Delete a food
     */
    @Delete(':rid')
    async delete(@Param('rid') rid: string): Promise<{ success: boolean; message: string }> {
        const success = await this.foodService.deleteFood(rid);
        return {
            success,
            message: success ? 'Food deleted successfully' : 'Failed to delete food'
        };
    }
}


