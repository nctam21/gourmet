import { Module } from '@nestjs/common';
import { FoodService } from './food.service';
import { OrientDbModule } from '../orientdb/orientdb.module';
import { FoodController } from './food.controller';

@Module({
    imports: [OrientDbModule],
    controllers: [FoodController],
    providers: [FoodService],
    exports: [FoodService],
})
export class FoodModule { }