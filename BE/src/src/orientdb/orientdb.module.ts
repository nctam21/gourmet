import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrientDbService } from './orientdb.service';

@Module({
    imports: [ConfigModule],
    providers: [OrientDbService],
    exports: [OrientDbService],
})
export class OrientDbModule { } 