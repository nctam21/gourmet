import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ODatabase, ODatabaseSession, OrientDBClient } from 'orientjs';

@Injectable()
export class OrientDbService implements OnModuleInit, OnModuleDestroy {
    private client: OrientDBClient;
    private db: ODatabaseSession;
    private binaryEnabled = false;

    constructor(private readonly configService: ConfigService) { }

    async onModuleInit(): Promise<void> {
        const flag = this.configService.get<string>('ORIENTDB_BINARY_ENABLED');
        this.binaryEnabled = flag === 'true';
        if (!this.binaryEnabled) {
            return;
        }
        try {
            this.client = await OrientDBClient.connect({
                host: this.configService.get<string>('ORIENTDB_HOST', 'localhost'),
                port: this.configService.get<number>('ORIENTDB_PORT', 2424),
                pool: { max: 10 },
            });
            this.db = await this.client.session({
                name: this.configService.get<string>('ORIENTDB_DB', 'gourmet'),
                username: this.configService.get<string>('ORIENTDB_USER', 'root'),
                password: this.configService.get<string>('ORIENTDB_PASSWORD', 'root'),
            });
        } catch (err) {
            // Avoid crashing app if binary is not available
            console.warn('[OrientDbService] Binary connection disabled or failed:', (err as Error)?.message);
            this.binaryEnabled = false;
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.db) {
            await this.db.close();
        }
        if (this.client) {
            await this.client.close();
        }
    }

    getDb(): ODatabaseSession {
        if (!this.binaryEnabled || !this.db) {
            throw new Error('OrientDB binary driver is disabled or not connected. Enable by setting ORIENTDB_BINARY_ENABLED=true');
        }
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