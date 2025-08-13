import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './user.model';
import { OrientDbHttpService } from '../orientdb/orientdb-http.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
    private readonly USER_CLASS = 'User';

    constructor(
        private readonly orientDbHttpService: OrientDbHttpService,
        private readonly mailService: MailService,
    ) { }

    /**
     * Register a new user
     */
    async registerUser(registerUserDto: RegisterUserDto): Promise<User> {
        const { email, phone, password, ...rest } = registerUserDto;
        // Check unique email/phone via REST
        const existed = await this.orientDbHttpService.queryOne<User>(
            `SELECT FROM ${this.USER_CLASS} WHERE email = '${email}' OR phone = '${phone}' LIMIT 1`
        );
        if (existed) {
            throw new BadRequestException('Email or phone already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const insertSql =
            `INSERT INTO ${this.USER_CLASS} SET ` +
            `name='${rest.name}', age=${rest.age}, region='${rest.region}', gender='${rest.gender}', ` +
            `phone='${phone}', email='${email}', password='${hashedPassword}', ` +
            `createdAt=SYSDATE(), updatedAt=SYSDATE()`;
        const created = await this.orientDbHttpService.command<User>(insertSql);
        await this.mailService.sendRegisterNotification(email, rest.name ?? '');
        return new User(created ?? { ...rest, email, phone });
    }

    /**
     * Login with email/phone and password
     */
    async loginUser(loginUserDto: LoginUserDto): Promise<User> {
        const { email, phone, password } = loginUserDto;
        const whereClause = email ? `email='${email}'` : `phone='${phone}'`;
        const user = await this.orientDbHttpService.queryOne<User>(
            `SELECT FROM ${this.USER_CLASS} WHERE ${whereClause} LIMIT 1`
        );
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