import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { OrientDbModule } from './orientdb/orientdb.module';
import { MailModule } from './mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { FoodModule } from './food/food.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    UserModule,
    OrientDbModule,
    MailModule,
    FoodModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
