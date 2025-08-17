
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FoodDetail from '../components/FoodDetail';

type FoodItem = {
    '@rid': string; // OrientDB record ID (required)
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

type TrendingFood = {
    foodName: string;
    foodType: string;
    viewTrend: 'increasing' | 'decreasing' | 'stable';
    likeTrend: 'increasing' | 'decreasing' | 'stable';
    popularityScore: number;
    regionDistribution: { region: string; count: number }[];
};

type RecommendationItem = {
    foodId: string;
    foodName: string;
    reason: string;
    score: number;
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
    const [selectedType, setSelectedType] = useState<string>('');
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [popularFoods, setPopularFoods] = useState<RecommendationItem[]>([]);
    const [ageBasedRecs, setAgeBasedRecs] = useState<RecommendationItem[]>([]);
    const [trendingFoods, setTrendingFoods] = useState<TrendingFood[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [showFoodDetail, setShowFoodDetail] = useState<boolean>(false);
    const [selectedFoodId, setSelectedFoodId] = useState<string>('');

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
                if (selectedType) {
                    params.type = selectedType;
                }
                if (minPrice) {
                    params.minPrice = Number(minPrice);
                }
                if (maxPrice) {
                    params.maxPrice = Number(maxPrice);
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

        const fetchRecommendations = async (): Promise<void> => {
            try {
                // Fetch popular foods
                const popularRes = await axios.get<RecommendationItem[]>(`${apiBase}/food-recommendations/most-viewed?limit=6`);
                setPopularFoods(popularRes.data);

                // Fetch age-based recommendations (assuming user age 25)
                const ageRes = await axios.get<RecommendationItem[]>(`${apiBase}/food-recommendations/age-based?userAge=25`);
                setAgeBasedRecs(ageRes.data);

                // Fetch trending foods
                const trendingRes = await axios.get<TrendingFood[]>(`${apiBase}/food-analytics/trends?days=30`);
                setTrendingFoods(trendingRes.data);
            } catch (err) {
                console.warn('Failed to fetch recommendations:', err);
            }
        };

        fetchFoods();
        fetchRecommendations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, searchTerm, selectedType, minPrice, maxPrice]);

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
        setPage(1);
    };

    const handleFilterChange = (): void => {
        setPage(1);
    };

    const clearFilters = (): void => {
        setSearchTerm('');
        setSelectedType('');
        setMinPrice('');
        setMaxPrice('');
        setSelectedRegion('');
        setPage(1);
    };

    const handleFoodClick = (foodId: string): void => {
        console.log('handleFoodClick called with foodId:', foodId); // Debug log
        setSelectedFoodId(foodId);
        setShowFoodDetail(true);
        console.log('State updated - selectedFoodId:', foodId, 'showFoodDetail:', true); // Debug log
    };

    const closeFoodDetail = (): void => {
        setShowFoodDetail(false);
        setSelectedFoodId('');
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

            {/* Advanced Filters */}
            <div className="w-full max-w-3xl mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Bộ lọc nâng cao</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Loại món ăn</label>
                            <select
                                value={selectedType}
                                onChange={(e) => { setSelectedType(e.target.value); handleFilterChange(); }}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                            >
                                <option value="">Tất cả loại</option>
                                <option value="món chính">Món chính</option>
                                <option value="món phụ">Món phụ</option>
                                <option value="tráng miệng">Tráng miệng</option>
                                <option value="đồ uống">Đồ uống</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Giá tối thiểu (VNĐ)</label>
                            <input
                                type="number"
                                placeholder="0"
                                value={minPrice}
                                onChange={(e) => { setMinPrice(e.target.value); handleFilterChange(); }}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Giá tối đa (VNĐ)</label>
                            <input
                                type="number"
                                placeholder="1000000"
                                value={maxPrice}
                                onChange={(e) => { setMaxPrice(e.target.value); handleFilterChange(); }}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                            />
                        </div>
                    </div>

                    {/* Additional Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Khu vực</label>
                            <select
                                value={selectedRegion}
                                onChange={(e) => { setSelectedRegion(e.target.value); handleFilterChange(); }}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                            >
                                <option value="">Tất cả khu vực</option>
                                <option value="Trung du và miền núi phía Bắc">Trung du và miền núi phía Bắc</option>
                                <option value="Đồng Bằng Sông Hồng">Đồng Bằng Sông Hồng</option>
                                <option value="Bắc Trung Bộ">Bắc Trung Bộ</option>
                                <option value="Duyên Hải Nam Trung Bộ">Duyên Hải Nam Trung Bộ</option>
                                <option value="Tây Nguyên">Tây Nguyên</option>
                                <option value="Đông Nam Bộ">Đông Nam Bộ</option>
                                <option value="Đồng Bằng Sông Cửu Long">Đồng Bằng Sông Cửu Long</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                        >
                            Xóa bộ lọc
                        </button>
                    </div>
                </div>
            </div>

            {/* Trending Section */}
            {trendingFoods.length > 0 && (
                <div className="w-full max-w-7xl mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-semibold text-gray-800 mb-4">📈 Món ăn trending</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {trendingFoods.slice(0, 8).map((food, index) => (
                                <div
                                    key={index}
                                    className="bg-gray-50 p-4 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                    onClick={() => {
                                        // Tìm food RID từ danh sách foods
                                        const foundFood = foods.find(f => f.name === food.foodName);
                                        const foodId = foundFood?.['@rid'];
                                        if (foodId) {
                                            console.log('Trending food clicked, RID:', foodId);
                                            handleFoodClick(foodId);
                                        } else {
                                            console.log('No food RID found for trending food:', food.foodName);
                                            alert(`Không thể mở chi tiết cho món trending: ${food.foodName}`);
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-medium text-gray-800">{food.foodName}</span>
                                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                            #{index + 1}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">{food.foodType}</div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className={`px-2 py-1 rounded ${food.viewTrend === 'increasing' ? 'bg-green-100 text-green-800' :
                                            food.viewTrend === 'decreasing' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            👁️ {food.viewTrend}
                                        </span>
                                        <span className={`px-2 py-1 rounded ${food.likeTrend === 'increasing' ? 'bg-green-100 text-green-800' :
                                            food.likeTrend === 'decreasing' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                            }`}>
                                            ❤️ {food.likeTrend}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 mt-2">
                                        Điểm: {food.popularityScore}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendations Section */}
            {(popularFoods.length > 0 || ageBasedRecs.length > 0) && (
                <div className="w-full max-w-7xl mb-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Popular Foods */}
                        {popularFoods.length > 0 && (
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">🔥 Món ăn phổ biến nhất</h3>
                                <div className="space-y-3">
                                    {popularFoods.map((item) => (
                                        <div
                                            key={item.foodId}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => {
                                                // Tìm food RID từ danh sách foods
                                                const foundFood = foods.find(f => f.name === item.foodName);
                                                const foodId = foundFood?.['@rid'];
                                                if (foodId) {
                                                    console.log('Popular food clicked, RID:', foodId);
                                                    handleFoodClick(foodId);
                                                } else {
                                                    console.log('No food RID found for popular food:', item.foodName);
                                                    alert(`Không thể mở chi tiết cho món phổ biến: ${item.foodName}`);
                                                }
                                            }}
                                        >
                                            <div>
                                                <div className="font-medium text-gray-800">{item.foodName}</div>
                                                <div className="text-sm text-gray-600">{item.reason}</div>
                                            </div>
                                            <div className="text-sm text-gray-500">Điểm: {item.score}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Age-based Recommendations */}
                        {ageBasedRecs.length > 0 && (
                            <div className="bg-white p-6 rounded-xl shadow-md">
                                <h3 className="text-xl font-semibold text-gray-800 mb-4">👥 Gợi ý theo độ tuổi</h3>
                                <div className="space-y-3">
                                    {ageBasedRecs.map((item) => (
                                        <div
                                            key={item.foodId}
                                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                            onClick={() => {
                                                // Tìm food RID từ danh sách foods
                                                const foundFood = foods.find(f => f.name === item.foodName);
                                                const foodId = foundFood?.['@rid'];
                                                if (foodId) {
                                                    handleFoodClick(foodId);
                                                } else {
                                                    console.log('No food RID found for age-based food:', item.foodName);
                                                    alert(`Không thể mở chi tiết cho món gợi ý: ${item.foodName}`);
                                                }
                                            }}
                                        >
                                            <div>
                                                <div className="font-medium text-gray-800">{item.foodName}</div>
                                                <div className="text-sm text-gray-600">{item.reason}</div>
                                            </div>
                                            <div className="text-sm text-gray-500">Điểm: {item.score}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {loading && page === 1 && (
                <div className="w-full max-w-7xl text-gray-600">Đang tải dữ liệu...</div>
            )}

            {error && !loading && (
                <div className="w-full max-w-7xl text-red-600">{error}</div>
            )}

            {!error && foods.length === 0 && !loading && (
                <div className="w-full max-w-7xl text-gray-500 text-center py-8">
                    {searchTerm || selectedType || minPrice || maxPrice || selectedRegion
                        ? `Không tìm thấy món ăn nào với bộ lọc hiện tại`
                        : 'Không có món ăn nào'}
                </div>
            )}

            {!error && foods.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-3xl">
                    {foods.map((item) => {
                        const img = item.image_url || 'https://via.placeholder.com/160x200?text=No+Image';

                        const foodId = item['@rid'];

                        return (
                            <div
                                key={(foodId || item.name) + Math.random()}
                                className="bg-white rounded-xl shadow-md p-6 flex flex-col items-center transition hover:shadow-lg cursor-pointer"
                                onClick={() => {
                                    if (foodId) {
                                        handleFoodClick(foodId);
                                    } else {
                                        console.log('No food RID found for:', item.name); // Debug log
                                        alert(`Không thể mở chi tiết cho món: ${item.name}. Vui lòng thử lại sau.`);
                                    }
                                }}
                            >
                                <img src={img} alt={item.name} className="w-40 h-40 object-cover rounded-md mb-4" />
                                <h2 className="text-xl font-semibold text-gray-800 mb-1 text-center">{item.name}</h2>
                                {item.region && (
                                    <div className="text-xs text-gray-500 mb-2">{item.region}</div>
                                )}
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

            {/* Food Detail Modal */}
            {showFoodDetail && selectedFoodId && (
                <FoodDetail
                    foodRid={selectedFoodId}
                    onClose={closeFoodDetail}
                />
            )}

            {/* Debug info for modal state */}
            <div className="fixed bottom-20 right-6 bg-black text-white p-2 rounded text-xs z-50">
                showFoodDetail: {showFoodDetail.toString()}<br />
                selectedFoodId: {selectedFoodId || 'null'}
            </div>

        </div>
    );
};

export default HomePage;