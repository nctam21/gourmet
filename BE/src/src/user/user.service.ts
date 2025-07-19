import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './user.model';
import { OrientDbService } from '../orientdb/orientdb.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    private readonly USER_CLASS = 'User';

    constructor(
        private readonly orientDbService: OrientDbService,
        private readonly mailService: MailService,
    ) { }

    /**
     * Register a new user
     */
    async registerUser(registerUserDto: RegisterUserDto): Promise<User> {
        const { email, phone, password, ...rest } = registerUserDto;
        // Check unique email/phone
        const existed = await this.orientDbService.findOne<User>(this.USER_CLASS, {
            $or: [{ email }, { phone }],
        });
        if (existed) {
            throw new BadRequestException('Email or phone already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await this.orientDbService.createRecord<User>(this.USER_CLASS, {
            ...rest,
            email,
            phone,
            password: hashedPassword,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        await this.mailService.sendRegisterNotification(email, rest.userName ?? '');
        return new User(user);
    }

    /**
     * Login with email/phone and password
     */
    async loginUser(loginUserDto: LoginUserDto): Promise<User> {
        const { email, phone, password } = loginUserDto;
        const where = email ? { email } : { phone };
        const user = await this.orientDbService.findOne<User>(this.USER_CLASS, where);
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new UnauthorizedException('Invalid credentials');
        }
        return new User(user);
    }
} 