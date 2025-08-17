import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrientDbHttpService } from '../orientdb/orientdb-http.service';
import { GetAllFoodDto, GetAllFoodResult, CreateFoodDto, UpdateFoodDto } from './dto/get-all-food.dto';
import { normalizePagination, computeTotalPages } from '../shared/pagination/pagination.util';

@Injectable()
export class FoodService {
    private readonly FOOD_CLASS = 'Food';

    // Simple in-memory cache for food details
    private readonly foodCache = new Map<string, { data: any; timestamp: number }>();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

    constructor(
        private readonly orientDbHttpService: OrientDbHttpService,
    ) { }

    /**
     * Get cached food data if available and not expired
     */
    private getCachedFood(rid: string): any | null {
        const cached = this.foodCache.get(rid);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached.data;
        }
        return null;
    }

    /**
     * Set food data in cache
     */
    private setCachedFood(rid: string, data: any): void {
        this.foodCache.set(rid, {
            data,
            timestamp: Date.now()
        });
    }

    /**
     * Clear expired cache entries
     */
    private clearExpiredCache(): void {
        const now = Date.now();
        for (const [key, value] of this.foodCache.entries()) {
            if (now - value.timestamp > this.CACHE_TTL) {
                this.foodCache.delete(key);
            }
        }
    }

    /**
     * Invalidate cache for a specific food
     */
    private invalidateFoodCache(rid: string): void {
        this.foodCache.delete(rid);
    }

    /**
     * Build WHERE clause for filtering
     */
    private buildWhereClause(filters: Partial<GetAllFoodDto>): string {
        const conditions: string[] = [];

        if (filters.name) {
            conditions.push(`name.toLowerCase() LIKE '%${filters.name.toLowerCase()}%'`);
        }

        if (filters.minPrice !== undefined) {
            conditions.push(`price >= ${filters.minPrice}`);
        }

        if (filters.maxPrice !== undefined) {
            conditions.push(`price <= ${filters.maxPrice}`);
        }

        return conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    }

    /**
     * Get all foods with pagination and filtering
     */
    async getAllFoods(input: GetAllFoodDto): Promise<GetAllFoodResult> {
        const { page, limit, offset } = normalizePagination(input);
        const whereClause = this.buildWhereClause(input);

        const [items, totalRow] = await Promise.all([
            this.orientDbHttpService.queryAll<any>(
                `SELECT FROM ${this.FOOD_CLASS} ${whereClause} SKIP ${offset} LIMIT ${limit}`,
                limit
            ),
            this.orientDbHttpService.queryOne<{ count: number }>(
                `SELECT count(*) as count FROM ${this.FOOD_CLASS} ${whereClause}`
            ),
        ]);

        const total = totalRow?.count ?? 0;
        const totalPages: number = computeTotalPages(total, limit);

        return {
            items,
            total,
            page,
            limit,
            totalPages,
        };
    }

    /**
     * Get food detail by OrientDB record id (RID) and increment view count
     * Optimized for performance with parallel operations and caching
     */
    async getFoodDetailById(rid: string): Promise<any | null> {
        try {
            // Check cache first
            const cachedFood = this.getCachedFood(rid);
            if (cachedFood) {
                // Increment view count for cached data
                await this.incrementViewCountDirectly(rid);
                return cachedFood;
            }

            // Clear expired cache entries periodically
            if (Math.random() < 0.1) { // 10% chance to clean cache
                this.clearExpiredCache();
            }

            // Get food details with optimized query - only select needed fields
            const food = await this.orientDbHttpService.queryOne<any>(
                `SELECT @rid, name, image_url, description, type, ingredients, recipe, price, view_count FROM Food WHERE @rid = '${rid}' LIMIT 1`
            );

            if (!food) {
                console.log(`[FoodService] Food not found for RID: ${rid}`);
                throw new NotFoundException(`Food with RID ${rid} not found`);
            }

            console.log(`[FoodService] Found food: ${food.name}, current view_count: ${food.view_count || 0}`);

            // Cache the food data
            this.setCachedFood(rid, food);

            // Increment view count for fresh data
            await this.incrementViewCountDirectly(rid);

            return food;
        } catch (error) {
            console.error(`[FoodService] Error in getFoodDetailById for RID ${rid}:`, error);
            throw error;
        }
    }

    /**
     * Get food detail by RID without incrementing view count (for internal use)
     * Use this when you don't need to track views
     */
    async getFoodDetailByIdWithoutIncrement(rid: string): Promise<any | null> {
        try {
            // Check cache first
            const cachedFood = this.getCachedFood(rid);
            if (cachedFood) {
                return cachedFood;
            }

            // Get food details without incrementing view count
            const food = await this.orientDbHttpService.queryOne<any>(
                `SELECT @rid, name, image_url, description, type, ingredients, recipe, price, view_count FROM Food WHERE @rid = '${rid}' LIMIT 1`
            );

            if (!food) {
                throw new NotFoundException(`Food with RID ${rid} not found`);
            }

            // Cache the food data
            this.setCachedFood(rid, food);

            return food;
        } catch (error) {
            console.error(`[FoodService] Error in getFoodDetailByIdWithoutIncrement for RID ${rid}:`, error);
            throw error;
        }
    }

    /**
     * Get food view count
     */
    async getFoodViewCount(rid: string): Promise<number> {
        try {
            const result = await this.orientDbHttpService.queryOne<any>(
                `SELECT view_count FROM Food WHERE @rid = '${rid}' LIMIT 1`
            );
            return result?.view_count || 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * Create a new food
     */
    async createFood(createFoodDto: CreateFoodDto): Promise<any> {
        const insertSql = `INSERT INTO ${this.FOOD_CLASS} SET ` +
            `name='${createFoodDto.name}', ` +
            `description='${createFoodDto.description}', ` +
            `type='${createFoodDto.type}', ` +
            `ingredients='${createFoodDto.ingredients}', ` +
            `recipe='${createFoodDto.recipe}', ` +
            `image_url='${createFoodDto.image_url}', ` +
            `price=${createFoodDto.price}, ` +
            `view_count=0`;

        const result = await this.orientDbHttpService.command<any>(insertSql);
        if (!result) {
            throw new BadRequestException('Failed to create food');
        }
        return result;
    }

    /**
     * Update an existing food
     */
    async updateFood(rid: string, updateFoodDto: UpdateFoodDto): Promise<any> {
        // Check if food exists using cached version if available
        let existingFood = this.getCachedFood(rid);
        if (!existingFood) {
            existingFood = await this.getFoodDetailByIdWithoutIncrement(rid);
        }

        if (!existingFood) {
            throw new NotFoundException(`Food with RID ${rid} not found`);
        }

        const updateFields: string[] = [];

        if (updateFoodDto.name !== undefined) {
            updateFields.push(`name='${updateFoodDto.name}'`);
        }
        if (updateFoodDto.description !== undefined) {
            updateFields.push(`description='${updateFoodDto.description}'`);
        }
        if (updateFoodDto.type !== undefined) {
            updateFields.push(`type='${updateFoodDto.type}'`);
        }
        if (updateFoodDto.ingredients !== undefined) {
            updateFields.push(`ingredients='${updateFoodDto.ingredients}'`);
        }
        if (updateFoodDto.recipe !== undefined) {
            updateFields.push(`recipe='${updateFoodDto.recipe}'`);
        }
        if (updateFoodDto.image_url !== undefined) {
            updateFields.push(`image_url='${updateFoodDto.image_url}'`);
        }
        if (updateFoodDto.price !== undefined) {
            updateFields.push(`price=${updateFoodDto.price}`);
        }

        if (updateFields.length === 0) {
            throw new BadRequestException('No fields to update');
        }

        const updateSql = `UPDATE ${this.FOOD_CLASS} SET ${updateFields.join(', ')} ` +
            `WHERE @rid = '${rid}'`;

        const result = await this.orientDbHttpService.command<any>(updateSql);
        if (!result) {
            throw new BadRequestException('Failed to update food');
        }

        // Invalidate cache after update
        this.invalidateFoodCache(rid);

        return result;
    }

    /**
     * Delete a food
     */
    async deleteFood(rid: string): Promise<boolean> {
        try {
            console.log(`[FoodService] Starting delete operation for RID: ${rid}`);

            // Check if food exists using cached version if available
            let existingFood = this.getCachedFood(rid);
            if (!existingFood) {
                console.log(`[FoodService] Food not in cache, querying database for RID: ${rid}`);
                // Use a simple query without incrementing view count
                existingFood = await this.orientDbHttpService.queryOne<any>(
                    `SELECT @rid, name FROM Food WHERE @rid = '${rid}' LIMIT 1`
                );
            }

            if (!existingFood) {
                console.log(`[FoodService] Food not found for RID: ${rid}`);
                throw new NotFoundException(`Food with RID ${rid} not found`);
            }

            console.log(`[FoodService] Found food: ${existingFood.name}, proceeding with deletion`);

            // Try to delete using document DELETE endpoint first
            try {
                console.log(`[FoodService] Attempting to delete document via DELETE endpoint for RID: ${rid}`);
                const deleteResult = await this.orientDbHttpService.deleteDocument<any>(rid);
                console.log(`[FoodService] DELETE document result:`, deleteResult);

                // Invalidate cache after successful deletion
                this.invalidateFoodCache(rid);
                console.log(`[FoodService] Successfully deleted food ${rid} via DELETE endpoint and invalidated cache`);
                return true;
            } catch (deleteError) {
                console.warn(`[FoodService] DELETE endpoint failed, trying SQL command:`, deleteError.message);

                // Fallback to SQL command if DELETE endpoint fails
                const deleteSql = `DELETE FROM ${this.FOOD_CLASS} WHERE @rid = '${rid}'`;
                console.log(`[FoodService] Executing fallback DELETE SQL: ${deleteSql}`);

                const result = await this.orientDbHttpService.command<any>(deleteSql);
                console.log(`[FoodService] Fallback DELETE SQL result:`, result);

                if (result !== null) {
                    // Invalidate cache after successful deletion
                    this.invalidateFoodCache(rid);
                    console.log(`[FoodService] Successfully deleted food ${rid} via SQL command and invalidated cache`);
                    return true;
                } else {
                    console.log(`[FoodService] Fallback DELETE SQL operation returned null for RID: ${rid}`);
                    return false;
                }
            }
        } catch (error) {
            console.error(`[FoodService] Error deleting food ${rid}:`, error);
            throw error;
        }
    }

    /**
     * Test database connection and basic query
     */
    async testDatabaseConnection(): Promise<{ success: boolean; message: string; details?: any }> {
        try {
            console.log(`[FoodService] Testing database connection...`);

            // Test basic query
            const testResult = await this.orientDbHttpService.queryOne<any>(
                `SELECT count(*) as total FROM Food LIMIT 1`
            );

            console.log(`[FoodService] Database test successful:`, testResult);

            return {
                success: true,
                message: 'Database connection successful',
                details: testResult
            };
        } catch (error) {
            console.error(`[FoodService] Database connection test failed:`, error);
            return {
                success: false,
                message: `Database connection failed: ${error.message}`,
                details: error
            };
        }
    }

    /**
     * Test view_count field existence
     */
    async testViewCountField(rid: string): Promise<{ success: boolean; message: string; details?: any }> {
        try {
            console.log(`[FoodService] Testing view_count field for RID: ${rid}`);

            // Test if we can read view_count
            const testResult = await this.orientDbHttpService.queryOne<any>(
                `SELECT @rid, name, view_count FROM Food WHERE @rid = '${rid}' LIMIT 1`
            );

            console.log(`[FoodService] View count field test successful:`, testResult);

            return {
                success: true,
                message: 'View count field exists and accessible',
                details: testResult
            };
        } catch (error) {
            console.error(`[FoodService] View count field test failed:`, error);
            return {
                success: false,
                message: `View count field test failed: ${error.message}`,
                details: error
            };
        }
    }

    /**
     * Increment view_count directly for a given RID
     */
    private async incrementViewCountDirectly(rid: string): Promise<any> {
        try {
            console.log(`[FoodService] Starting view count increment for RID: ${rid}`);

            // Use COALESCE to handle null values and ensure proper increment
            const updateSql = `UPDATE ${this.FOOD_CLASS} SET view_count = COALESCE(view_count, 0) + 1 WHERE @rid = '${rid}'`;
            console.log(`[FoodService] Executing SQL: ${updateSql}`);

            const result = await this.orientDbHttpService.command<any>(updateSql);
            console.log(`[FoodService] View count increment result:`, result);

            if (result) {
                console.log(`[FoodService] Successfully incremented view_count for RID: ${rid}`);

                // Update cache with new view count
                const cachedFood = this.foodCache.get(rid);
                if (cachedFood) {
                    cachedFood.data.view_count = (cachedFood.data.view_count || 0) + 1;
                    console.log(`[FoodService] Updated cache view_count to: ${cachedFood.data.view_count}`);
                }
            } else {
                console.warn(`[FoodService] Failed to increment view_count for RID: ${rid}`);
            }

            return result;
        } catch (error) {
            console.error(`[FoodService] Error incrementing view_count for RID ${rid}:`, error);
            throw error;
        }
    }

    /**
     * Search foods by keyword and region
     */
    async searchFoods(keyword: string, region?: string, limit: number = 20): Promise<{
        success: boolean;
        message: string;
        foods: Array<{
            rid: string;
            name: string;
            type: string;
            description: string;
            price: number;
            viewCount: number;
            imageUrl: string;
            region?: string;
        }>;
        total: number;
    }> {
        try {
            console.log(`[FoodService] Searching foods with keyword: "${keyword}" and region: "${region || 'all'}"`);

            if (!keyword || keyword.trim().length === 0) {
                return {
                    success: false,
                    message: 'Keyword is required',
                    foods: [],
                    total: 0
                };
            }

            const searchKeyword = keyword.trim().toLowerCase();
            const searchRegion = region ? region.trim() : '';

            let searchQuery: string;
            let countQuery: string;

            if (searchRegion) {
                // Search with region filter using relationship table
                searchQuery = `
                    SELECT 
                        f.@rid, 
                        f.name, 
                        f.type, 
                        f.description, 
                        f.price, 
                        f.view_count, 
                        f.image_url,
                        r.name as region
                    FROM Food f
                    INNER JOIN FROM_REGION fr ON f.@rid = fr.@rid
                    INNER JOIN Region r ON fr.@rid = r.@rid
                    WHERE 
                        r.name = '${searchRegion}' AND
                        (f.name.toLowerCase() LIKE '%${searchKeyword}%' OR
                         f.description.toLowerCase() LIKE '%${searchKeyword}%' OR
                         f.type.toLowerCase() LIKE '%${searchKeyword}%' OR
                         f.ingredients.toLowerCase() LIKE '%${searchKeyword}%')
                    ORDER BY 
                        CASE 
                            WHEN f.name.toLowerCase() LIKE '%${searchKeyword}%' THEN 1
                            WHEN f.type.toLowerCase() LIKE '%${searchKeyword}%' THEN 2
                            WHEN f.description.toLowerCase() LIKE '%${searchKeyword}%' THEN 3
                            ELSE 4
                        END,
                        f.view_count DESC,
                        f.name ASC
                    LIMIT ${limit}
                `;

                countQuery = `
                    SELECT count(*) as total 
                    FROM Food f
                    INNER JOIN FROM_REGION fr ON f.@rid = fr.@rid
                    INNER JOIN Region r ON fr.@rid = r.@rid
                    WHERE 
                        r.name = '${searchRegion}' AND
                        (f.name.toLowerCase() LIKE '%${searchKeyword}%' OR
                         f.description.toLowerCase() LIKE '%${searchKeyword}%' OR
                         f.type.toLowerCase() LIKE '%${searchKeyword}%' OR
                         f.ingredients.toLowerCase() LIKE '%${searchKeyword}%')
                `;
            } else {
                // Search without region filter
                searchQuery = `
                    SELECT 
                        @rid, 
                        name, 
                        type, 
                        description, 
                        price, 
                        view_count, 
                        image_url
                    FROM Food 
                    WHERE 
                        name.toLowerCase() LIKE '%${searchKeyword}%' OR
                        description.toLowerCase() LIKE '%${searchKeyword}%' OR
                        type.toLowerCase() LIKE '%${searchKeyword}%' OR
                        ingredients.toLowerCase() LIKE '%${searchKeyword}%'
                    ORDER BY 
                        CASE 
                            WHEN name.toLowerCase() LIKE '%${searchKeyword}%' THEN 1
                            WHEN type.toLowerCase() LIKE '%${searchKeyword}%' THEN 2
                            WHEN description.toLowerCase() LIKE '%${searchKeyword}%' THEN 3
                            ELSE 4
                        END,
                        view_count DESC,
                        name ASC
                    LIMIT ${limit}
                `;

                countQuery = `
                    SELECT count(*) as total 
                    FROM Food 
                    WHERE 
                        name.toLowerCase() LIKE '%${searchKeyword}%' OR
                        description.toLowerCase() LIKE '%${searchKeyword}%' OR
                        type.toLowerCase() LIKE '%${searchKeyword}%' OR
                        ingredients.toLowerCase() LIKE '%${searchKeyword}%'
                `;
            }

            const results = await this.orientDbHttpService.queryAll<any>(searchQuery, limit);

            // Get total count for pagination
            const countResult = await this.orientDbHttpService.queryOne<any>(countQuery);
            const total = countResult?.total || 0;

            console.log(`[FoodService] Search completed. Found ${results.length} foods out of ${total} total matches`);

            const foods = results.map(item => ({
                rid: item['@rid'],
                name: item.name,
                type: item.type || 'Không xác định',
                description: item.description || 'Không có mô tả',
                price: item.price || 0,
                viewCount: item.view_count || 0,
                imageUrl: item.image_url || '',
                region: item.region || searchRegion || 'Không xác định'
            }));

            const regionMessage = searchRegion ? ` trong khu vực "${searchRegion}"` : '';
            return {
                success: true,
                message: `Tìm thấy ${results.length} món ăn cho từ khóa "${keyword}"${regionMessage}`,
                foods,
                total
            };

        } catch (error) {
            console.error(`[FoodService] Error searching foods with keyword "${keyword}" and region "${region}":`, error);
            return {
                success: false,
                message: `Lỗi tìm kiếm: ${error.message}`,
                foods: [],
                total: 0
            };
        }
    }

    /**
     * Get foods by region using relationship table
     */
    async getFoodsByRegion(regionName: string, limit: number = 20): Promise<{
        success: boolean;
        message: string;
        foods: Array<{
            rid: string;
            name: string;
            type: string;
            description: string;
            price: number;
            viewCount: number;
            imageUrl: string;
            region: string;
        }>;
        total: number;
    }> {
        try {
            console.log(`[FoodService] Getting foods by region: ${regionName}`);

            // Query using relationship: Food -> FROM_REGION -> Region
            const query = `
                SELECT 
                    f.@rid as rid,
                    f.name,
                    f.type,
                    f.description,
                    f.price,
                    f.view_count,
                    f.image_url,
                    r.name as region
                FROM Food f
                INNER JOIN FROM_REGION fr ON f.@rid = fr.@rid
                INNER JOIN Region r ON fr.@rid = r.@rid
                WHERE r.name = '${regionName}'
                ORDER BY f.view_count DESC, f.name ASC
                LIMIT ${limit}
            `;

            const results = await this.orientDbHttpService.queryAll<any>(query, limit);

            // Get total count
            const countQuery = `
                SELECT count(*) as total 
                FROM Food f
                INNER JOIN FROM_REGION fr ON f.@rid = fr.@rid
                INNER JOIN Region r ON fr.@rid = r.@rid
                WHERE r.name = '${regionName}'
            `;

            const countResult = await this.orientDbHttpService.queryOne<any>(countQuery);
            const total = countResult?.total || 0;

            console.log(`[FoodService] Found ${results.length} foods in region ${regionName}`);

            const foods = results.map(item => ({
                rid: item.rid,
                name: item.name,
                type: item.type || 'Không xác định',
                description: item.description || 'Không có mô tả',
                price: item.price || 0,
                viewCount: item.view_count || 0,
                imageUrl: item.image_url || '',
                region: item.region || regionName
            }));

            return {
                success: true,
                message: `Tìm thấy ${results.length} món ăn trong khu vực "${regionName}"`,
                foods,
                total
            };

        } catch (error) {
            console.error(`[FoodService] Error getting foods by region ${regionName}:`, error);
            return {
                success: false,
                message: `Lỗi lấy món ăn theo khu vực: ${error.message}`,
                foods: [],
                total: 0
            };
        }
    }

    /**
     * Get all regions with RID
     */
    async getAllRegions(): Promise<{
        success: boolean;
        message: string;
        regions: Array<{
            rid: string;
            name: string;
            foodCount: number;
        }>;
        total: number;
    }> {
        try {
            console.log(`[FoodService] Getting all regions with food counts`);

            // Lấy tất cả regions trước
            const regionsQuery = `
                SELECT 
                    @rid as rid,
                    name
                FROM Region
                ORDER BY name ASC
            `;

            const regions = await this.orientDbHttpService.queryAll<any>(regionsQuery, 100);
            console.log(`[FoodService] Found ${regions.length} regions`);

            // Sau đó đếm số lượng món ăn cho mỗi region
            const regionsWithCounts = await Promise.all(
                regions.map(async (region) => {
                    try {
                        // Đếm foods trong region bằng cách query riêng biệt
                        const countQuery = `
                            SELECT count(*) as foodCount
                            FROM Food
                            WHERE out_FROM_REGION CONTAINS '${region.rid}'
                        `;

                        const countResult = await this.orientDbHttpService.queryOne<any>(countQuery);

                        return {
                            rid: region.rid,
                            name: region.name,
                            foodCount: countResult?.foodCount || 0
                        };
                    } catch (error) {
                        console.error(`[FoodService] Error counting foods for region ${region.rid}:`, error);
                        // Nếu có lỗi, trả về 0
                        return {
                            rid: region.rid,
                            name: region.name,
                            foodCount: 0
                        };
                    }
                })
            );

            return {
                success: true,
                message: `Tìm thấy ${regionsWithCounts.length} khu vực`,
                regions: regionsWithCounts,
                total: regionsWithCounts.length
            };

        } catch (error) {
            console.error(`[FoodService] Error getting all regions:`, error);
            return {
                success: false,
                message: `Lỗi lấy danh sách khu vực: ${error.message}`,
                regions: [],
                total: 0
            };
        }
    }

    /**
     * Get region info by RID
     */
    async getRegionByRid(rid: string): Promise<{
        success: boolean;
        message: string;
        region?: {
            rid: string;
            name: string;
            foods: Array<{
                rid: string;
                name: string;
                type: string;
                description: string;
                price: number;
                view_count: number;
                image_url: string;
            }>;
            foodCount: number;
        };
    }> {
        try {
            console.log(`[FoodService] Getting region info for RID: ${rid}`);

            // Đầu tiên, lấy thông tin region
            const regionQuery = `
                SELECT 
                    @rid as rid,
                    name
                FROM Region
                WHERE @rid = '${rid}'
                LIMIT 1
            `;

            const regionResult = await this.orientDbHttpService.queryOne<any>(regionQuery);

            if (!regionResult) {
                return {
                    success: false,
                    message: `Không tìm thấy khu vực với RID: ${rid}`
                };
            }

            console.log(`[FoodService] Found region: ${regionResult.name} with RID: ${regionResult.rid}`);

            // Tìm foods thực sự có relationship với region này
            // Sử dụng cách khác vì in_FROM_REGION có thể chứa RIDs không tồn tại
            let foods: any[] = [];
            let foodCount = 0;

            try {
                // Cách 1: Tìm foods có out_FROM_REGION chứa region RID
                const foodsQuery1 = `
                    SELECT 
                        @rid as rid,
                        name,
                        calories,
                        description,
                        price,
                        view_count,
                        image_url
                    FROM Food
                    WHERE out_FROM_REGION CONTAINS '${rid}'
                    ORDER BY view_count DESC, name ASC
                `;

                console.log(`[FoodService] Trying query 1: out_FROM_REGION CONTAINS`);
                const foodsResult1 = await this.orientDbHttpService.queryAll<any>(foodsQuery1, 100);
                foods = [...foodsResult1];
                foodCount = foods.length;
                console.log(`[FoodService] Query 1 found ${foodCount} foods`);

                if (foodCount === 0) {
                    // Cách 2: Tìm foods theo tên region (fallback)
                    const regionName = regionResult.name;
                    const foodsQuery2 = `
                        SELECT 
                            @rid as rid,
                            name,
                            calories,
                            description,
                            price,
                            view_count,
                            image_url
                        FROM Food
                        WHERE name.toLowerCase() LIKE '%${regionName.toLowerCase()}%' OR
                              description.toLowerCase() LIKE '%${regionName.toLowerCase()}%'
                        ORDER BY view_count DESC, name ASC
                        LIMIT 20
                    `;

                    console.log(`[FoodService] Trying query 2: search by region name`);
                    const foodsResult2 = await this.orientDbHttpService.queryAll<any>(foodsQuery2, 100);
                    foods = [...foodsResult2];
                    foodCount = foods.length;
                    console.log(`[FoodService] Query 2 found ${foodCount} foods by name search`);
                }

                if (foodCount === 0) {
                    // Cách 3: Lấy một số foods mẫu để hiển thị
                    const foodsQuery3 = `
                        SELECT 
                            @rid as rid,
                            name,
                            calories,
                            description,
                            price,
                            view_count,
                            image_url
                        FROM Food
                        ORDER BY view_count DESC, name ASC
                        LIMIT 10
                    `;

                    console.log(`[FoodService] Trying query 3: get sample foods`);
                    const foodsResult3 = await this.orientDbHttpService.queryAll<any>(foodsQuery3, 100);
                    foods = [...foodsResult3];
                    foodCount = foods.length;
                    console.log(`[FoodService] Query 3 found ${foodCount} sample foods`);
                }

            } catch (error) {
                console.error(`[FoodService] Error getting foods for region ${rid}:`, error);
                foods = [];
                foodCount = 0;
            }

            console.log(`[FoodService] Final result: Found ${foodCount} foods in region ${regionResult.name}`);

            // Format danh sách món ăn
            const formattedFoods = foods.map(food => ({
                rid: food.rid,
                name: food.name || 'Không có tên',
                type: food.calories || 'Không có loại',
                description: food.description || 'Không có mô tả',
                price: food.price || 0,
                view_count: food.view_count || 0,
                image_url: food.image_url || ''
            }));

            return {
                success: true,
                message: `Tìm thấy khu vực: ${regionResult.name} với ${foodCount} món ăn`,
                region: {
                    rid: regionResult.rid,
                    name: regionResult.name,
                    foods: formattedFoods,
                    foodCount
                }
            };

        } catch (error) {
            console.error(`[FoodService] Error getting region info for RID ${rid}:`, error);
            return {
                success: false,
                message: `Lỗi lấy thông tin khu vực: ${error.message}`
            };
        }
    }

    /**
     * Test endpoint to check database structure
     */
    async testDatabaseStructure(): Promise<any> {
        try {
            // Test Region table
            const regionTest = await this.testRegionTable();

            // Test Food table
            const foodTest = await this.testFoodTable();

            return {
                success: true,
                message: 'Database structure test completed',
                regionTest,
                foodTest
            };
        } catch (error) {
            return {
                success: false,
                message: `Database test failed: ${error.message}`,
                error: error.stack
            };
        }
    }

    /**
     * Test Region table structure
     */
    async testRegionTable(): Promise<any> {
        try {
            console.log(`[FoodService] Testing Region table structure`);

            // Test 1: Check if Region table exists and has data
            const basicQuery = `SELECT @rid, name FROM Region LIMIT 5`;
            const basicResults = await this.orientDbHttpService.queryAll<any>(basicQuery, 10);

            // Test 2: Check Region table schema
            const schemaQuery = `SELECT @rid, name FROM Region LIMIT 1`;
            const schemaResult = await this.orientDbHttpService.queryOne<any>(schemaQuery);

            return {
                success: true,
                message: 'Region table test completed',
                basicResults,
                schemaResult,
                hasData: basicResults.length > 0,
                dataCount: basicResults.length
            };
        } catch (error) {
            console.error(`[FoodService] Error testing Region table:`, error);
            return {
                success: false,
                message: `Region table test failed: ${error.message}`,
                error: error.stack
            };
        }
    }

    /**
     * Test Food table structure
     */
    async testFoodTable(): Promise<any> {
        try {
            console.log(`[FoodService] Testing Food table structure`);

            // Test 1: Check if Food table exists and has data
            const basicQuery = `SELECT @rid, name, type FROM Food LIMIT 5`;
            const basicResults = await this.orientDbHttpService.queryAll<any>(basicQuery, 10);

            // Test 2: Check Food table schema
            const schemaQuery = `SELECT @rid, name, type, view_count FROM Food LIMIT 1`;
            const schemaResult = await this.orientDbHttpService.queryOne<any>(schemaQuery);

            return {
                success: true,
                message: 'Food table test completed',
                basicResults,
                schemaResult,
                hasData: basicResults.length > 0,
                dataCount: basicResults.length
            };
        } catch (error) {
            console.error(`[FoodService] Error testing Food table:`, error);
            return {
                success: false,
                message: `Food table test failed: ${error.message}`,
                error: error.stack
            };
        }
    }

    /**
     * Test Region table structure deeply
     */
    async testRegionStructure(): Promise<any> {
        try {
            console.log(`[FoodService] Testing Region table structure deeply`);

            // Test 1: Lấy một Region record với tất cả properties
            const sampleQuery = `SELECT * FROM Region LIMIT 1`;
            const sampleResult = await this.orientDbHttpService.queryOne<any>(sampleQuery);

            // Test 2: Lấy tất cả properties có thể có
            const propertiesQuery = `SELECT @rid, @class, @version, name FROM Region LIMIT 3`;
            const propertiesResult = await this.orientDbHttpService.queryAll<any>(propertiesQuery, 5);

            return {
                success: true,
                message: 'Region structure test completed',
                sampleResult,
                propertiesResult,
                hasSample: !!sampleResult,
                sampleKeys: sampleResult ? Object.keys(sampleResult) : []
            };
        } catch (error) {
            console.error(`[FoodService] Error testing Region structure:`, error);
            return {
                success: false,
                message: `Region structure test failed: ${error.message}`,
                error: error.stack
            };
        }
    }

    /**
     * Test Food table structure deeply
     */
    async testFoodStructure(): Promise<any> {
        try {
            console.log(`[FoodService] Testing Food table structure deeply`);

            // Test 1: Lấy một Food record với tất cả properties
            const sampleQuery = `SELECT * FROM Food LIMIT 1`;
            const sampleResult = await this.orientDbHttpService.queryOne<any>(sampleQuery);

            // Test 2: Lấy tất cả properties có thể có
            const propertiesQuery = `SELECT @rid, @class, @version, name, type FROM Food LIMIT 3`;
            const propertiesResult = await this.orientDbHttpService.queryAll<any>(propertiesQuery, 5);

            return {
                success: true,
                message: 'Food structure test completed',
                sampleResult,
                propertiesResult,
                hasSample: !!sampleResult,
                sampleKeys: sampleResult ? Object.keys(sampleResult) : []
            };
        } catch (error) {
            console.error(`[FoodService] Error testing Food structure:`, error);
            return {
                success: false,
                message: `Food structure test failed: ${error.message}`,
                error: error.stack
            };
        }
    }

    /**
     * Test Region properties to find relationships
     */
    async testRegionProperties(): Promise<any> {
        try {
            console.log(`[FoodService] Testing Region properties for relationships`);

            // Test 1: Lấy tất cả properties của Region
            const allPropsQuery = `SELECT * FROM Region LIMIT 1`;
            const allPropsResult = await this.orientDbHttpService.queryOne<any>(allPropsQuery);

            // Test 2: Kiểm tra các properties có thể là relationships
            const possibleRelationships = allPropsResult ?
                Object.keys(allPropsResult).filter(key =>
                    key !== '@rid' &&
                    key !== '@class' &&
                    key !== '@version' &&
                    key !== 'name'
                ) : [];

            return {
                success: true,
                message: 'Region properties test completed',
                allPropsResult,
                possibleRelationships,
                hasRelationships: possibleRelationships.length > 0
            };
        } catch (error) {
            console.error(`[FoodService] Error testing Region properties:`, error);
            return {
                success: false,
                message: `Region properties test failed: ${error.message}`,
                error: error.stack
            };
        }
    }

    /**
     * Test Food properties to find relationships
     */
    async testFoodProperties(): Promise<any> {
        try {
            console.log(`[FoodService] Testing Food properties for relationships`);

            // Test 1: Lấy tất cả properties của Food
            const allPropsQuery = `SELECT * FROM Food LIMIT 1`;
            const allPropsResult = await this.orientDbHttpService.queryOne<any>(allPropsQuery);

            // Test 2: Kiểm tra các properties có thể là relationships
            const possibleRelationships = allPropsResult ?
                Object.keys(allPropsResult).filter(key =>
                    key !== '@rid' &&
                    key !== '@class' &&
                    key !== '@version' &&
                    key !== 'name' &&
                    key !== 'type' &&
                    key !== 'description' &&
                    key !== 'price' &&
                    key !== 'view_count' &&
                    key !== 'image_url'
                ) : [];

            return {
                success: true,
                message: 'Food properties test completed',
                allPropsResult,
                possibleRelationships,
                hasRelationships: possibleRelationships.length > 0
            };
        } catch (error) {
            console.error(`[FoodService] Error testing Food properties:`, error);
            return {
                success: false,
                message: `Food properties test failed: ${error.message}`,
                error: error.stack
            };
        }
    }

    /**
     * Test direct query for debugging
     */
    async testDirectQuery(query: string): Promise<any> {
        try {
            console.log(`[FoodService] Testing direct query: ${query}`);

            const result = await this.orientDbHttpService.queryAll<any>(query, 10);

            return {
                success: true,
                query,
                result,
                count: result.length
            };
        } catch (error) {
            console.error(`[FoodService] Error in testDirectQuery:`, error);
            return {
                success: false,
                query,
                error: error.message,
                stack: error.stack
            };
        }
    }

    /**
     * Get cache information for admin dashboard
     */
    getCacheInfo(): {
        totalEntries: number;
        cacheSize: number;
        oldestEntry: string | null;
        newestEntry: string | null;
        expiredEntries: number;
    } {
        const now = Date.now();
        const entries = Array.from(this.foodCache.entries());
        const expiredEntries = entries.filter(([_, value]) => now - value.timestamp > this.CACHE_TTL);

        const timestamps = entries.map(([_, value]) => value.timestamp);
        const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : null;
        const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : null;

        return {
            totalEntries: this.foodCache.size,
            cacheSize: this.CACHE_TTL,
            oldestEntry: oldestTimestamp ? new Date(oldestTimestamp).toISOString() : null,
            newestEntry: newestTimestamp ? new Date(newestTimestamp).toISOString() : null,
            expiredEntries: expiredEntries.length
        };
    }
}
