
import React, { useEffect, useState } from 'react';
import axios from 'axios';

type FoodItem = {
    id?: string;
    name: string;
    description: string;
    image_url?: string;
    price?: number;
    region?: string;
    type?: string;
};

type PaginatedResult<T> = {
    items: ReadonlyArray<T>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
};

const resolveApiBase = (): string => {
    const base = process.env.REACT_APP_API_BASE;
    if (base && base.length > 0) return base;
    const userUrl = process.env.REACT_APP_API_URL;
    if (userUrl && userUrl.endsWith('/user')) return userUrl.replace(/\/user$/, '');
    if (userUrl) {
        try {
            const url = new URL(userUrl);
            return `${url.protocol}//${url.host}`;
        } catch {
            // fall through
        }
    }
    return '';
};

const HomePage: React.FC = () => {
    const [foods, setFoods] = useState<FoodItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(12);
    const [totalPages, setTotalPages] = useState<number>(1);
    const [total, setTotal] = useState<number>(0);
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');

    useEffect(() => {
        const handleScroll = (): void => {
            setShowScrollTop(window.scrollY > 300);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const apiBase = resolveApiBase();
        if (!apiBase) {
            setError('Missing REACT_APP_API_BASE or REACT_APP_API_URL in .env');
            setLoading(false);
            return;
        }

        const fetchFoods = async (): Promise<void> => {
            const isLoadMore: boolean = page > 1 && foods.length > 0;
            isLoadMore ? setLoadingMore(true) : setLoading(true);
            try {
                const params: any = { page, limit };
                if (searchTerm.trim()) {
                    params.name = searchTerm.trim();
                }
                const res = await axios.get<PaginatedResult<FoodItem>>(`${apiBase}/foods`, { params });
                setTotalPages(res.data.totalPages);
                setTotal(res.data.total);
                if (isLoadMore) {
                    setFoods((prev) => [...prev, ...res.data.items]);
                } else {
                    setFoods(res.data.items as FoodItem[]);
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load foods');
            } finally {
                isLoadMore ? setLoadingMore(false) : setLoading(false);
            }
        };

        fetchFoods();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, searchTerm]);

    const handleLoadMore = (): void => {
        if (page < totalPages && !loadingMore) {
            setPage((p) => p + 1);
        }
    };

    const handleChangeLimit = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        const newLimit: number = Number(e.target.value);
        setLimit(newLimit);
        setPage(1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setSearchTerm(e.target.value);
        setPage(1); // Reset về trang 1 khi search
    };

    return (
        <div className="w-full min-h-screen bg-gray-50 flex flex-col items-center px-4 pb-16">
            <div className="w-full max-w-7xl flex items-end justify-between mt-10 mb-6">
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">Danh sách món ăn</h1>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                    <label htmlFor="limit" className="hidden sm:block">Số món mỗi trang:</label>
                    <select
                        id="limit"
                        value={limit}
                        onChange={handleChangeLimit}
                        className="border border-gray-300 rounded-md px-2 py-1 bg-white"
                    >
                        {[12, 24, 36, 48, 60].map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                    <span className="hidden sm:block">Tổng: {total}</span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="w-full max-w-3xl mb-8">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Tìm kiếm món ăn..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 transition text-lg bg-white shadow-sm"
                    />
                    <svg
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                </div>
            </div>

            {loading && page === 1 && (
                <div className="w-full max-w-7xl text-gray-600">Đang tải dữ liệu...</div>
            )}

            {error && !loading && (
                <div className="w-full max-w-7xl text-red-600">{error}</div>
            )}

            {!error && foods.length === 0 && !loading && (
                <div className="w-full max-w-7xl text-gray-500 text-center py-8">
                    {searchTerm ? `Không tìm thấy món ăn nào với từ khóa "${searchTerm}"` : 'Không có món ăn nào'}
                </div>
            )}

            {!error && foods.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-3xl">
                    {foods.map((item) => {
                        const img = item.image_url || 'https://via.placeholder.com/160x200?text=No+Image';
                        return (
                            <div key={(item.id || item.name) + Math.random()} className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center transition hover:shadow-lg">
                                <img src={img} alt={item.name} className="w-40 h-40 object-cover rounded-md mb-4" />
                                <h2 className="text-xl font-semibold text-gray-800 mb-1 text-center">{item.name}</h2>
                                {item.region && (
                                    <div className="text-xs text-gray-500 mb-2">{item.region}</div>
                                )}
                                <p className="text-gray-500 text-sm mb-4 text-center min-h-[40px]">{item.description}</p>
                                {typeof item.price === 'number' && (
                                    <div className="text-lg font-bold text-gray-700 mt-auto">
                                        {item.price.toLocaleString('vi-VN')} đ
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Load more */}
            {!loading && !error && page < totalPages && foods.length > 0 && (
                <div className="mt-10">
                    <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="px-6 py-2 rounded-full bg-gray-900 text-white font-semibold shadow hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loadingMore ? 'Đang tải...' : 'Tải thêm'}
                    </button>
                </div>
            )}

            {/* Scroll to top button */}
            <button
                aria-label="Lên đầu trang"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`fixed bottom-6 right-6 z-50 rounded-full shadow-lg bg-gray-900 text-white w-12 h-12 flex items-center justify-center transition-all ${showScrollTop ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                title="Lên đầu trang"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="18 15 12 9 6 15"></polyline>
                </svg>
            </button>
        </div>
    );
};

export default HomePage;