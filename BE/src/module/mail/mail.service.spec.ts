import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('MailService', () => {
    let service: MailService;
    let mailerService: MailerService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MailService,
                {
                    provide: MailerService,
                    useValue: { sendMail: jest.fn() },
                },
            ],
        }).compile();
        service = module.get<MailService>(MailService);
        mailerService = module.get<MailerService>(MailerService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should send login notification', async () => {
        await service.sendLoginNotification('test@example.com', 'Test User');
        expect(mailerService.sendMail).toHaveBeenCalledWith({
            to: 'test@example.com',
            subject: 'Login Notification',
            text: 'Hello Test User, you have successfully logged in to your account.',
        });
    });
}); 