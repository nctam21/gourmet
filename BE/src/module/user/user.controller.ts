import { Controller, Post, Body, Get } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './user.model';

@Controller()
export class UserController {
    constructor(private readonly userService: UserService) { }

    /**
     * Register a new user
     */
    @Post('register')
    async register(@Body() registerUserDto: RegisterUserDto): Promise<User> {
        return this.userService.registerUser(registerUserDto);
    }

    /**
     * Login user
     */
    @Post('login')
    async login(@Body() loginUserDto: LoginUserDto): Promise<User> {
        return this.userService.loginUser(loginUserDto);
    }

    /**
     * Alternative routes with /user prefix
     */
    @Post('user/register')
    async registerWithPrefix(@Body() registerUserDto: RegisterUserDto): Promise<User> {
        return this.userService.registerUser(registerUserDto);
    }

    @Post('user/login')
    async loginWithPrefix(@Body() loginUserDto: LoginUserDto): Promise<User> {
        return this.userService.loginUser(loginUserDto);
    }

    /**
     * Smoke test endpoint
     */
    @Get('test')
    test(): string {
        return 'ok';
    }

    @Get('user/test')
    testWithPrefix(): string {
        return 'ok with prefix';
    }
} 