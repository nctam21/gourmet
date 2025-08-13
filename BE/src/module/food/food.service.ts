import { Injectable } from '@nestjs/common';
import { OrientDbService } from '../orientdb/orientdb.service';
import { OrientDbHttpService } from '../orientdb/orientdb-http.service';
import { GetAllFoodDto, GetAllFoodResult } from './dto/get-all-food.dto';
import { normalizePagination, computeTotalPages } from '../shared/pagination/pagination.util';

@Injectable()
export class FoodService {
    private readonly FOOD_CLASS = 'Food';

    constructor(
        private readonly orientDbService: OrientDbService,
        private readonly orientDbHttpService: OrientDbHttpService,
    ) { }

    /**
     * Get all foods with pagination
     */
    async getAllFoods(input: GetAllFoodDto): Promise<GetAllFoodResult> {
        const { page, limit, offset } = normalizePagination(input);

        const [items, totalRow] = await Promise.all([
            this.orientDbHttpService.queryAll<any>(`SELECT FROM ${this.FOOD_CLASS} SKIP ${offset} LIMIT ${limit}`, limit),
            this.orientDbHttpService.queryOne<{ count: number }>(`SELECT count(*) as count FROM ${this.FOOD_CLASS}`),
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
}
