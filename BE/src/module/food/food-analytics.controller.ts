import { Controller, Get, Query, Param, ParseIntPipe } from '@nestjs/common';
import { FoodAnalyticsService, FoodTrendAnalysis, UserBehaviorAnalysis, FoodSimilarityMatrix } from './food-analytics.service';

@Controller('food-analytics')
export class FoodAnalyticsController {
    constructor(
        private readonly foodAnalyticsService: FoodAnalyticsService,
    ) { }

    /**
     * Phân tích xu hướng món ăn
     * GET /food-analytics/trends?days=30
     */
    @Get('trends')
    async analyzeFoodTrends(
        @Query('days', ParseIntPipe) days: number = 30
    ): Promise<FoodTrendAnalysis[]> {
        return this.foodAnalyticsService.analyzeFoodTrends(days);
    }

    /**
     * Phân tích hành vi người dùng
     * GET /food-analytics/user-behavior/123
     */
    @Get('user-behavior/:userId')
    async analyzeUserBehavior(
        @Param('userId') userId: string
    ): Promise<UserBehaviorAnalysis> {
        return this.foodAnalyticsService.analyzeUserBehavior(userId);
    }

    /**
     * Ma trận tương tự món ăn
     * GET /food-analytics/similarity/123
     */
    @Get('similarity/:foodId')
    async generateFoodSimilarityMatrix(
        @Param('foodId') foodId: string
    ): Promise<FoodSimilarityMatrix> {
        return this.foodAnalyticsService.generateFoodSimilarityMatrix(foodId);
    }

    /**
     * Gợi ý món ăn theo mùa
     * GET /food-analytics/seasonal?season=summer
     */
    @Get('seasonal')
    async getSeasonalFoodRecommendations(
        @Query('season') season: string
    ) {
        return this.foodAnalyticsService.getSeasonalFoodRecommendations(season);
    }

    /**
     * Thống kê theo khu vực và độ tuổi
     * GET /food-analytics/regional-age
     */
    @Get('regional-age')
    async getRegionalAgeStatistics() {
        return this.foodAnalyticsService.getRegionalAgeStatistics();
    }

    /**
     * Dashboard tổng hợp
     * GET /food-analytics/dashboard
     */
    @Get('dashboard')
    async getAnalyticsDashboard() {
        const [
            trends,
            regionalStats
        ] = await Promise.all([
            this.foodAnalyticsService.analyzeFoodTrends(30),
            this.foodAnalyticsService.getRegionalAgeStatistics()
        ]);

        // Tính toán các chỉ số tổng hợp
        const totalFoods = trends.length;
        const increasingTrends = trends.filter(t => t.viewTrend === 'increasing').length;
        const popularFoods = trends.filter(t => t.popularityScore > 0.7).length;

        return {
            summary: {
                totalFoods,
                increasingTrends,
                popularFoods,
                trendPercentage: Math.round((increasingTrends / totalFoods) * 100)
            },
            trends: trends.slice(0, 10),
            regionalStats: regionalStats.slice(0, 20)
        };
    }
}
