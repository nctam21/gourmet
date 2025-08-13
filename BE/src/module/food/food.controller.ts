import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { FoodService } from './food.service';
import { GetAllFoodDto, GetAllFoodResult } from './dto/get-all-food.dto';
import { Food } from './food.model';

@Controller('foods')
export class FoodController {
    constructor(private readonly foodService: FoodService) { }

    @Get()
    async getAll(@Query() query: GetAllFoodDto): Promise<GetAllFoodResult> {
        return this.foodService.getAllFoods(query);
    }

    @Get(':id')
    async getDetail(@Param('id') id: string): Promise<Food | null> {
        return this.foodService.getFoodDetailById(id);
    }
}


