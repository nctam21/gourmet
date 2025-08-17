import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * OrientDB HTTP/REST service.
 * Works with OrientDB 2.x/3.x over port 2480, avoiding binary driver issues.
 */
@Injectable()
export class OrientDbHttpService {
    private readonly client: AxiosInstance;
    private readonly dbName: string;

    constructor(private readonly configService: ConfigService) {
        const host: string = this.configService.get<string>('ORIENTDB_HTTP_HOST')
            ?? this.configService.get<string>('ORIENTDB_HOST', 'localhost');
        const port: number = this.configService.get<number>('ORIENTDB_HTTP_PORT', 2480);
        const username: string = this.configService.get<string>('ORIENTDB_USER', 'root');
        const password: string = this.configService.get<string>('ORIENTDB_PASSWORD', 'root');
        this.dbName = this.configService.get<string>('ORIENTDB_DB', 'gourmet');

        this.client = axios.create({
            baseURL: `http://${host}:${port}`,
            headers: {
                Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }

    /** Execute a SQL query and return all results (GET /query/{db}/sql/{q}/{limit}). */
    async queryAll<T>(sql: string, limit: number = 100): Promise<ReadonlyArray<T>> {
        const encoded = encodeURIComponent(sql);
        const { data } = await this.client.get(`/query/${this.dbName}/sql/${encoded}/${limit}`);
        const result: T[] = data?.result ?? [];
        return result;
    }

    /** Execute a SQL query and return single result (first row) */
    async queryOne<T>(sql: string): Promise<T | null> {
        const rows = await this.queryAll<T>(sql, 1);
        return rows.length > 0 ? rows[0] : null;
    }

    /** Execute a SQL command (POST /command/{db}/sql) - send raw SQL text body */
    async command<T>(sql: string): Promise<T | null> {
        try {
            const { data } = await this.client.post(
                `/command/${this.dbName}/sql`,
                sql,
                { headers: { 'Content-Type': 'text/plain' } },
            );
            const result = (data?.result ?? [])[0] ?? null;
            return result as T | null;
        } catch (error) {
            console.error(`[OrientDbHttpService] Command failed:`, {
                sql,
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    }

    /** Delete a document by RID (DELETE /document/{db}/{rid}) */
    async deleteDocument<T>(rid: string): Promise<T | null> {
        try {
            const { data } = await this.client.delete(`/document/${this.dbName}/${encodeURIComponent(rid)}`);
            return (data ?? null) as T | null;
        } catch (error) {
            console.error(`[OrientDbHttpService] Delete document failed:`, {
                rid,
                error: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    }

    /** Fetch a single document by RID (GET /document/{db}/{rid}) */
    async getDocumentByRid<T>(rid: string): Promise<T | null> {
        const { data } = await this.client.get(`/document/${this.dbName}/${encodeURIComponent(rid)}`);
        return (data ?? null) as T | null;
    }
}
