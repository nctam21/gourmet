import { Module } from '@nestjs/common';
import { FoodService } from './food.service';
import { FoodRecommendationService } from './food-recommendation.service';
import { FoodAnalyticsService } from './food-analytics.service';
import { FoodViewService } from './food-view.service';
import { OrientDbModule } from '../orientdb/orientdb.module';
import { FoodController } from './food.controller';
import { FoodRecommendationController } from './food-recommendation.controller';
import { FoodAnalyticsController } from './food-analytics.controller';

@Module({
    imports: [OrientDbModule],
    controllers: [FoodController, FoodRecommendationController, FoodAnalyticsController],
    providers: [FoodService, FoodRecommendationService, FoodAnalyticsService, FoodViewService],
    exports: [FoodService, FoodRecommendationService, FoodAnalyticsService, FoodViewService],
})
export class FoodModule { }