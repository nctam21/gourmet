import { Injectable } from '@nestjs/common';
import { OrientDbHttpService } from '../orientdb/orientdb-http.service';

export interface FoodRecommendation {
    foodRid: string;
    foodName: string;
    reason: string;
    score: number;
}

export interface FoodStatistics {
    foodCalories: string;
    totalLikes: number;
    totalViews: number;
    averageRating: number;
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
        const query = `
            SELECT 
                f.@rid as foodRid,
                f.name as foodName,
                u.age as userAge,
                'Gợi ý từ lứa tuổi ' + u.age as reason,
                CASE 
                    WHEN ABS(u.age - ${userAge}) <= 5 THEN 0.8
                    WHEN ABS(u.age - ${userAge}) <= 10 THEN 0.6
                    ELSE 0.4
                END as score
            FROM Food f
            INNER JOIN LIKES_FOOD lf ON f.@rid = lf.@rid
            INNER JOIN User u ON lf.@rid = u.@rid
            WHERE u.age != ${userAge}
            ORDER BY score DESC, u.age ASC
            LIMIT 20
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, 20);

        return results.map(item => ({
            foodRid: item.foodRid,
            foodName: item.foodName,
            reason: item.reason,
            score: item.score
        }));
    }

    /**
     * 2. Gợi ý món ăn cùng loại với những món khác khu vực
     * Hệ thống gợi ý theo nhóm thể loại ẩm thực yêu thích
     */
    async getFoodsByCategoryAndRegion(userRegion: string, preferredCategories: string[]): Promise<FoodRecommendation[]> {
        const categories = preferredCategories.map(cat => `'${cat}'`).join(',');

        const query = `
            SELECT 
                f.@rid as foodRid,
                f.name as foodName,
                f.calories as foodCalories,
                'Món ' + f.calories + ' từ ' + r.name as reason,
                CASE 
                    WHEN r.name = '${userRegion}' THEN 1.0
                    ELSE 0.7
                END as score
            FROM Food f
            INNER JOIN FROM_REGION fr ON f.@rid = fr.@rid
            INNER JOIN Region r ON fr.@rid = r.@rid
            WHERE f.calories IN [${categories}]
            ORDER BY score DESC, f.name ASC
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
     * 3. Tìm những món ăn có lượt xem cao nhất
     * Xác định món ăn được quan tâm nhất để phân tích xu hướng
     */
    async getMostViewedFoods(limit: number = 10): Promise<FoodRecommendation[]> {
        const query = `
            SELECT 
                f.@rid as foodRid,
                f.name as foodName,
                f.calories as foodCalories,
                'Lượt xem cao nhất' as reason,
                COALESCE(f.view_count, 0) as viewCount
            FROM Food f
            ORDER BY viewCount DESC
            LIMIT ${limit}
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, limit);

        return results.map((item, index) => ({
            foodRid: item.foodRid,
            foodName: item.foodName,
            reason: `${item.reason} - Top ${index + 1}`,
            score: 1.0 - (index * 0.1) // Giảm score theo thứ tự
        }));
    }

    /**
     * 4. Thống kê số lượt thích theo từng loại món ăn
     * Giúp hệ thống đánh giá mức độ phổ biến của các loại
     */
    async getFoodTypeStatistics() {
        const query = `
            SELECT 
                f.calories as foodCalories,
                COUNT(lf.@rid) as totalLikes,
                COALESCE(f.view_count, 0) as totalViews,
                AVG(r.rating) as averageRating
            FROM Food f
            LEFT JOIN LIKES_FOOD lf ON f.@rid = lf.@rid
            LEFT JOIN RATES_FOOD rf ON f.@rid = rf.@rid
            LEFT JOIN Rating r ON rf.@rid = r.@rid
            GROUP BY f.calories, f.view_count
            ORDER BY totalLikes DESC
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, 50);

        return results.map(item => ({
            foodCalories: item.foodCalories,
            totalLikes: item.totalLikes || 0,
            totalViews: item.totalViews || 0,
            averageRating: item.averageRating || 0
        }));
    }

    /**
     * 5. Liệt kê danh sách món ăn có số lượng người dùng cao (độ tuổi)
     * Hiển thị đề xuất món ăn để gợi ý cho phần lớn người dùng app
     */
    async getPopularFoodsByAgeGroup(): Promise<FoodRecommendation[]> {
        const query = `
            SELECT 
                f.@rid as foodRid,
                f.name as foodName,
                f.calories as foodCalories,
                'Phổ biến với ' + COUNT(DISTINCT u.@rid) + ' người dùng' as reason,
                COUNT(DISTINCT u.@rid) as userCount
            FROM Food f
            INNER JOIN LIKES_FOOD lf ON f.@rid = lf.@rid
            INNER JOIN User u ON lf.@rid = u.@rid
            GROUP BY f.@rid, f.name, f.calories
            ORDER BY userCount DESC
            LIMIT 20
        `;

        const results = await this.orientDbHttpService.queryAll<any>(query, 20);

        return results.map((item, index) => ({
            foodRid: item.foodRid,
            foodName: item.foodName,
            reason: item.reason,
            score: 1.0 - (index * 0.05) // Giảm score ít hơn vì đây là top phổ biến
        }));
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
