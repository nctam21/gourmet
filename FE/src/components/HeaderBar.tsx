import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';

const menuItems = [
    'Thức ăn nhanh',
    'Cà phê - trà - nước ép',
    'Cơm - bánh mì - bánh ngọt',
    'Bún - phở',
    'Đồ uống',
    'Hỗ trợ',
    'Cửa hàng',
];

const HeaderBar: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showMenu, setShowMenu] = useState(false);
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
                        {menuItems.map((item) => (
                            <li key={item}>
                                <button
                                    type="button"
                                    className="text-gray-700 text-sm font-medium px-2 py-1 rounded hover:bg-gray-100 transition-colors"
                                >
                                    {item}
                                </button>
                            </li>
                        ))}
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
                                <FaUserCircle size={30} color="#374151" />
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