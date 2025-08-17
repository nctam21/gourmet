import { Injectable } from '@nestjs/common';
import { OrientDbHttpService } from '../orientdb/orientdb-http.service';

@Injectable()
export class FoodViewService {
    constructor(
        private readonly orientDbHttpService: OrientDbHttpService,
    ) { }

    /**
     * Increment view count for a food item
     * This method is optimized for performance and can be called independently
     */
    async incrementViewCount(rid: string): Promise<void> {
        try {
            // Use a single optimized query to increment view count
            const updateSql = `
                UPDATE Food 
                SET view_count = COALESCE(view_count, 0) + 1 
                WHERE @rid = '${rid}'
            `;

            // Execute asynchronously without waiting for response
            this.orientDbHttpService.command<any>(updateSql).catch(error => {
                console.warn(`Failed to increment view count for food ${rid}:`, error);
            });
        } catch (error) {
            console.warn(`Failed to prepare view count update for food ${rid}:`, error);
        }
    }

    /**
     * Get view count for a food item
     */
    async getViewCount(rid: string): Promise<number> {
        try {
            const result = await this.orientDbHttpService.queryOne<any>(
                `SELECT view_count FROM Food WHERE @rid = '${rid}' LIMIT 1`
            );
            return result?.view_count || 0;
        } catch (error) {
            console.warn(`Failed to get view count for food ${rid}:`, error);
            return 0;
        }
    }

    /**
     * Batch increment view counts for multiple foods
     * Useful for bulk operations
     */
    async batchIncrementViewCounts(rids: string[]): Promise<void> {
        if (rids.length === 0) return;

        try {
            // Create a batch update query
            const updateSql = `
                UPDATE Food 
                SET view_count = COALESCE(view_count, 0) + 1 
                WHERE @rid IN [${rids.map(rid => `'${rid}'`).join(',')}]
            `;

            // Execute asynchronously
            this.orientDbHttpService.command<any>(updateSql).catch(error => {
                console.warn(`Failed to batch increment view counts:`, error);
            });
        } catch (error) {
            console.warn(`Failed to prepare batch view count update:`, error);
        }
    }

    /**
     * Get top viewed foods
     * Optimized query for analytics
     */
    async getTopViewedFoods(limit: number = 10): Promise<Array<{ rid: string; name: string; viewCount: number }>> {
        try {
            const query = `
                SELECT @rid, name, view_count 
                FROM Food 
                WHERE view_count > 0 
                ORDER BY view_count DESC 
                LIMIT ${limit}
            `;

            const results = await this.orientDbHttpService.queryAll<any>(query, limit);

            return results.map(item => ({
                rid: item['@rid'],
                name: item.name,
                viewCount: item.view_count || 0
            }));
        } catch (error) {
            console.warn(`Failed to get top viewed foods:`, error);
            return [];
        }
    }
}
