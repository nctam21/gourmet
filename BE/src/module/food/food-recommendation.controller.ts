import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { FoodRecommendationService, FoodRecommendation, FoodStatistics, UserInfluence } from './food-recommendation.service';

@Controller('food-recommendations')
export class FoodRecommendationController {
    constructor(
        private readonly foodRecommendationService: FoodRecommendationService,
    ) { }

    /**
     * 1. Gợi ý món ăn từ lứa tuổi khác
     * GET /food-recommendations/age-based?userAge=25
     */
    @Get('age-based')
    async getAgeBasedRecommendations(
        @Query('userAge', ParseIntPipe) userAge: number
    ): Promise<FoodRecommendation[]> {
        return this.foodRecommendationService.getFoodsFromDifferentAgeGroups(userAge);
    }

    /**
     * 2. Gợi ý món ăn theo thể loại và khu vực
     * GET /food-recommendations/category-region?userRegion=Hà Nội&categories=món chính,món phụ
     */
    @Get('category-region')
    async getCategoryRegionRecommendations(
        @Query('userRegion') userRegion: string,
        @Query('categories') categories: string
    ): Promise<FoodRecommendation[]> {
        const categoryArray = categories ? categories.split(',') : [];
        return this.foodRecommendationService.getFoodsByCategoryAndRegion(userRegion, categoryArray);
    }

    /**
     * 3. Món ăn có lượt xem cao nhất
     * GET /food-recommendations/most-viewed?limit=10
     */
    @Get('most-viewed')
    async getMostViewedFoods(
        @Query('limit', ParseIntPipe) limit: number = 10
    ): Promise<FoodRecommendation[]> {
        return this.foodRecommendationService.getMostViewedFoods(limit);
    }

    /**
     * 4. Thống kê theo loại món ăn
     * GET /food-recommendations/statistics
     */
    @Get('statistics')
    async getFoodTypeStatistics(): Promise<FoodStatistics[]> {
        return this.foodRecommendationService.getFoodTypeStatistics();
    }

    /**
     * 5. Món ăn phổ biến theo độ tuổi
     * GET /food-recommendations/popular-by-age
     */
    @Get('popular-by-age')
    async getPopularFoodsByAgeGroup(): Promise<FoodRecommendation[]> {
        return this.foodRecommendationService.getPopularFoodsByAgeGroup();
    }

    /**
     * 6. Gợi ý món ăn trong 2 bước từ món cụ thể
     * GET /food-recommendations/within-2-steps/phở
     */
    @Get('within-2-steps/:foodName')
    async getFoodRecommendationsWithin2Steps(
        @Param('foodName') foodName: string
    ): Promise<FoodRecommendation[]> {
        return this.foodRecommendationService.getFoodRecommendationsWithin2Steps(foodName);
    }

    /**
     * 7. Người dùng có ảnh hưởng cao nhất
     * GET /food-recommendations/influential-users?limit=10
     */
    @Get('influential-users')
    async getMostInfluentialUsers(
        @Query('limit', ParseIntPipe) limit: number = 10
    ): Promise<UserInfluence[]> {
        return this.foodRecommendationService.getMostInfluentialUsers(limit);
    }

    /**
     * Gợi ý cá nhân hóa tổng hợp
     * GET /food-recommendations/personalized?userId=123&userAge=25&userRegion=Hà Nội&categories=món chính,món phụ
     */
    @Get('personalized')
    async getPersonalizedRecommendations(
        @Query('userId') userId: string,
        @Query('userAge', ParseIntPipe) userAge: number,
        @Query('userRegion') userRegion: string,
        @Query('categories') categories?: string
    ): Promise<FoodRecommendation[]> {
        const categoryArray = categories ? categories.split(',') : [];
        return this.foodRecommendationService.getPersonalizedRecommendations(
            userId,
            userAge,
            userRegion,
            categoryArray
        );
    }
}
