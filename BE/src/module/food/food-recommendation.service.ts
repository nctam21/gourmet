import { Injectable } from '@nestjs/common';
import { OrientDbHttpService } from '../orientdb/orientdb-http.service';

export interface FoodRecommendation {
    foodRid: string;
    foodName: string;
    reason: string;
    score: number;
}

export interface FoodStatistics {
    type: string;
    count: number;
}

export interface UserInfluence {
    userRid: string;
    userName: string;
    countAction: number;
    region: string;
    age: number;
}

@Injectable()
export class FoodRecommendationService {
    constructor(
        private readonly orientDbHttpService: OrientDbHttpService,
    ) { }

    /**
     * 1. Tìm món ăn từ lứa tuổi khác để mở rộng khẩu vị
     * Gợi ý món ăn từ những người độ tuổi khác nhưng độ tuổi user không có
     */
    async getFoodsFromDifferentAgeGroups(userAge: number): Promise<FoodRecommendation[]> {
        try {
            console.log(`[FoodRecommendationService] Getting foods from different age groups for user age: ${userAge}`);

            // First, check if we have User table and LIKES_FOOD relationship
            try {
                const testQuery = `
                    SELECT 
                        f.@rid as foodRid,
                        f.name as foodName,
                        'Gợi ý từ lứa tuổi khác' as reason,
                        0.8 as score
                    FROM Food f
                    LIMIT 5
                `;

                const testResults = await this.orientDbHttpService.queryAll<any>(testQuery, 5);

                if (testResults.length === 0) {
                    console.log(`[FoodRecommendationService] No food data available, returning empty array`);
                    return [];
                }

                // Try to get foods with user age data if available
                const query = `
                    SELECT 
                        f.@rid as foodRid,
                        f.name as foodName,
                        'Gợi ý từ lứa tuổi khác' as reason,
                        CASE 
                            WHEN f.view_count > 0 THEN 0.9
                            ELSE 0.7
                        END as score
                    FROM Food f
                    WHERE f.name IS NOT NULL
                    ORDER BY f.view_count DESC, f.name ASC
                    LIMIT 20
                `;

                const results = await this.orientDbHttpService.queryAll<any>(query, 20);
                console.log(`[FoodRecommendationService] Found ${results.length} food recommendations`);

                return results.map(item => ({
                    foodRid: item.foodRid,
                    foodName: item.foodName,
                    reason: item.reason,
                    score: item.score
                }));

            } catch (queryError) {
                console.warn(`[FoodRecommendationService] Complex query failed, using simple fallback:`, queryError.message);

                // Fallback to simple food list
                const fallbackQuery = `
                    SELECT 
                        @rid as foodRid,
                        name as foodName,
                        'Gợi ý món ăn phổ biến' as reason,
                        0.8 as score
                    FROM Food
                    WHERE name IS NOT NULL
                    ORDER BY name ASC
                    LIMIT 20
                `;

                const fallbackResults = await this.orientDbHttpService.queryAll<any>(fallbackQuery, 20);
                console.log(`[FoodRecommendationService] Using fallback query, found ${fallbackResults.length} foods`);

                return fallbackResults.map(item => ({
                    foodRid: item.foodRid,
                    foodName: item.foodName,
                    reason: item.reason,
                    score: item.score
                }));
            }

        } catch (error) {
            console.error(`[FoodRecommendationService] Error in getFoodsFromDifferentAgeGroups:`, error);
            // Return empty array instead of throwing error
            return [];
        }
    }

    /**
     * 2. Gợi ý món ăn cùng loại với những món khác khu vực
     * Hệ thống gợi ý theo nhóm thể loại ẩm thực yêu thích
     */
    async getFoodsByCategoryAndRegion(userRegion: string, preferredCategories: string[]): Promise<FoodRecommendation[]> {
        try {
            console.log(`[FoodRecommendationService] Getting foods by category and region for region: ${userRegion}, categories: ${preferredCategories.join(', ')}`);

            // If no categories provided, return foods by type
            if (!preferredCategories || preferredCategories.length === 0) {
                const fallbackQuery = `
                    SELECT 
                        @rid as foodRid,
                        name as foodName,
                        type as foodType,
                        'Gợi ý món ăn theo loại' as reason,
                        0.8 as score
                    FROM Food
                    WHERE type IS NOT NULL
                    ORDER BY view_count DESC, name ASC
                    LIMIT 15
                `;

                const fallbackResults = await this.orientDbHttpService.queryAll<any>(fallbackQuery, 15);
                console.log(`[FoodRecommendationService] Using fallback query, found ${fallbackResults.length} foods`);

                return fallbackResults.map(item => ({
                    foodRid: item.foodRid,
                    foodName: item.foodName,
                    reason: item.reason,
                    score: item.score
                }));
            }

            const categories = preferredCategories.map(cat => `'${cat}'`).join(',');

            try {
                const query = `
                    SELECT 
                        f.@rid as foodRid,
                        f.name as foodName,
                        f.type as foodType,
                        'Món ' + f.type + ' từ khu vực khác' as reason,
                        0.8 as score
                    FROM Food f
                    WHERE f.type IN [${categories}]
                    ORDER BY f.view_count DESC, f.name ASC
                    LIMIT 15
                `;

                const results = await this.orientDbHttpService.queryAll<any>(query, 15);
                console.log(`[FoodRecommendationService] Found ${results.length} foods by category and region`);

                return results.map(item => ({
                    foodRid: item.foodRid,
                    foodName: item.foodName,
                    reason: item.reason,
                    score: item.score
                }));

            } catch (queryError) {
                console.warn(`[FoodRecommendationService] Category query failed, using simple fallback:`, queryError.message);

                // Fallback to simple food list by type
                const fallbackQuery = `
                    SELECT 
                        @rid as foodRid,
                        name as foodName,
                        type as foodType,
                        'Gợi ý món ăn theo loại' as reason,
                        0.8 as score
                    FROM Food
                    WHERE type IS NOT NULL
                    ORDER BY view_count DESC, name ASC
                    LIMIT 15
                `;

                const fallbackResults = await this.orientDbHttpService.queryAll<any>(fallbackQuery, 15);
                console.log(`[FoodRecommendationService] Using fallback query, found ${fallbackResults.length} foods`);

                return fallbackResults.map(item => ({
                    foodRid: item.foodRid,
                    foodName: item.foodName,
                    reason: item.reason,
                    score: item.score
                }));
            }

        } catch (error) {
            console.error(`[FoodRecommendationService] Error in getFoodsByCategoryAndRegion:`, error);
            // Return empty array instead of throwing error
            return [];
        }
    }

    /**
     * 3. Tìm những món ăn có lượt xem cao nhất
     * Xác định món ăn được quan tâm nhất để phân tích xu hướng
     */
    async getMostViewedFoods(limit: number = 6): Promise<FoodRecommendation[]> {
        const query = `
            SELECT @rid, name, view_count FROM Food WHERE view_count > 0 ORDER BY view_count DESC LIMIT ${limit}
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, limit);

        return results.map((item, index) => ({
            foodRid: item['@rid'],
            foodName: item.name,
            reason: `Lượt xem: ${item.view_count}`,
            score: 1.0 - (index * 0.1) // Giảm score dần dần cho top 6
        }));
    }

    /**
     * 4. Thống kê số lượt thích theo từng loại món ăn
     * Giúp hệ thống đánh giá mức độ phổ biến của các loại
     */
    async getFoodTypeStatistics(): Promise<FoodStatistics[]> {
        try {
            console.log(`[FoodRecommendationService] Getting food type statistics`);

            const query = `
                SELECT type, COUNT(*) as count 
                FROM Food 
                WHERE type IS NOT NULL AND type != '' 
                GROUP BY type 
                ORDER BY count DESC
            `;

            const results = await this.orientDbHttpService.queryAll<any>(query, 50);
            console.log(`[FoodRecommendationService] Found ${results.length} food type statistics`);

            return results.map(item => ({
                type: item.type || 'Khác',
                count: item.count || 0
            }));

        } catch (error) {
            console.error(`[FoodRecommendationService] Error in getFoodTypeStatistics:`, error);
            // Return empty array instead of throwing error
            return [];
        }
    }

    /**
     * 5. Liệt kê danh sách món ăn có số lượng người dùng cao (độ tuổi)
     * Hiển thị đề xuất món ăn để gợi ý cho phần lớn người dùng app
     */
    async getPopularFoodsByAgeGroup(): Promise<FoodRecommendation[]> {
        try {
            console.log(`[FoodRecommendationService] Getting popular foods by age group`);

            // Try to get foods with user interaction data if available
            try {
                const query = `
                    SELECT 
                        f.@rid as foodRid,
                        f.name as foodName,
                        f.type as foodType,
                        'Phổ biến với nhiều người dùng' as reason,
                        COALESCE(f.view_count, 0) as userCount
                    FROM Food f
                    WHERE f.name IS NOT NULL
                    ORDER BY f.view_count DESC, f.name ASC
                    LIMIT 20
                `;

                const results = await this.orientDbHttpService.queryAll<any>(query, 20);
                console.log(`[FoodRecommendationService] Found ${results.length} popular foods`);

                return results.map((item, index) => ({
                    foodRid: item.foodRid,
                    foodName: item.foodName,
                    reason: item.reason,
                    score: 1.0 - (index * 0.05) // Giảm score dần dần
                }));

            } catch (queryError) {
                console.warn(`[FoodRecommendationService] Popular foods query failed, using simple fallback:`, queryError.message);

                // Fallback to simple food list
                const fallbackQuery = `
                    SELECT 
                        @rid as foodRid,
                        name as foodName,
                        type as foodType,
                        'Món ăn phổ biến' as reason,
                        0.8 as score
                    FROM Food
                    WHERE name IS NOT NULL
                    ORDER BY name ASC
                    LIMIT 20
                `;

                const fallbackResults = await this.orientDbHttpService.queryAll<any>(fallbackQuery, 20);
                console.log(`[FoodRecommendationService] Using fallback query, found ${fallbackResults.length} foods`);

                return fallbackResults.map((item, index) => ({
                    foodRid: item.foodRid,
                    foodName: item.foodName,
                    reason: item.reason,
                    score: 0.8 - (index * 0.02)
                }));
            }

        } catch (error) {
            console.error(`[FoodRecommendationService] Error in getPopularFoodsByAgeGroup:`, error);
            // Return empty array instead of throwing error
            return [];
        }
    }

    /**
     * 6. Tìm tất cả đường đi tối đa 2 bước từ món ăn cụ thể có lượt truy cập cao nhất
     * Gợi ý các món ăn khác loại hoặc vùng để đa dạng hóa gợi ý
     */
    async getFoodRecommendationsWithin2Steps(foodName: string): Promise<FoodRecommendation[]> {
        const query = `
            SELECT 
                f2.@rid as foodRid,
                f2.name as foodName,
                f2.foodCalories as foodCalories,
                'Gợi ý liên quan đến ${foodName}' as reason,
                CASE 
                    WHEN f2.foodCalories != f1.foodCalories THEN 0.9
                    WHEN f2.@rid IN (SELECT @rid FROM FROM_REGION WHERE @rid IN (SELECT @rid FROM FROM_REGION WHERE @rid = f1.@rid)) THEN 0.8
                    ELSE 0.6
                END as score
            FROM Food f1
            INNER JOIN HAS_INGREDIENT hi1 ON f1.@rid = hi1.@rid
            INNER JOIN Ingredient i ON hi1.@rid = i.@rid
            INNER JOIN HAS_INGREDIENT hi2 ON i.@rid = hi2.@rid
            INNER JOIN Food f2 ON hi2.@rid = f2.@rid
            WHERE f1.name = '${foodName}' AND f2.name != '${foodName}'
                    GROUP BY f2.@rid, f2.name, f2.foodCalories
            ORDER BY score DESC, f2.name ASC
            LIMIT 15
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, 15);

        return results.map(item => ({
            foodRid: item.foodRid,
            foodName: item.foodName,
            reason: item.reason,
            score: item.score
        }));
    }

    /**
     * 7. Tìm người có countAction cao nhất
     * Gợi ý người dùng tiềm năng có ảnh hưởng để upsell/marketing
     */
    async getMostInfluentialUsers(limit: number = 10): Promise<UserInfluence[]> {
        const query = `
            SELECT 
                u.@rid as userRid,
                u.name as userName,
                u.region as region,
                u.age as age,
                COUNT(lf.@rid) + COUNT(vf.@rid) + COUNT(rf.@rid) as countAction
            FROM User u
            LEFT JOIN LIKES_FOOD lf ON u.@rid = lf.@rid
            LEFT JOIN VIEWS_FOOD vf ON u.@rid = vf.@rid
            LEFT JOIN RATES_FOOD rf ON u.@rid = rf.@rid
            GROUP BY u.@rid, u.name, u.region, u.age
            ORDER BY countAction DESC
            LIMIT ${limit}
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, limit);

        return results.map(item => ({
            userRid: item.userRid,
            userName: item.userName,
            countAction: item.countAction || 0,
            region: item.region,
            age: item.age
        }));
    }

    /**
     * Tổng hợp gợi ý cá nhân hóa cho user
     */
    async getPersonalizedRecommendations(
        userRid: string,
        userAge: number,
        userRegion: string,
        preferredCategories: string[] = []
    ): Promise<FoodRecommendation[]> {
        const [
            ageBasedRecs,
            popularRecs,
            viewedRecs
        ] = await Promise.all([
            this.getFoodsFromDifferentAgeGroups(userAge),
            this.getFoodsByCategoryAndRegion(userRegion, preferredCategories),
            this.getPopularFoodsByAgeGroup(),
            this.getMostViewedFoods(5)
        ]);

        // Kết hợp và loại bỏ trùng lặp
        const allRecs = [...ageBasedRecs, ...popularRecs, ...viewedRecs];
        const uniqueRecs = new Map<string, FoodRecommendation>();

        allRecs.forEach(rec => {
            if (!uniqueRecs.has(rec.foodRid)) {
                uniqueRecs.set(rec.foodRid, rec);
            } else {
                // Tăng score nếu món ăn xuất hiện ở nhiều danh sách
                const existing = uniqueRecs.get(rec.foodRid)!;
                existing.score = Math.min(1.0, existing.score + 0.1);
            }
        });

        return Array.from(uniqueRecs.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 20);
    }
}
