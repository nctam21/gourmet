import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { FoodService } from './food.service';
import {
  GetAllFoodDto,
  GetAllFoodResult,
  CreateFoodDto,
  UpdateFoodDto,
} from './dto/get-all-food.dto';
import { Food } from './food.model';

@Controller('foods')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}

  /**
   * Get all foods with pagination and filtering
   */
  @Get()
  async getAll(@Query() query: GetAllFoodDto): Promise<GetAllFoodResult> {
    return this.foodService.getAllFoods(query);
  }

  /**
   * Get food view count
   */
  @Get(':rid/view-count')
  async getViewCount(
    @Param('rid') rid: string,
  ): Promise<{ foodRid: string; viewCount: number }> {
    const viewCount = await this.foodService.getFoodViewCount(rid);
    return { foodRid: rid, viewCount };
  }

  @Get('test/database')
  async testDatabase(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    return this.foodService.testDatabaseConnection();
  }

  @Get('test/view-count/:rid')
  async testViewCountField(
    @Param('rid') rid: string,
  ): Promise<{ success: boolean; message: string; details?: any }> {
    return this.foodService.testViewCountField(rid);
  }

  /**
   * Get top 6 most viewed foods
   */
  @Get('top-6')
  async getTop6MostViewedFoods(): Promise<{
    success: boolean;
    message: string;
    foods: Array<{
      rid: string;
      name: string;
      viewCount: number;
      rank: number;
    }>;
  }> {
    try {
      const query = `
                SELECT @rid, name, view_count 
                FROM Food 
                WHERE view_count > 0 
                ORDER BY view_count DESC 
                LIMIT 6
            `;

      const results = await this.foodService[
        'orientDbHttpService'
      ].queryAll<any>(query, 6);

      const foods = results.map((item, index) => ({
        rid: item['@rid'],
        name: item.name,
        viewCount: item.view_count || 0,
        rank: index + 1,
      }));

      return {
        success: true,
        message: `Found ${foods.length} most viewed foods`,
        foods,
      };
    } catch (error) {
      console.error(`[FoodController] Error getting top 6 foods:`, error);
      return {
        success: false,
        message: `Error: ${error.message}`,
        foods: [],
      };
    }
  }

  /**
   * Search foods by keyword and region
   */
  @Get('search')
  async searchFoods(
    @Query('q') keyword: string,
    @Query('region') region?: string,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ): Promise<{
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
    return this.foodService.searchFoods(keyword, region, limit);
  }

  /**
   * Get foods by region
   */
  @Get('by-region/:region')
  async getFoodsByRegion(
    @Param('region') region: string,
    @Query('limit', ParseIntPipe) limit: number = 20,
  ): Promise<{
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
    }>;
    total: number;
  }> {
    return this.foodService.getFoodsByRegion(region, limit);
  }

  /**
   * Get all regions with RID and food counts
   */
  @Get('regions')
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
    return this.foodService.getAllRegions();
  }
  /**
   * Test endpoint to check database structure and find correct relationships
   */
  @Get('test/db-structure-deep')
  async testDatabaseStructureDeep(): Promise<any> {
    try {
      // Test 1: Kiểm tra cấu trúc Region table
      const regionStructure = await this.foodService.testRegionStructure();

      // Test 2: Kiểm tra cấu trúc Food table
      const foodStructure = await this.foodService.testFoodStructure();

      // Test 3: Tìm tất cả properties của Region
      const regionProperties = await this.foodService.testRegionProperties();

      // Test 4: Tìm tất cả properties của Food
      const foodProperties = await this.foodService.testFoodProperties();

      return {
        success: true,
        message: 'Deep database structure test completed',
        regionStructure,
        foodStructure,
        regionProperties,
        foodProperties,
      };
    } catch (error) {
      return {
        success: false,
        message: `Deep database test failed: ${error.message}`,
        error: error.stack,
      };
    }
  }

  /**
   * Test endpoint to check database consistency and find existing foods
   */
  @Get('test/db-consistency/:rid')
  async testDatabaseConsistency(@Param('rid') rid: string): Promise<any> {
    try {
      // Test 1: Lấy Region với in_FROM_REGION
      const regionQuery = `SELECT * FROM Region WHERE @rid = '${rid}' LIMIT 1`;
      const regionResult = await this.foodService.testDirectQuery(regionQuery);

      // Test 2: Kiểm tra từng RID trong in_FROM_REGION có tồn tại trong Food không
      let existingFoods: any[] = [];
      let missingRids: string[] = [];

      if (
        regionResult.success &&
        regionResult.result &&
        regionResult.result.length > 0
      ) {
        const region = regionResult.result[0];
        const inFromRegion = region.in_FROM_REGION || [];

        console.log(
          `[Controller] Checking ${inFromRegion.length} RIDs from in_FROM_REGION`,
        );

        // Kiểm tra từng RID
        for (const foodRid of inFromRegion) {
          const foodCheckQuery = `SELECT @rid, name FROM Food WHERE @rid = '${foodRid}' LIMIT 1`;
          const foodCheckResult =
            await this.foodService.testDirectQuery(foodCheckQuery);

          if (
            foodCheckResult.success &&
            foodCheckResult.result &&
            foodCheckResult.result.length > 0
          ) {
            existingFoods.push(foodCheckResult.result[0]);
          } else {
            missingRids.push(foodRid);
          }
        }
      }

      // Test 3: Thử tìm foods bằng cách khác - query tất cả foods và kiểm tra out_FROM_REGION
      const allFoodsQuery = `SELECT @rid, name, out_FROM_REGION FROM Food LIMIT 50`;
      const allFoodsResult =
        await this.foodService.testDirectQuery(allFoodsQuery);

      // Tìm foods có out_FROM_REGION chứa region RID
      let foodsWithRegion: any[] = [];
      if (allFoodsResult.success && allFoodsResult.result) {
        foodsWithRegion = allFoodsResult.result.filter(
          (food: any) =>
            food.out_FROM_REGION &&
            Array.isArray(food.out_FROM_REGION) &&
            food.out_FROM_REGION.includes(rid),
        );
      }

      return {
        success: true,
        message: 'Database consistency test completed',
        regionRid: rid,
        regionResult,
        existingFoods,
        missingRids,
        allFoodsResult: {
          total: allFoodsResult.result?.length || 0,
          sample: allFoodsResult.result?.slice(0, 5) || [],
        },
        foodsWithRegion,
        summary: {
          totalRidsInRegion:
            regionResult.result?.[0]?.in_FROM_REGION?.length || 0,
          existingFoods: existingFoods.length,
          missingRids: missingRids.length,
          foodsWithRegion: foodsWithRegion.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Database consistency test failed: ${error.message}`,
        error: error.stack,
      };
    }
  }

  /**
   * Test endpoint to check Food query with specific RIDs
   */
  @Get('test/food-query/:rids')
  async testFoodQuery(@Param('rids') rids: string): Promise<any> {
    try {
      // Test query Food với RIDs cụ thể
      const foodRids = rids
        .split(',')
        .map((rid) => `'${rid}'`)
        .join(',');

      const foodsQuery = `
                SELECT 
                    @rid as rid,
                    name,
                    calories,
                    description,
                    price,
                    view_count,
                    image_url
                FROM Food
                WHERE @rid IN (${foodRids})
                ORDER BY view_count DESC, name ASC
            `;

      const foodsResult = await this.foodService.testDirectQuery(foodsQuery);

      return {
        success: true,
        message: 'Food query test completed',
        inputRids: rids,
        formattedRids: foodRids,
        query: foodsQuery,
        foodsResult,
      };
    } catch (error) {
      return {
        success: false,
        message: `Food query test failed: ${error.message}`,
        error: error.stack,
      };
    }
  }

  /**
   * Test endpoint to check exact relationship structure
   */
  @Get('test/relationship-exact/:rid')
  async testExactRelationship(@Param('rid') rid: string): Promise<any> {
    try {
      // Test 1: Lấy Region với tất cả properties
      const regionQuery = `SELECT * FROM Region WHERE @rid = '${rid}' LIMIT 1`;
      const regionResult = await this.foodService.testDirectQuery(regionQuery);

      // Test 2: Lấy một số Food records để xem cấu trúc
      const foodSampleQuery = `SELECT * FROM Food LIMIT 3`;
      const foodSampleResult =
        await this.foodService.testDirectQuery(foodSampleQuery);

      // Test 3: Thử query trực tiếp với in_FROM_REGION
      const directFoodsQuery = `
                SELECT @rid, name, calories, description, price, view_count, image_url
                FROM Food
                WHERE @rid IN (
                    SELECT in_FROM_REGION 
                    FROM Region 
                    WHERE @rid = '${rid}'
                )
                LIMIT 5
            `;
      const directFoodsResult =
        await this.foodService.testDirectQuery(directFoodsQuery);

      // Test 4: Thử query ngược từ Food
      const reverseQuery = `
                SELECT @rid, name, calories, description, price, view_count, image_url
                FROM Food
                WHERE out_FROM_REGION CONTAINS '${rid}'
                LIMIT 5
            `;
      const reverseResult =
        await this.foodService.testDirectQuery(reverseQuery);

      return {
        success: true,
        message: 'Exact relationship test completed',
        regionRid: rid,
        regionResult,
        foodSampleResult,
        directFoodsResult,
        reverseResult,
      };
    } catch (error) {
      return {
        success: false,
        message: `Exact relationship test failed: ${error.message}`,
        error: error.stack,
      };
    }
  }

  /**
   * Test endpoint to check FROM_REGION relationship
   */
  @Get('test/relationship/:rid')
  async testRelationship(@Param('rid') rid: string): Promise<any> {
    try {
      // Test 1: Lấy FROM_REGION trực tiếp
      const directQuery = `
                SELECT FROM_REGION 
                FROM Region 
                WHERE @rid = '${rid}'
            `;

      const directResult = await this.foodService.testDirectQuery(directQuery);

      // Test 2: Lấy foods từ FROM_REGION
      const foodsQuery = `
                SELECT @rid, name, type
                FROM Food
                WHERE @rid IN (
                    SELECT FROM_REGION 
                    FROM Region 
                    WHERE @rid = '${rid}'
                )
                LIMIT 5
            `;

      const foodsResult = await this.foodService.testDirectQuery(foodsQuery);

      return {
        success: true,
        message: 'Relationship test completed',
        regionRid: rid,
        directResult,
        foodsResult,
      };
    } catch (error) {
      return {
        success: false,
        message: `Relationship test failed: ${error.message}`,
        error: error.stack,
      };
    }
  }

  /**
   * Get region info by RID
   */
  @Get('regions/rid/:rid')
  async getRegionByRid(@Param('rid') rid: string): Promise<{
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
    return this.foodService.getRegionByRid(rid);
  }

  /**
   * Test DELETE operation without actually deleting
   */
  @Get('test/delete/:rid')
  async testDeleteOperation(@Param('rid') rid: string): Promise<{
    foodRid: string;
    exists: boolean;
    foodInfo: any;
    canDelete: boolean;
    message: string;
  }> {
    try {
      // Check if food exists
      const food = await this.foodService['orientDbHttpService'].queryOne<any>(
        `SELECT @rid, name, type, price FROM Food WHERE @rid = '${rid}' LIMIT 1`,
      );

      if (!food) {
        return {
          foodRid: rid,
          exists: false,
          foodInfo: null,
          canDelete: false,
          message: 'Food not found',
        };
      }

      // Test if we can perform DELETE operation
      const testDeleteSql = `SELECT @rid FROM Food WHERE @rid = '${rid}' LIMIT 1`;
      const testResult =
        await this.foodService['orientDbHttpService'].queryOne<any>(
          testDeleteSql,
        );

      return {
        foodRid: rid,
        exists: true,
        foodInfo: food,
        canDelete: testResult !== null,
        message: testResult ? 'Food can be deleted' : 'Food cannot be deleted',
      };
    } catch (error) {
      return {
        foodRid: rid,
        exists: false,
        foodInfo: null,
        canDelete: false,
        message: `Error: ${error.message}`,
      };
    }
  }

  /**
   * Admin endpoint for system management and testing
   */
  @Get('admin')
  async adminDashboard(): Promise<{
    status: string;
    timestamp: string;
    endpoints: string[];
    database: any;
    cache: any;
    version: string;
  }> {
    try {
      // Test database connection
      const dbTest = await this.foodService.testDatabaseConnection();

      // Get cache info
      const cacheInfo = this.foodService.getCacheInfo();

      return {
        status: 'OK',
        timestamp: new Date().toISOString(),
        endpoints: [
          'GET /foods - Get all foods with pagination',
          'GET /foods/:rid - Get food detail (increments view count)',
          'GET /foods/:rid/view-count - Get view count only',
          'POST /foods/:rid/increment-view - Manual view count increment',
          'GET /foods/test/database - Test database connection',
          'GET /foods/test/view-count/:rid - Test view count field',
          'POST /foods - Create new food',
          'PUT /foods/:rid - Update food',
          'DELETE /foods/:rid - Delete food',
          'GET /foods/admin - This admin dashboard',
        ],
        database: dbTest,
        cache: cacheInfo,
        version: '1.0.0',
      };
    } catch (error) {
      return {
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        endpoints: [],
        database: { error: error.message },
        cache: { error: 'Failed to get cache info' },
        version: '1.0.0',
      };
    }
  }

  /**
   * Create a new food
   */
  @Post()
  async create(@Body() createFoodDto: CreateFoodDto): Promise<any> {
    return this.foodService.createFood(createFoodDto);
  }

  /**
   * Update an existing food
   */
  @Put(':rid')
  async update(
    @Param('rid') rid: string,
    @Body() updateFoodDto: UpdateFoodDto,
  ): Promise<any> {
    return this.foodService.updateFood(rid, updateFoodDto);
  }

  /**
   * Delete a food
   */
  @Delete(':rid')
  async delete(
    @Param('rid') rid: string,
  ): Promise<{ success: boolean; message: string }> {
    const success = await this.foodService.deleteFood(rid);
    return {
      success,
      message: success ? 'Food deleted successfully' : 'Failed to delete food',
    };
  }

  /**
   * Get food detail by RID (increments view count)
   * Đặt ở cuối để tránh conflict với các route khác
   */
  @Get(':rid')
  async getDetail(@Param('rid') rid: string): Promise<Food | null> {
    return this.foodService.getFoodDetailById(rid);
  }
}
