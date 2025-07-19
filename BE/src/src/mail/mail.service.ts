import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
    constructor(private readonly mailerService: MailerService) { }
    /**
     * Send register notification email
     */
    async sendRegisterNotification(email: string, name: string): Promise<void> {
        await this.mailerService.sendMail({
            to: email,
            subject: 'Registration Successful',
            text: `Hello ${name}, your registration was successful!`,
        });
    }
} 