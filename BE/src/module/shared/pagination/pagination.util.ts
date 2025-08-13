import { DEFAULT_LIMIT, DEFAULT_PAGE, MAX_LIMIT } from './pagination.constants';
import { PaginationInput } from './pagination.types';

export function normalizePagination(input?: PaginationInput): { page: number; limit: number; offset: number } {
    const rawPage = input?.page ?? DEFAULT_PAGE;
    const rawLimit = input?.limit ?? DEFAULT_LIMIT;
    const page = Math.max(1, Math.floor(rawPage));
    const limit = Math.max(1, Math.min(MAX_LIMIT, Math.floor(rawLimit)));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

export function computeTotalPages(total: number, limit: number): number {
    return Math.max(1, Math.ceil(total / limit));
}

