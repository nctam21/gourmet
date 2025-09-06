import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrientDbService } from './orientdb.service';
import { OrientDbHttpService } from './orientdb-http.service';

@Module({
  imports: [ConfigModule],
  providers: [OrientDbService, OrientDbHttpService],
  exports: [OrientDbService, OrientDbHttpService],
})
export class OrientDbModule {}
