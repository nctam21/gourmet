
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import FoodDetail from '../components/FoodDetail';

interface Region {
    rid: string;
    name: string;
    foodCount?: number;
}

interface FoodItem {
    '@rid': string;
    name: string;
    type: string;
    price: number;
    region: string;
    season: string;
    description: string;
    image_url?: string;
}

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
    regionDistribution: { region: string; count: number }[];
    viewCount: number;
};

type RecommendationItem = {
    foodRid: string;
    foodName: string;
    reason: string;
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
    const { user } = useAuth();
    const [foods, setFoods] = useState<FoodItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [page, setPage] = useState<number>(1);
    const [limit, setLimit] = useState<number>(12);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [total, setTotal] = useState<number>(0);
    const [showScrollTop, setShowScrollTop] = useState<boolean>(false);
    const [searchKeyword, setSearchKeyword] = useState<string>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [minPrice, setMinPrice] = useState<string>('');
    const [maxPrice, setMaxPrice] = useState<string>('');
    const [selectedRegion, setSelectedRegion] = useState<string>('');
    const [selectedRegionRid, setSelectedRegionRid] = useState<string>('');
    const [regions, setRegions] = useState<Region[]>([]);
    const [loadingRegions, setLoadingRegions] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [showFoodDetail, setShowFoodDetail] = useState<boolean>(false);
    const [selectedFoodId, setSelectedFoodId] = useState<string>('');
    const [popularFoods, setPopularFoods] = useState<RecommendationItem[]>([]);
    const [ageBasedRecs, setAgeBasedRecs] = useState<RecommendationItem[]>([]);
    const [trendingFoods, setTrendingFoods] = useState<TrendingFood[]>([]);

    const fetchFoods = async (): Promise<void> => {
        console.log('=== fetchFoods CALLED ===');
        console.log('Current selectedRegionRid:', selectedRegionRid);

        const apiBase = resolveApiBase();
        if (!apiBase) {
            setError('API base URL not configured');
            setLoading(false);
            return;
        }

        // Nếu đang filter theo vùng, không gọi fetchFoods
        if (selectedRegionRid) {
            console.log('fetchFoods: Skipping - currently filtering by region');
            return;
        }

        console.log('fetchFoods: Proceeding to fetch all foods');
        const isLoadMore: boolean = page > 1 && foods.length > 0;
        isLoadMore ? setLoadingMore(true) : setLoading(true);
        try {
            const params: any = { page, limit };
            if (searchKeyword.trim()) {
                params.name = searchKeyword.trim();
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
            if (selectedRegionRid) {
                // Sử dụng RID thay vì tên vùng
                const cleanRid = selectedRegionRid.replace('#', '');
                params.regionRid = cleanRid;
                console.log(`fetchFoods: Adding regionRid param: ${cleanRid}`);
            }

            console.log('fetchFoods: API params:', params);
            const res = await axios.get<PaginatedResult<FoodItem>>(`${apiBase}/foods`, { params });
            setTotalPages(res.data.totalPages);
            setTotal(res.data.total);
            if (isLoadMore) {
                setFoods((prev) => [...prev, ...res.data.items]);
            } else {
                setFoods(res.data.items as FoodItem[]);
            }
            console.log(`fetchFoods: Successfully fetched ${res.data.items?.length || 0} foods`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load foods');
            console.error('fetchFoods: Error occurred:', err);
        } finally {
            isLoadMore ? setLoadingMore(false) : setLoading(false);
            console.log('=== End fetchFoods ===');
        }
    };



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
            setError('API base URL not configured');
            setLoading(false);
            return;
        }

        const fetchRecommendations = async (): Promise<void> => {
            try {
                // Fetch popular foods
                const popularRes = await axios.get<RecommendationItem[]>(`${apiBase}/food-recommendations/most-viewed?limit=6`);
                setPopularFoods(popularRes.data);

                // Fetch age-based recommendations - lấy tuổi từ user context
                if (user && user.age) {
                    console.log(`Fetching age-based recommendations for user age: ${user.age}`);
                    try {
                        const ageRes = await axios.get<RecommendationItem[]>(`${apiBase}/food-recommendations/age-based?userAge=${user.age}`);
                        console.log('Age-based recommendations response:', ageRes.data);
                        setAgeBasedRecs(ageRes.data);
                    } catch (ageErr: any) {
                        console.warn('Failed to fetch age-based recommendations:', ageErr);
                        console.log('Age API error details:', ageErr.response?.data);
                        setAgeBasedRecs([]); // Reset nếu API fail
                    }
                } else {
                    // Fallback: sử dụng tuổi mặc định nếu không thể tính tuổi
                    console.log('No valid age found, using fallback age: 25');
                    console.log('Available user fields:', user ? Object.keys(user) : 'No user');
                    try {
                        const ageRes = await axios.get<RecommendationItem[]>(`${apiBase}/food-recommendations/age-based?userAge=25`);
                        console.log('Fallback age-based recommendations response:', ageRes.data);
                        setAgeBasedRecs(ageRes.data);
                    } catch (ageErr: any) {
                        console.warn('Failed to fetch age-based recommendations with fallback age:', ageErr);
                        console.log('Fallback age API error details:', ageErr.response?.data);
                        setAgeBasedRecs([]);
                    }
                }

                // Fetch trending foods
                try {
                    const trendingRes = await axios.get<TrendingFood[]>(`${apiBase}/food-analytics/trends?days=30`);
                    setTrendingFoods(trendingRes.data);
                } catch (trendingErr: any) {
                    console.warn('Failed to fetch trending foods:', trendingErr);
                    setTrendingFoods([]);
                }

                console.log('=== Recommendations fetching completed ===');
            } catch (err: any) {
                console.warn('Failed to fetch recommendations:', err);
                // Reset tất cả recommendations nếu API chính fail
                setPopularFoods([]);
                setAgeBasedRecs([]);
                setTrendingFoods([]);
            }
        };

        fetchFoods();
        fetchRecommendations();
        fetchRegions(); // Lấy danh sách vùng miền
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, searchKeyword, selectedType, minPrice, maxPrice, selectedRegionRid]);

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

    const handleSearch = (): void => {
        setPage(1);
        // Use search API if keyword is provided, otherwise use regular fetch
        if (searchKeyword.trim()) {
            fetchFoods();
        } else {
            fetchFoods();
        }
    };

    const clearSearch = (): void => {
        console.log('=== Clear Search Debug ===');
        console.log('Clearing search and filters...');

        // Reset tất cả state
        setSearchKeyword('');
        setSelectedType('');
        setMinPrice('');
        setMaxPrice('');
        setSelectedRegion('');
        setSelectedRegionRid('');
        setPage(1);

        console.log('Search and filters cleared, calling fetchFoods() to refresh data');
        // Refresh data after clearing - gọi fetchFoods để lấy tất cả món ăn
        // Sử dụng setTimeout để đảm bảo state đã được update
        setTimeout(() => {
            console.log('Executing fetchFoods() after clear search');
            fetchFoods();
        }, 100);

        console.log('=== End Clear Search Debug ===');
    };

    const handleFilterChange = (): void => {
        setPage(1);
        // Tự động search khi thay đổi filter
        if (selectedRegionRid) {
            // Nếu có chọn vùng, gọi API getRegionByRid
            console.log('handleFilterChange: Calling fetchFoodsByRegion for selected region');
            fetchFoodsByRegion(selectedRegionRid);
        } else if (searchKeyword.trim()) {
            // Nếu có keyword nhưng không có vùng, gọi fetchFoods
            console.log('handleFilterChange: Calling fetchFoods with search keyword');
            fetchFoods();
        } else {
            // Nếu không có gì, gọi fetchFoods
            console.log('handleFilterChange: Calling fetchFoods without filters');
            fetchFoods();
        }
    };

    // Xử lý khi chọn vùng
    const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        const selectedValue = e.target.value;
        const selectedOption = e.target.options[e.target.selectedIndex];

        console.log('=== Region Selection Debug ===');
        console.log('Selected value (RID):', selectedValue);
        console.log('Selected option text:', selectedOption.text);
        console.log('Selected option:', selectedOption);

        if (selectedValue === '') {
            // Chọn "Tất cả khu vực"
            console.log('Chọn "Tất cả khu vực" - Clear region filter');
            setSelectedRegion('');
            setSelectedRegionRid('');
            setPage(1);
            // Gọi fetchFoods để lấy tất cả món ăn
            console.log('Calling fetchFoods() to get all foods');
            // Sử dụng setTimeout để đảm bảo state đã được update
            setTimeout(() => {
                fetchFoods();
            }, 100);
        } else {
            // Chọn vùng cụ thể
            const regionName = selectedOption.text;
            console.log(`Chọn vùng: "${regionName}" với RID: "${selectedValue}"`);
            setSelectedRegion(regionName);
            setSelectedRegionRid(selectedValue);
            setPage(1);
            // Chỉ gọi API getRegionByRid để lấy món ăn theo vùng
            // Sử dụng selectedValue (RID) thay vì selectedOption.text (tên vùng)
            console.log(`Gọi API: /foods/regions/rid/${selectedValue.replace('#', '')}`);
            console.log('About to call fetchFoodsByRegion with RID:', selectedValue);
            // Sử dụng setTimeout để đảm bảo state đã được update
            setTimeout(() => {
                fetchFoodsByRegion(selectedValue);
            }, 100);
        }
        console.log('=== End Region Selection Debug ===');
    };

    // Kiểm tra xem có đang filter theo vùng không
    const isFilteringByRegion = (): boolean => {
        return selectedRegion !== '';
    };

    // Lấy tên vùng đang được chọn
    const getSelectedRegionName = (): string => {
        return selectedRegion;
    };

    // Lấy danh sách tất cả vùng miền từ API
    const fetchRegions = async (): Promise<void> => {
        const apiBase = resolveApiBase();
        if (!apiBase) {
            console.error('API base URL not configured');
            return;
        }

        setLoadingRegions(true);
        try {
            console.log('Fetching regions from API...');
            const response = await axios.get(`${apiBase}/foods/regions`);
            console.log('Regions response:', response.data);

            // Đảm bảo response.data là array
            if (Array.isArray(response.data)) {
                setRegions(response.data);
            } else if (response.data && Array.isArray(response.data.regions)) {
                // Nếu response có dạng { regions: [...] }
                console.log('Regions: Nested regions format');
                console.log('Regions data:', response.data.regions);
                console.log('First region sample:', response.data.regions[0]);
                console.log('First region keys:', Object.keys(response.data.regions[0] || {}));
                setRegions(response.data.regions);
            } else if (response.data && Array.isArray(response.data.items)) {
                // Nếu response có dạng { items: [...] }
                setRegions(response.data.items);
            } else {
                console.warn('Unexpected regions response format:', response.data);
                // Fallback: sử dụng danh sách vùng cố định
                const fallbackRegions: Region[] = [
                    { rid: '#1:1', name: 'Trung du và miền núi phía Bắc' },
                    { rid: '#1:2', name: 'Đồng Bằng Sông Hồng' },
                    { rid: '#1:3', name: 'Bắc Trung Bộ' },
                    { rid: '#1:4', name: 'Duyên Hải Nam Trung Bộ' },
                    { rid: '#1:5', name: 'Tây Nguyên' },
                    { rid: '#1:6', name: 'Đông Nam Bộ' },
                    { rid: '#1:7', name: 'Đồng Bằng Sông Cửu Long' }
                ];
                setRegions(fallbackRegions);
            }
        } catch (err: any) {
            console.error('Failed to fetch regions:', err);
            console.log('Regions API error details:', err.response?.data);
            // Fallback: sử dụng danh sách vùng cố định nếu API fail
            const fallbackRegions: Region[] = [
                { rid: '#1:1', name: 'Trung du và miền núi phía Bắc' },
                { rid: '#1:2', name: 'Đồng Bằng Sông Hồng' },
                { rid: '#1:3', name: 'Bắc Trung Bộ' },
                { rid: '#1:4', name: 'Duyên Hải Nam Trung Bộ' },
                { rid: '#1:5', name: 'Tây Nguyên' },
                { rid: '#1:6', name: 'Đông Nam Bộ' },
                { rid: '#1:7', name: 'Đồng Bằng Sông Cửu Long' }
            ];
            setRegions(fallbackRegions);
        } finally {
            setLoadingRegions(false);
        }
    };

    // Lấy danh sách món ăn theo vùng từ API getRegionByRid
    const fetchFoodsByRegion = async (regionRid: string): Promise<void> => {
        console.log('=== fetchFoodsByRegion CALLED ===');
        console.log('Function triggered with regionRid:', regionRid);

        const apiBase = resolveApiBase();
        if (!apiBase) {
            setError('API base URL not configured');
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log('=== Fetch Foods By Region Debug ===');
            console.log(`Input regionRid: "${regionRid}"`);

            // Bỏ dấu # nếu có trong RID
            const cleanRid = regionRid.replace('#', '');
            console.log(`Clean RID (bỏ dấu #): "${cleanRid}"`);

            const apiUrl = `${apiBase}/foods/regions/rid/${cleanRid}`;
            console.log(`Full API URL: "${apiUrl}"`);

            console.log(`Fetching foods for region RID: ${regionRid}`);
            const response = await axios.get(apiUrl);
            console.log('Region foods response:', response.data);

            if (response.data.success) {
                // API trả về { region: { foods: [...] } }
                const regionFoods = response.data.region?.foods || [];
                setFoods(regionFoods);
                setTotal(regionFoods.length);
                setTotalPages(Math.ceil(regionFoods.length / limit));
                setError('');
                console.log(`Successfully fetched ${regionFoods.length} foods for region`);
            } else {
                setError(response.data.message || 'Failed to fetch region foods');
                setFoods([]);
                setTotal(0);
                setTotalPages(0);
                console.log('API response indicates failure:', response.data.message);
            }
        } catch (err: any) {
            console.error('Failed to fetch region foods:', err);
            console.log('API error details:', err.response?.data);
            setError(err.response?.data?.message || 'Failed to fetch region foods');
            setFoods([]);
            setTotal(0);
            setTotalPages(0);
        } finally {
            setLoading(false);
            console.log('=== End Fetch Foods By Region Debug ===');
        }
    };

    const clearFilters = (): void => {
        console.log('=== Clear Filters Debug ===');
        console.log('Clearing all filters...');

        // Reset tất cả state
        setSearchKeyword('');
        setSelectedType('');
        setMinPrice('');
        setMaxPrice('');
        setSelectedRegion('');
        setSelectedRegionRid('');
        setPage(1);

        console.log('All filters cleared, calling fetchFoods() to refresh data');
        // Refresh data sau khi clear - gọi fetchFoods để lấy tất cả món ăn
        // Sử dụng setTimeout để đảm bảo state đã được update
        setTimeout(() => {
            console.log('Executing fetchFoods() after clear');
            fetchFoods();
        }, 100);

        console.log('=== End Clear Filters Debug ===');
    };

    const handleFoodClick = (foodId: string): void => {
        setSelectedFoodId(foodId);
        setShowFoodDetail(true);
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
            <div className="w-full max-w-3xl mx-auto mb-8">
                <div className="bg-white p-6 rounded-xl shadow-md">
                    <div className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Nhập tên món ăn, loại, mô tả..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            className="flex-1 border border-gray-300 rounded-md px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                            onClick={handleSearch}
                            className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                        >
                            Tìm kiếm
                        </button>
                    </div>
                    {searchKeyword && (
                        <div className="mt-3 flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                                Tìm kiếm: <strong>"{searchKeyword}"</strong>
                            </span>
                            <button
                                onClick={clearSearch}
                                className="text-sm text-blue-600 hover:text-blue-800 transition"
                            >
                                Xóa tìm kiếm
                            </button>
                        </div>
                    )}
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
                                value={selectedRegionRid}
                                onChange={handleRegionChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white"
                                disabled={loadingRegions}
                            >
                                <option value="">
                                    {loadingRegions ? 'Đang tải vùng miền...' : 'Tất cả khu vực'}
                                </option>
                                {Array.isArray(regions) && regions.map((region, index) => {
                                    console.log(`Region ${index}:`, region);
                                    console.log(`Region ${index} rid:`, region.rid);
                                    console.log(`Region ${index} name:`, region.name);
                                    return (
                                        <option key={region.rid} value={region.rid}>
                                            {region.name}
                                        </option>
                                    );
                                })}
                            </select>
                            {loadingRegions && (
                                <div className="mt-1 text-xs text-gray-500">Đang tải danh sách vùng miền...</div>
                            )}
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
                                        Lượt xem: {food.viewCount}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Recommendations Section */}
            {(popularFoods.length > 0 || ageBasedRecs.length > 0) &&
                !searchKeyword &&
                !selectedType &&
                !minPrice &&
                !maxPrice &&
                !selectedRegion && (
                    <div className="w-full max-w-3xl mb-8 mx-auto">
                        <div className="grid grid-cols-1 gap-8">
                            {/* Popular Foods */}
                            {popularFoods.length > 0 && (
                                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="text-2xl">🔥</span>
                                        <h3 className="text-xl font-bold text-gray-800">Món ăn phổ biến</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {popularFoods.map((item) => (
                                            <div
                                                key={item.foodRid}
                                                className="group p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-100 cursor-pointer hover:from-orange-100 hover:to-red-100 hover:border-orange-200 transition-all duration-300 hover:shadow-md"
                                                onClick={() => {
                                                    // Tìm food RID từ danh sách foods
                                                    const foundFood = foods.find(f => f.name === item.foodName);
                                                    const foodId = foundFood?.['@rid'];
                                                    if (foodId) {
                                                        handleFoodClick(foodId);
                                                    } else {
                                                        console.log('No food RID found for popular food:', item.foodName);
                                                        alert(`Không thể mở chi tiết cho món phổ biến: ${item.foodName}`);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-gray-800 text-sm leading-tight mb-1 group-hover:text-orange-700 transition-colors">
                                                            {item.foodName}
                                                        </div>
                                                        <div className="text-xs text-gray-600 leading-relaxed">
                                                            {item.reason}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Age-based Recommendations */}
                            {ageBasedRecs.length > 0 && (
                                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
                                    <div className="flex items-center gap-3 mb-6">
                                        <span className="text-2xl">👥</span>
                                        <h3 className="text-xl font-bold text-gray-800">Gợi ý theo độ tuổi</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {ageBasedRecs.map((item) => (
                                            <div
                                                key={item.foodRid}
                                                className="group p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 cursor-pointer hover:from-blue-100 hover:to-indigo-100 hover:border-blue-200 transition-all duration-300 hover:shadow-md"
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
                                                <div className="flex items-start gap-3">
                                                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-gray-800 text-sm leading-tight mb-1 group-hover:text-blue-700 transition-colors">
                                                            {item.foodName}
                                                        </div>
                                                        <div className="text-xs text-gray-600 leading-relaxed">
                                                            {item.reason}
                                                        </div>
                                                    </div>
                                                </div>
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
                    {searchKeyword || selectedType || minPrice || maxPrice || selectedRegion
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

        </div>
    );
};

export default HomePage;