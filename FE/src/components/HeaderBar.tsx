import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

type PopularFood = {
    '@rid': string;
    name: string;
    image_url?: string;
    view_count?: number;
    like_count?: number;
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
                const popularRes = await axios.get<any>(`${apiBase}/foods?page=1&limit=5&sortBy=view_count&sortOrder=desc`);
                if (popularRes.data.items) {
                    setPopularFoods(popularRes.data.items);
                }

                // Fetch food types with count
                const typesRes = await axios.get<any>(`${apiBase}/foods?page=1&limit=100`);
                if (typesRes.data.items) {
                    const typeCounts = typesRes.data.items.reduce((acc: any, food: any) => {
                        if (food.type) {
                            acc[food.type] = (acc[food.type] || 0) + 1;
                        }
                        return acc;
                    }, {});

                    const typesArray = Object.entries(typeCounts).map(([type, count]) => ({
                        type,
                        count: count as number
                    }));
                    setFoodTypes(typesArray);
                }
            } catch (err) {
                console.error('Error fetching menu data:', err);
                // Fallback to default menu items
                setFoodTypes([
                    { type: 'Món chính', count: 0 },
                    { type: 'Món phụ', count: 0 },
                    { type: 'Tráng miệng', count: 0 }
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
                    <img src={'/logo.png'} alt="logo" className="w-10 h-10 object-cover" />
                </div>

                {/* Navigation Menu */}
                <nav className="hidden md:flex items-center space-x-8">
                    <Link
                        to="/main"
                        className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        🏠
                        Trang chủ
                    </Link>

                    {/* Chỉ hiển thị nút Quản lý món ăn khi user là admin */}
                    {user && user.name === 'admin' && (
                        <Link
                            to="/admin"
                            className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            🍽️
                            Quản lý món ăn
                        </Link>
                    )}

                    {/* Most Popular Foods */}
                    {popularFoods.length > 0 && (
                        <div className="relative group">
                            <button className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                                🔥
                                Món phổ biến
                            </button>
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="p-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Món ăn phổ biến nhất</h3>
                                    <div className="space-y-2">
                                        {popularFoods.slice(0, 5).map((food, index) => (
                                            <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg">
                                                <img
                                                    src={food.image_url || 'https://via.placeholder.com/32x32?text=No+Image'}
                                                    alt={food.name}
                                                    className="w-8 h-8 rounded-lg object-cover"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{food.name}</p>
                                                    <p className="text-xs text-gray-500">👁️ {food.view_count || 0} ❤️ {food.like_count || 0}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Food Types */}
                    {foodTypes.length > 0 && (
                        <div className="relative group">
                            <button className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
                                📊
                                Loại món ăn
                            </button>
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="p-4">
                                    <h3 className="text-sm font-semibold text-gray-800 mb-3">Các loại món ăn</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {foodTypes.slice(0, 8).map((type, index) => (
                                            <span
                                                key={index}
                                                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium text-center"
                                            >
                                                {type.type} ({type.count})
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </nav>

                {/* User/Action */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu((v) => !v)}
                                className="focus:outline-none"
                            >
                                👤
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
                                onClick={() => navigate('/')}
                            >
                                Đăng nhập
                            </button>
                            <button className="bg-white-500 text-gray-600 px-4 py-2 rounded hover:bg-gray-600 hover:text-white transition" onClick={() => navigate('/')}>
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