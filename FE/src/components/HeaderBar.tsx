import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import axios from 'axios';

type PopularFood = {
    foodId: string;
    foodName: string;
    reason: string;
    score: number;
};

type FoodType = {
    type: string;
    count: number;
};

const HeaderBar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
    const [popularFoods, setPopularFoods] = useState<PopularFood[]>([]);
    const [foodTypes, setFoodTypes] = useState<FoodType[]>([]);
    const [loading, setLoading] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Đóng menu khi click ra ngoài
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        }
        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    useEffect(() => {
        const fetchMenuData = async () => {
            try {
                setLoading(true);
                const apiBase = process.env.REACT_APP_API_BASE || 'http://localhost:3000';

                // Fetch popular foods
                const popularRes = await axios.get<PopularFood[]>(`${apiBase}/food-recommendations/most-viewed?limit=5`);
                setPopularFoods(popularRes.data);

                // Fetch food types with count
                const typesRes = await axios.get<FoodType[]>(`${apiBase}/food-analytics/statistics`);
                setFoodTypes(typesRes.data);
            } catch (err) {
                console.warn('Failed to fetch menu data:', err);
                // Fallback to default menu items
                setFoodTypes([
                    { type: 'món chính', count: 0 },
                    { type: 'món phụ', count: 0 },
                    { type: 'tráng miệng', count: 0 },
                    { type: 'đồ uống', count: 0 }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchMenuData();
    }, []);

    return (
        <header className="w-full bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-2">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-gray-900 tracking-tight">🍏</span>
                </div>

                {/* Menu */}
                <nav className="flex-1 flex justify-center">
                    <ul className="flex gap-6">
                        {/* Popular Foods Menu */}
                        {popularFoods.length > 0 && (
                            <li className="relative group">
                                <button className="text-gray-700 text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                                    🔥 Phổ biến nhất
                                </button>
                                {/* Dropdown for popular foods */}
                                <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                    <div className="p-3">
                                        <h4 className="font-semibold text-gray-800 mb-2">Món ăn phổ biến</h4>
                                        <div className="space-y-2">
                                            {popularFoods.map((food) => (
                                                <div key={food.foodId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                                    <div>
                                                        <div className="font-medium text-sm text-gray-800">{food.foodName}</div>
                                                        <div className="text-xs text-gray-600">{food.reason}</div>
                                                    </div>
                                                    <div className="text-xs text-gray-500">Điểm: {food.score}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </li>
                        )}

                        {/* Food Types Menu */}
                        {foodTypes.map((type) => (
                            <li key={type.type} className="relative group">
                                <button className="text-gray-700 text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                                    {type.type}
                                    {type.count > 0 && (
                                        <span className="ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                            {type.count}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}

                        {/* Static Menu Items */}
                        <li>
                            <button className="text-gray-700 text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                                Cửa hàng
                            </button>
                        </li>
                        <li>
                            <button className="text-gray-700 text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                                Hỗ trợ
                            </button>
                        </li>
                    </ul>
                </nav>

                {/* User/Action */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu((v) => !v)}
                                className="focus:outline-none"
                            >
                                <FaUserCircle size={32} color="#374151" />
                            </button>
                            {showMenu && (
                                <ul className="absolute right-0 mt-2 w-90 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                                    <li className="px-4 py-2 text-gray-700 font-semibold border-b">{user.name}</li>
                                    <li className="px-4 py-2 text-gray-500 border-b">{user.email}</li>
                                    <li className="px-4 py-2 text-gray-500 border-b">{user.phone}</li>
                                    <li className="px-4 py-2 text-gray-500 border-b">{user.region}</li>
                                    <li className="px-4 py-2 text-gray-500 border-b"> tuổi: {user.age}</li>
                                    <li className="px-4 py-2 text-gray-500 border-b"> giới tính: {user.gender}</li>
                                    <li>
                                        <button
                                            onClick={() => { logout(); setShowMenu(false); }}
                                            className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                                        >
                                            Đăng xuất
                                        </button>
                                    </li>
                                </ul>
                            )}
                        </div>
                    ) : (
                        <div className="flex space-x-4">
                            <button
                                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 hover:text-white transition"
                                onClick={() => navigate('/auth')}
                            >
                                Đăng nhập
                            </button>
                            <button className="bg-white-500 text-gray-600 px-4 py-2 rounded hover:bg-gray-600 hover:text-white transition" onClick={() => navigate('/auth')}>
                                Đăng ký
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default HeaderBar; 