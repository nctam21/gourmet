import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { OrientDbService } from '../orientdb/orientdb.service';
import { MailService } from '../mail/mail.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

const mockOrientDbService = {
    findOne: jest.fn(),
    createRecord: jest.fn(),
};
const mockMailService = {
    sendLoginNotification: jest.fn(),
};

describe('UserService', () => {
    let service: UserService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: OrientDbService, useValue: mockOrientDbService },
                { provide: MailService, useValue: mockMailService },
            ],
        }).compile();
        service = module.get<UserService>(UserService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // Thêm test cho registerUser và loginUser ở đây
}); 