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
                // Try to increment view count, but don't fail if it doesn't work
                try {
                    await this.incrementViewCountDirectly(rid);
                } catch (viewError) {
                    console.warn(`[FoodService] Failed to increment view count for cached food ${rid}:`, viewError);
                    // Continue with cached data even if view count update fails
                }
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

            // Try to increment view count, but don't fail if it doesn't work
            try {
                await this.incrementViewCountDirectly(rid);
            } catch (viewError) {
                console.warn(`[FoodService] Failed to increment view count for food ${rid}:`, viewError);
                // Continue with food data even if view count update fails
            }

            return food;
        } catch (error) {
            console.error(`[FoodService] Error in getFoodDetailById for RID ${rid}:`, error);
            throw error;
        }
    }

    /**
     * Increment view count directly and synchronously
     */
    private async incrementViewCountDirectly(rid: string): Promise<void> {
        try {
            console.log(`[FoodService] Starting view count increment for RID: ${rid}`);

            // Use COALESCE to handle null values and ensure proper increment
            const updateViewCountSql = `
                UPDATE Food 
                SET view_count = COALESCE(view_count, 0) + 1
                WHERE @rid = '${rid}'
            `;

            console.log(`[FoodService] Executing SQL: ${updateViewCountSql}`);

            // Execute synchronously to ensure view count is updated
            const result = await this.orientDbHttpService.command<any>(updateViewCountSql);
            console.log(`[FoodService] View count increment successful for RID: ${rid}, result:`, result);

            // Update cache with new view count
            const cachedFood = this.foodCache.get(rid);
            if (cachedFood) {
                cachedFood.data.view_count = (cachedFood.data.view_count || 0) + 1;
                console.log(`[FoodService] Updated cache view_count to: ${cachedFood.data.view_count}`);
            }

            console.log(`[FoodService] View count increment completed successfully for RID: ${rid}`);
        } catch (error) {
            console.error(`[FoodService] Failed to increment view count for food ${rid}:`, error);
            console.error(`[FoodService] Error details:`, {
                message: error.message,
                stack: error.stack,
                rid: rid
            });
            throw error; // Re-throw to fail the main request if view count update fails
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
            existingFood = await this.getFoodDetailById(rid);
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
        // Check if food exists using cached version if available
        let existingFood = this.getCachedFood(rid);
        if (!existingFood) {
            existingFood = await this.getFoodDetailById(rid);
        }

        if (!existingFood) {
            throw new NotFoundException(`Food with RID ${rid} not found`);
        }

        const deleteSql = `DELETE FROM ${this.FOOD_CLASS} WHERE @rid = '${rid}'`;

        const result = await this.orientDbHttpService.command<any>(deleteSql);

        if (result !== null) {
            // Invalidate cache after successful deletion
            this.invalidateFoodCache(rid);
            return true;
        }

        return false;
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
}
