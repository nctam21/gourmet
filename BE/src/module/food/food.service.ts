import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { OrientDbHttpService } from '../orientdb/orientdb-http.service';
import { GetAllFoodDto, GetAllFoodResult, CreateFoodDto, UpdateFoodDto } from './dto/get-all-food.dto';
import { normalizePagination, computeTotalPages } from '../shared/pagination/pagination.util';

@Injectable()
export class FoodService {
    private readonly FOOD_CLASS = 'Food';

    constructor(
        private readonly orientDbHttpService: OrientDbHttpService,
    ) { }

    /**
     * Build WHERE clause for filtering
     */
    private buildWhereClause(filters: Partial<GetAllFoodDto>): string {
        const conditions: string[] = [];

        if (filters.name) {
            conditions.push(`name.toLowerCase() LIKE '%${filters.name.toLowerCase()}%'`);
        }

        if (filters.type) {
            conditions.push(`type = '${filters.type}'`);
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
     * Get food detail by OrientDB record id (RID) or custom id
     */
    async getFoodDetailById(id: string): Promise<any | null> {
        if (id.startsWith('#')) {
            return this.orientDbHttpService.getDocumentByRid<any>(id);
        }
        return this.orientDbHttpService.queryOne<any>(`SELECT FROM ${this.FOOD_CLASS} WHERE id = '${id}' LIMIT 1`);
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
            `price=${createFoodDto.price}`;

        const result = await this.orientDbHttpService.command<any>(insertSql);
        if (!result) {
            throw new BadRequestException('Failed to create food');
        }
        return result;
    }

    /**
     * Update an existing food
     */
    async updateFood(id: string, updateFoodDto: UpdateFoodDto): Promise<any> {
        // Check if food exists
        const existingFood = await this.getFoodDetailById(id);
        if (!existingFood) {
            throw new NotFoundException(`Food with ID ${id} not found`);
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
            (id.startsWith('#') ? `WHERE @rid = '${id}'` : `WHERE id = '${id}'`);

        const result = await this.orientDbHttpService.command<any>(updateSql);
        if (!result) {
            throw new BadRequestException('Failed to update food');
        }
        return result;
    }

    /**
     * Delete a food
     */
    async deleteFood(id: string): Promise<boolean> {
        // Check if food exists
        const existingFood = await this.getFoodDetailById(id);
        if (!existingFood) {
            throw new NotFoundException(`Food with ID ${id} not found`);
        }

        const deleteSql = `DELETE FROM ${this.FOOD_CLASS} ` +
            (id.startsWith('#') ? `WHERE @rid = '${id}'` : `WHERE id = '${id}'`);

        const result = await this.orientDbHttpService.command<any>(deleteSql);
        return result !== null;
    }
}
