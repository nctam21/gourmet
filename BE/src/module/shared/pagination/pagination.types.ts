export type PaginationInput = {
    readonly page?: number;
    readonly limit?: number;
};

export type PaginationResult<T> = {
    readonly items: ReadonlyArray<T>;
    readonly total: number;
    readonly page: number;
    readonly limit: number;
    readonly totalPages: number;
};

