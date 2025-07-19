import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ODatabase, ODatabaseSession, OrientDBClient } from 'orientjs';

@Injectable()
export class OrientDbService implements OnModuleInit, OnModuleDestroy {
    private client: OrientDBClient;
    private db: ODatabaseSession;

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit(): Promise<void> {
        this.client = await OrientDBClient.connect({
            host: this.configService.get<string>('ORIENTDB_HOST', 'localhost'),
            port: this.configService.get<number>('ORIENTDB_PORT', 2424),
            pool: {
                max: 10,
            },
        });
        this.db = await this.client.session({
            name: this.configService.get<string>('ORIENTDB_DB', 'gourmet'),
            username: this.configService.get<string>('ORIENTDB_USER', 'root'),
            password: this.configService.get<string>('ORIENTDB_PASSWORD', 'root'),
        });
    }

    async onModuleDestroy(): Promise<void> {
        await this.db.close();
        await this.client.close();
    }

    getDb(): ODatabaseSession {
        return this.db;
    }

    async createRecord<T>(className: string, data: Partial<T>): Promise<T> {
        return this.db.insert().into(className).set(data).one();
    }

    async findOne<T>(className: string, where: object): Promise<T | null> {
        const result = await this.db.select().from(className).where(where).limit(1).one();
        return result || null;
    }

    async findBy<T>(className: string, where: object): Promise<T[]> {
        return this.db.select().from(className).where(where).all();
    }

    async updateRecord<T>(className: string, where: object, data: Partial<T>): Promise<number> {
        const result = await this.db.update(className).set(data).where(where).one();
        return result;
    }

    async deleteRecord(className: string, where: object): Promise<number> {
        const result = await this.db.delete().from(className).where(where).one();
        return result;
    }
} 