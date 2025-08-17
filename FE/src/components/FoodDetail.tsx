import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

type FoodDetailData = {
    '@rid'?: string;
    name: string;
    description: string;
    image_url?: string;
    price?: number;
    region?: string;
    type?: string;
    ingredients?: string;
    recipe?: string;
    view_count?: number;
    like_count?: number;
};

interface FoodDetailProps {
    foodRid: string;
    onClose: () => void;
}

const FoodDetail: React.FC<FoodDetailProps> = ({ foodRid, onClose }) => {
    const [food, setFood] = useState<FoodDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const isFetchingRef = useRef(false);

    useEffect(() => {
        const fetchFoodDetail = async () => {
            if (isFetchingRef.current) {
                return;
            }

            try {
                isFetchingRef.current = true;
                setLoading(true);
                const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3000';

                // Fetch food detail
                // Bỏ dấu # từ foodRid trước khi gọi API
                const rid = foodRid.replace('#', '');
                console.log('Fetching food detail for RID:', rid); // Debug log
                const foodRes = await axios.get<any>(`${apiBase}/foods/${rid}`);

                // BE trả về paginated list, lấy item đầu tiên
                let foodData: FoodDetailData;
                if (foodRes.data.items && Array.isArray(foodRes.data.items) && foodRes.data.items.length > 0) {
                    foodData = foodRes.data.items[0];
                } else {
                    // Fallback: nếu không có items, sử dụng data trực tiếp
                    foodData = foodRes.data;
                }

                setFood(foodData);

            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load food details');
            } finally {
                setLoading(false);
                isFetchingRef.current = false;
            }
        };

        if (foodRid) {
            fetchFoodDetail();
        }
    }, [foodRid]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl">
                    <div className="text-gray-600">Đang tải...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white p-8 rounded-xl max-w-md">
                    <div className="text-red-600 mb-4">{error}</div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        );
    }

    if (!food) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">{food.name}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                        ×
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column - Image and Basic Info */}
                        <div>
                            <img
                                src={food.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}
                                alt={food.name}
                                className="w-full h-64 object-cover rounded-lg mb-4"
                            />

                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-600">Loại:</span>
                                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                        {food.type || 'Hấp'}
                                    </span>
                                </div>

                                {food.region && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-600">Khu vực:</span>
                                        <span className="text-gray-800">{food.region}</span>
                                    </div>
                                )}

                                {food.price && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-600">Giá:</span>
                                        <span className="text-xl font-bold text-green-600">
                                            {food.price.toLocaleString('vi-VN')} đ
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                    {food.view_count !== undefined && (
                                        <span>👁️ {food.view_count} lượt xem</span>
                                    )}
                                    {food.like_count !== undefined && (
                                        <span>❤️ {food.like_count} lượt thích</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Description and Details */}
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">Mô tả</h3>
                                <p className="text-gray-600">{food.description}</p>
                            </div>

                            {food.ingredients && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Nguyên liệu</h3>
                                    <p className="text-gray-600">{food.ingredients}</p>
                                </div>
                            )}

                            {food.recipe && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-800 mb-2">Cách làm</h3>
                                    <p className="text-gray-600 whitespace-pre-line">{food.recipe}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FoodDetail;
