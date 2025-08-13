import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
    imports: [
        ConfigModule,
        MailerModule.forRootAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => ({
                transport: {
                    host: config.get('MAIL_HOST'),
                    port: config.get('MAIL_PORT'),
                    auth: {
                        user: config.get('MAIL_USER'),
                        pass: config.get('MAIL_PASSWORD'),
                    },
                },
                defaults: {
                    from: config.get('MAIL_FROM'),
                },
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [MailService],
    exports: [MailService],
})
export class MailModule { } 