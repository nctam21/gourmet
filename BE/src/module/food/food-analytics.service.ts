import { Injectable } from '@nestjs/common';
import { OrientDbHttpService } from '../orientdb/orientdb-http.service';

export interface FoodTrendAnalysis {
    foodName: string;
    foodType: string;
    viewTrend: 'increasing' | 'decreasing' | 'stable';
    likeTrend: 'increasing' | 'decreasing' | 'stable';
    popularityScore: number;
    regionDistribution: { region: string; count: number }[];
}

export interface UserBehaviorAnalysis {
    userRid: string;
    userName: string;
    favoriteFoodTypes: string[];
    preferredRegions: string[];
    activityLevel: 'high' | 'medium' | 'low';
    influenceScore: number;
}

export interface FoodSimilarityMatrix {
    foodRid: string;
    foodName: string;
    similarFoods: { foodRid: string; foodName: string; similarityScore: number }[];
}

@Injectable()
export class FoodAnalyticsService {
    constructor(
        private readonly orientDbHttpService: OrientDbHttpService,
    ) { }

    /**
     * Phân tích xu hướng món ăn theo thời gian
     */
    async analyzeFoodTrends(days: number = 30): Promise<FoodTrendAnalysis[]> {
        const query = `
            SELECT 
                f.@rid as foodRid,
                f.name as foodName,
                f.type as foodType,
                COALESCE(f.view_count, 0) as viewCount,
                COUNT(lf.@rid) as likeCount,
                r.name as regionName
            FROM Food f
            LEFT JOIN LIKES_FOOD lf ON f.@rid = lf.@rid
            LEFT JOIN FROM_REGION fr ON f.@rid = fr.@rid
            LEFT JOIN Region r ON fr.@rid = r.@rid
            GROUP BY f.@rid, f.name, f.type, f.view_count, r.name
            ORDER BY viewCount DESC, likeCount DESC
            LIMIT 50
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, 50);

        // Phân tích xu hướng và tính điểm phổ biến
        return results.map(item => {
            const popularityScore = (item.viewCount * 0.6) + (item.likeCount * 0.4);

            return {
                foodName: item.foodName,
                foodType: item.foodType,
                viewTrend: this.determineTrend(item.viewCount),
                likeTrend: this.determineTrend(item.likeCount),
                popularityScore: Math.round(popularityScore * 100) / 100,
                regionDistribution: [{ region: item.regionName, count: 1 }]
            };
        });
    }

    /**
     * Phân tích hành vi người dùng
     */
    async analyzeUserBehavior(userRid: string): Promise<UserBehaviorAnalysis> {
        const query = `
            SELECT 
                u.@rid as userRid,
                u.name as userName,
                f.type as foodType,
                r.name as regionName,
                COUNT(lf.@rid) + COUNT(vf.@rid) + COUNT(rf.@rid) as totalActions
            FROM User u
            LEFT JOIN LIKES_FOOD lf ON u.@rid = lf.@rid
            LEFT JOIN Food f ON lf.@rid = f.@rid
            LEFT JOIN VIEWS_FOOD vf ON u.@rid = vf.@rid
            LEFT JOIN RATES_FOOD rf ON u.@rid = rf.@rid
            LEFT JOIN PREFERS_REGION pr ON u.@rid = pr.@rid
            LEFT JOIN Region r ON pr.@rid = r.@rid
            WHERE u.@rid = '${userRid}'
            GROUP BY u.@rid, u.name, f.type, r.name
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, 100);

        if (results.length === 0) {
            throw new Error('User not found');
        }

        const user = results[0];
        const favoriteFoodTypes = [...new Set(results.map(r => r.foodType).filter(Boolean))];
        const preferredRegions = [...new Set(results.map(r => r.regionName).filter(Boolean))];
        const totalActions = user.totalActions || 0;

        return {
            userRid: user.userRid,
            userName: user.userName,
            favoriteFoodTypes,
            preferredRegions,
            activityLevel: this.determineActivityLevel(totalActions),
            influenceScore: this.calculateInfluenceScore(totalActions, favoriteFoodTypes.length)
        };
    }

    /**
     * Tạo ma trận tương tự món ăn
     */
    async generateFoodSimilarityMatrix(foodRid: string): Promise<FoodSimilarityMatrix> {
        const query = `
            SELECT 
                f1.@rid as foodRid,
                f1.name as foodName,
                f2.@rid as similarFoodRid,
                f2.name as similarFoodName,
                COUNT(i.@rid) as commonIngredients,
                f1.type as food1Type,
                f2.type as food2Type
            FROM Food f1
            INNER JOIN HAS_INGREDIENT hi1 ON f1.@rid = hi1.@rid
            INNER JOIN Ingredient i ON hi1.@rid = i.@rid
            INNER JOIN HAS_INGREDIENT hi2 ON i.@rid = hi2.@rid
            INNER JOIN Food f2 ON hi2.@rid = f2.@rid
            WHERE f1.@rid = '${foodRid}' AND f2.@rid != '${foodRid}'
            GROUP BY f1.@rid, f1.name, f2.@rid, f2.name, f1.type, f2.type
            ORDER BY commonIngredients DESC
            LIMIT 20
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, 20);

        if (results.length === 0) {
            throw new Error('Food not found');
        }

        const food = results[0];
        const similarFoods = results.map(item => {
            const similarityScore = this.calculateSimilarityScore(
                item.commonIngredients,
                item.food1Type === item.food2Type
            );

            return {
                foodRid: item.similarFoodRid,
                foodName: item.similarFoodName,
                similarityScore: Math.round(similarityScore * 100) / 100
            };
        });

        return {
            foodRid: food.foodRid,
            foodName: food.foodName,
            similarFoods: similarFoods.sort((a, b) => b.similarityScore - a.similarityScore)
        };
    }

    /**
     * Phân tích món ăn theo mùa và thời tiết
     */
    async getSeasonalFoodRecommendations(season: string) {
        const seasonKeywords = {
            'spring': ['xuân', 'mùa xuân', 'đầu năm'],
            'summer': ['hè', 'mùa hè', 'nóng'],
            'autumn': ['thu', 'mùa thu', 'mát'],
            'winter': ['đông', 'mùa đông', 'lạnh']
        };

        const keywords = seasonKeywords[season as keyof typeof seasonKeywords] || [];
        const keywordQuery = keywords.map(k => `f.description.toLowerCase() LIKE '%${k}%'`).join(' OR ');

        const query = `
            SELECT 
                f.@rid as foodRid,
                f.name as foodName,
                f.type as foodType,
                f.description as description,
                COUNT(lf.@rid) as likeCount
            FROM Food f
            LEFT JOIN LIKES_FOOD lf ON f.@rid = lf.@rid
            WHERE ${keywordQuery}
            GROUP BY f.@rid, f.name, f.type, f.description
            ORDER BY likeCount DESC
            LIMIT 15
        `;

        return await this.orientDbHttpService.queryAll<any>(query, 15);
    }

    /**
     * Thống kê món ăn theo khu vực và độ tuổi
     */
    async getRegionalAgeStatistics() {
        const query = `
            SELECT 
                r.name as regionName,
                u.age as userAge,
                f.type as foodType,
                COUNT(lf.@rid) as likeCount,
                COALESCE(f.view_count, 0) as viewCount
            FROM Region r
            INNER JOIN FROM_REGION fr ON r.@rid = fr.@rid
            INNER JOIN Food f ON fr.@rid = f.@rid
            INNER JOIN LIKES_FOOD lf ON f.@rid = lf.@rid    
            INNER JOIN User u ON lf.@rid = u.@rid
            GROUP BY r.name, u.age, f.type, f.view_count
            ORDER BY r.name, u.age, likeCount DESC
        `;

        return await this.orientDbHttpService.queryAll<any>(query, 100);
    }

    /**
     * Xác định xu hướng dựa trên số liệu
     */
    private determineTrend(count: number): 'increasing' | 'decreasing' | 'stable' {
        if (count > 100) return 'increasing';
        if (count > 50) return 'stable';
        return 'decreasing';
    }

    /**
     * Xác định mức độ hoạt động
     */
    private determineActivityLevel(totalActions: number): 'high' | 'medium' | 'low' {
        if (totalActions > 50) return 'high';
        if (totalActions > 20) return 'medium';
        return 'low';
    }

    /**
     * Tính điểm ảnh hưởng
     */
    private calculateInfluenceScore(totalActions: number, foodTypeCount: number): number {
        return Math.min(1.0, (totalActions * 0.01) + (foodTypeCount * 0.1));
    }

    /**
     * Tính điểm tương tự
     */
    private calculateSimilarityScore(commonIngredients: number, sameType: boolean): number {
        let score = commonIngredients * 0.2;
        if (sameType) score += 0.3;
        return Math.min(1.0, score);
    }
}
